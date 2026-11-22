import asyncio
import hashlib
import json
import logging
import os
from pathlib import Path
from time import monotonic

from .errors import Cancelled, ServiceError
from .models import DownloadProgress, FileInfo
from .plans import Plan, title


DEMUXERS = "mov,mp3,matroska,webm,ogg,wav,aac"
INPUT_GUARD = ["-protocol_whitelist", "file,pipe", "-format_whitelist", DEMUXERS]
LOG = logging.getLogger("edudownloader")


def numeric(value):
    try:
        value = float(value)
    except (ValueError, TypeError):
        return None
    return value if 0 < value < float("inf") else None


def invalid():
    return ServiceError("UNVERIFIED_FILE", "A saída não corresponde a um arquivo de mídia completo e verificável.", 502)


class MediaProcessor:
    def __init__(self, engine):
        self.engine = engine

    async def inspect(self, path, cwd, *, stop, guard):
        if not path.is_file() or path.is_symlink() or path.stat().st_size <= 0:
            raise invalid()
        result = await self.engine.runner.run([
            self.engine.paths["ffprobe"], "-v", "error", "-max_alloc", "134217728", *INPUT_GUARD,
            "-show_entries",
            "format=format_name,duration,bit_rate:stream=index,codec_type,codec_name,width,height,bit_rate,duration:stream_disposition=attached_pic",
            "-of", "json", "-i", path,
        ], cwd, stop=stop, guard=guard, timeout=20, capture=128 * 1024)
        if result.status or result.stderr_tail:
            raise invalid()
        try:
            payload = json.loads(result.stdout)
            general = payload["format"]
            tracks = payload["streams"]
            video = next((stream for stream in tracks if stream["codec_type"] == "video"
                          and not stream.get("disposition", {}).get("attached_pic")), None)
            audio = next((stream for stream in tracks if stream["codec_type"] == "audio"), None)
            return general, video, audio
        except (ValueError, KeyError, TypeError, AttributeError):
            raise invalid() from None

    async def process(self, inputs, plan: Plan, cwd, *, job_id, duration, stop, guard, publish):
        if plan.option.operation == "original":
            return inputs[0]
        inspected = [await self.inspect(path, cwd, stop=stop, guard=guard) for path in inputs]
        _, video, first_audio = inspected[0]
        audio = inspected[-1][2] if len(inputs) == 2 else first_audio
        if audio is None or (plan.option.format == "MP4" and video is None):
            raise invalid()
        options = [
            self.engine.paths["ffmpeg"], "-hide_banner", "-v", "error", "-xerror", "-nostdin",
            "-max_alloc", "134217728", "-filter_threads", "2", "-nostats", "-stats_period", "0.25",
            "-progress", "pipe:1",
        ]
        for path in inputs:
            options.extend([*INPUT_GUARD, "-threads", "2", "-i", path])
        options.extend(["-map_metadata", "-1", "-map_chapters", "-1", "-sn", "-dn"])
        if plan.option.format == "MP3":
            options.extend(["-map", f"0:{audio['index']}", "-vn", "-c:a", "libmp3lame", "-b:a", f"{plan.audio_bitrate}k"])
        else:
            video_codec = "copy" if video["codec_name"] == "h264" else "libx264"
            audio_codec = "copy" if audio["codec_name"] == "aac" else "aac"
            options.extend([
                "-map", f"0:{video['index']}", "-map", f"{len(inputs) - 1}:{audio['index']}",
                "-c:v", video_codec, "-c:a", audio_codec, "-movflags", "+faststart",
            ])
            if video_codec == "libx264":
                options.extend(["-preset", "fast", "-pix_fmt", "yuv420p"])
        candidate = cwd / f"processed.{plan.option.format.lower()}"
        options.extend(["-threads", "2", "-fs", str(self.engine.settings.max_bytes + 1), "-n", candidate])

        def update(line):
            key, _, value = line.partition(b"=")
            if key != b"out_time_us":
                return
            elapsed = numeric(value)
            if elapsed is not None:
                seconds = elapsed / 1_000_000
                publish(DownloadProgress(
                    processed_seconds=seconds, duration_seconds=duration,
                    percent=min(99, seconds * 100 / duration) if duration else None,
                ))

        started = monotonic()
        try:
            result = await self.engine.runner.run(
                options, cwd, stop=stop, guard=guard, on_line=update, timeout=self.engine.settings.job_seconds,
            )
        finally:
            LOG.info("ffmpeg_conversion job=%s format=%s bitrate_kbps=%s seconds=%.2f",
                     job_id, plan.option.format, plan.audio_bitrate, monotonic() - started)
        if result.status != 0 or result.stderr_tail:
            raise ServiceError("PROCESSING_FAILED", "O FFmpeg não conseguiu produzir a saída solicitada.", 502)
        return candidate

    async def verify(self, candidate: Path, plan: Plan, media, cwd, job_id, *, stop, guard):
        general, video, audio = await self.inspect(candidate, cwd, stop=stop, guard=guard)
        formats = general.get("format_name", "").split(",")
        seconds = numeric(general.get("duration"))
        size = candidate.stat().st_size
        option = plan.option
        if (seconds is None or seconds > self.engine.settings.max_duration + 0.1
                or size > self.engine.settings.max_bytes or (option.size_bytes is not None and size != option.size_bytes)
                or media.duration and abs(seconds - media.duration) > max(0.75, media.duration * 0.03)):
            raise invalid()
        if option.format == "MP4":
            with candidate.open("rb") as handle:
                header = handle.read(12)
            if (candidate.suffix.lower() != ".mp4" or "mp4" not in formats
                    or header[4:8] != b"ftyp" or header[8:12] == b"qt  " or video is None
                    or audio is None and (option.audio_codec is not None or option.requires_processing)
                    or not video.get("height") or video["height"] > self.engine.settings.max_resolution
                    or option.height and video["height"] != option.height
                    or option.width and video["width"] != option.width
                    or option.video_codec and video["codec_name"] != option.video_codec
                    or option.audio_codec and audio["codec_name"] != option.audio_codec):
                raise invalid()
        elif "mp3" not in formats or audio is None or audio["codec_name"] != "mp3" or video is not None:
            raise invalid()
        bits = numeric(audio.get("bit_rate") or general.get("bit_rate")) if audio else None
        if plan.audio_bitrate and (bits is None or abs(bits / 1000 - plan.audio_bitrate) > 8):
            raise invalid()

        # Sample the start and a point near the end before publishing any file.
        mappings = [arg for stream in (video, audio) if stream for arg in ("-map", f"0:{stream['index']}")]
        offsets = (0, max(0, seconds - 0.5)) if seconds > 1 else (0,)
        for offset in offsets:
            decoded = await self.engine.runner.run([
                self.engine.paths["ffmpeg"], "-v", "error", "-xerror", "-nostdin", "-max_alloc", "134217728",
                *INPUT_GUARD, "-threads", "2", "-ss", f"{offset:.3f}", "-i", candidate,
                *mappings, "-t", "0.45", "-f", "null", "-",
            ], cwd, stop=stop, guard=guard, timeout=20)
            if decoded.status or decoded.stderr_tail:
                raise invalid()
        digest = hashlib.sha256()
        with candidate.open("rb") as handle:
            while chunk := handle.read(1024 * 1024):
                if stop.is_set():
                    raise Cancelled
                digest.update(chunk)
                await asyncio.sleep(0)
        output = cwd / f"result.{option.format.lower()}"
        os.replace(candidate, output)
        return output, FileInfo(
            name=f"{title(Path(media.name).stem if media.name.lower().endswith(('.mp3', '.mp4')) else media.name)}.{option.format.lower()}",
            mime_type=option.mime_type, format=option.format, size_bytes=size, duration_seconds=seconds,
            width=video.get("width") if video else None, height=video.get("height") if video else None,
            video_codec=video.get("codec_name") if video else None, audio_codec=audio.get("codec_name") if audio else None,
            bitrate_kbps=bits / 1000 if bits else None, sha256=digest.hexdigest(),
            download_path=f"/api/v1/jobs/{job_id}/file",
        )
