from dataclasses import dataclass
import math
import re
import unicodedata

from .errors import ServiceError
from .models import MediaOption
from .security import parse_url


EXTENSIONS = {"mp4", "m4a", "mp3", "webm", "mkv", "ogg", "opus", "wav", "aac", "mov"}
ENCODED_ID = re.compile(r"[a-zA-Z0-9_.-]{1,80}\Z")
WINDOWS_DEVICES = {"CON", "PRN", "AUX", "NUL", *(f"{prefix}{i}" for prefix in ("COM", "LPT") for i in range(1, 10))}


def positive(value):
    return value if type(value) in (int, float) and math.isfinite(value) and value > 0 else None


def integer(value):
    value = positive(value)
    return int(value) if value and value >= 1 else None


def title(value, fallback="Mídia"):
    if not isinstance(value, str):
        return fallback
    clean = "".join(
        char if unicodedata.category(char)[0] != "C" and char not in '<>:"/\\|?*' else "_"
        for char in unicodedata.normalize("NFC", value)[:160]
    ).strip(" ._")
    if clean.partition(".")[0].upper() in WINDOWS_DEVICES:
        return "_" + clean
    return clean or fallback


def clean_codec(value):
    return value.lower() if isinstance(value, str) and re.fullmatch(r"[\w.-]{1,80}", value) else None


@dataclass(frozen=True)
class Stream:
    id: str
    url: str
    protocol: str
    ext: str
    vcodec: str | None
    acodec: str | None
    width: int | None
    height: int | None
    size: int | None
    estimate: int | None
    bitrate: float | None
    audio_channels: int | None = None

    @property
    def video(self):
        return self.vcodec not in (None, "none")

    @property
    def audio(self):
        return self.acodec not in (None, "none")


@dataclass(frozen=True)
class Plan:
    option: MediaOption
    streams: tuple[Stream, ...]
    audio_bitrate: int | None = None


@dataclass(frozen=True)
class Media:
    name: str
    media_id: str | None
    platform: str
    duration: float | None
    plans: tuple[Plan, ...]


def streams_from(data, source, policy, settings):
    formats = data.get("formats")
    if not isinstance(formats, list):
        formats = [data]
    candidates = []
    for raw in formats:
        if not isinstance(raw, dict) or raw.get("has_drm"):
            continue
        url, ext, identifier = raw.get("url"), raw.get("ext"), raw.get("format_id") or "source"
        if not isinstance(url, str) or not isinstance(ext, str) or ext not in EXTENSIONS or not isinstance(identifier, str) or not ENCODED_ID.fullmatch(identifier):
            continue
        try:
            parsed = parse_url(url)
        except ServiceError:
            continue
        if raw.get("protocol", parsed.scheme) != parsed.scheme:
            continue
        if not policy.allows(source, parsed.hostname, 443 if parsed.scheme == "https" else 80):
            continue
        size, estimate = integer(raw.get("filesize")), integer(raw.get("filesize_approx"))
        if (size or estimate or 0) > settings.max_bytes:
            continue
        candidates.append(Stream(
            identifier, url, parsed.scheme, ext, clean_codec(raw.get("vcodec")), clean_codec(raw.get("acodec")),
            integer(raw.get("width")), integer(raw.get("height")), size, estimate,
            positive(raw.get("abr")) or positive(raw.get("tbr")),
            integer(raw.get("audio_channels")),
        ))
    return candidates


def make_plan(fmt, mode, streams, *, video=None, quality=None, bitrate=None, identifier=None):
    first = streams[0]
    exact = first.size if mode == "original" else None
    estimate = first.estimate if mode == "original" else None
    return Plan(MediaOption(
        id=identifier or f"{fmt.lower()}-{quality or 'original'}",
        format=fmt, mime_type="video/mp4" if fmt == "MP4" else "audio/mpeg",
        quality=quality, operation=mode, requires_processing=mode != "original",
        width=video.width if video else None, height=video.height if video else None,
        video_codec="h264" if video else None,
        audio_codec="mp3" if fmt == "MP3" else "aac" if mode != "original" else (
            "aac" if aac(first.acodec) else None
        ),
        bitrate_kbps=bitrate, size_bytes=exact, estimated_size_bytes=estimate,
        source_ext=[stream.ext for stream in streams],
    ), tuple(streams), bitrate if mode == "transcode" and fmt == "MP3" else None)


def h264(codec):
    return bool(codec and codec.startswith(("h264", "avc1")))


def aac(codec):
    return bool(codec and codec.startswith(("aac", "mp4a.40")))


def make_media(data, source, policy, settings, encoders):
    if (not isinstance(data, dict) or data.get("_type") in {"playlist", "multi_video"}
            or data.get("is_live") or data.get("live_status") in {"is_live", "is_upcoming"}
            or data.get("availability") in {"private", "premium_only", "subscriber_only", "needs_auth", "members_only"}):
        raise ServiceError("UNSUPPORTED_MEDIA", "Playlists, transmissões ao vivo e mídia com acesso restrito não são aceitas.")
    if data.get("has_drm") or not isinstance(data.get("id"), str):
        raise ServiceError("UNSUPPORTED_MEDIA", "A origem não confirmou uma mídia disponível e sem proteção.")
    duration = positive(data.get("duration"))
    if duration and duration > settings.max_duration:
        raise ServiceError("DURATION_LIMIT", "A mídia excede a duração permitida.", 413)

    streams = streams_from(data, source, policy, settings)
    plans = []
    audios = [item for item in streams if item.audio]
    audio_only = sorted((item for item in audios if not item.video), key=lambda s: s.bitrate or 0, reverse=True)
    heights = sorted({item.height for item in streams if item.video and item.height and item.height <= settings.max_resolution}, reverse=True)
    for height in heights:
        at_height = [item for item in streams if item.video and item.height == height]
        combinations = []
        for video in at_height:
            if video.audio:
                choices = [(video,)]
            else:
                choices = [(video, audio) for audio in audio_only]
            for group in choices:
                audio = group[-1]
                compatible = h264(video.vcodec) and aac(audio.acodec)
                if (not h264(video.vcodec) and "libx264" not in encoders) or (not aac(audio.acodec) and "aac" not in encoders):
                    continue
                if sum(s.size or s.estimate or 0 for s in group) > settings.max_bytes:
                    continue
                original = compatible and len(group) == 1 and video.ext == "mp4"
                mode = "original" if original else "merge" if len(group) == 2 else "remux" if compatible else "transcode"
                combinations.append(((original, compatible, video.bitrate or 0, audio.bitrate or 0), mode, group))
        if combinations:
            _, mode, group = max(combinations, key=lambda candidate: candidate[0])
            plans.append(make_plan("MP4", mode, group, video=group[0], quality=f"{height}p"))

    originals = [item for item in streams if item.ext == "mp3" and not item.video]
    if originals:
        original = max(originals, key=lambda item: item.bitrate or 0)
        plans.append(make_plan("MP3", "original", (original,), bitrate=integer(original.bitrate)))
    if audios and "libmp3lame" in encoders:
        inputs = audio_only or audios
        if source.kind == "youtube":
            # MP3 can carry at most two channels. Prefer a source that does not need a downmix.
            inputs = [item for item in inputs if item.audio_channels in (1, 2)] or inputs
        audio = max(inputs, key=lambda item: item.bitrate or 0)
        for bitrate in (128, 192, 320):
            if originals and integer(original.bitrate) == bitrate:
                continue
            plans.append(make_plan("MP3", "transcode", (audio,), quality=f"{bitrate} kbps",
                                   bitrate=bitrate, identifier=f"mp3-{bitrate}"))

    if source.kind == "direct" and not any(plan.option.format == "MP4" for plan in plans):
        direct_mp4 = next((item for item in streams if item.ext == "mp4" and item.vcodec is None and item.acodec is None), None)
        if direct_mp4:
            plans.append(make_plan("MP4", "original", (direct_mp4,)))
    if not plans:
        raise ServiceError("NO_SUPPORTED_FORMAT", "A origem não forneceu streams compatíveis com as saídas habilitadas.")
    return Media(title(data.get("title")), title(data["id"], "") or None,
                 "YouTube" if source.kind == "youtube" else source.host, duration, tuple(plans))
