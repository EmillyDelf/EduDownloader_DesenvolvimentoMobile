import asyncio
from contextlib import suppress
import json
import logging
from pathlib import Path
import re
import shutil
import sys
from tempfile import TemporaryDirectory
from time import monotonic
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree

import httpx

from .egress import Egress
from .errors import Cancelled, ServiceError
from .models import DownloadProgress, EngineHealth
from .plans import make_media, positive, integer
from .processes import ProcessRunner
from .processor import MediaProcessor


PROGRESS = b"EDU_PROGRESS "
LOG = logging.getLogger("edudownloader")
PROGRESS_TEMPLATE = "download:EDU_PROGRESS %(progress)j"
DIRECT_MIME = {"video/mp4": "mp4", "audio/mpeg": "mp3"}
DASH_DURATION = re.compile(r"PT(?:(\d{1,6})H)?(?:(\d{1,6})M)?(?:(\d{1,6}(?:\.\d{1,6})?)S)?\Z")


class Engine:
    def __init__(self, settings, policy):
        self.settings, self.policy = settings, policy
        self.runner = ProcessRunner(settings)
        self.processor = MediaProcessor(self)
        self.paths = {}
        self.versions = dict.fromkeys(("yt-dlp", "Deno", "ffmpeg", "ffprobe"))
        self.encoders = frozenset()

    async def detect(self, directory):
        self.paths.update({name: shutil.which(getattr(self.settings, name)) for name in ("deno", "ffmpeg", "ffprobe")})
        commands = {
            "yt-dlp": [sys.executable, "-I", "-m", "yt_dlp", "--ignore-config", "--no-plugin-dirs", "--version"],
            "Deno": [self.paths["deno"], "--version"],
            "ffmpeg": [self.paths["ffmpeg"], "-version"],
            "ffprobe": [self.paths["ffprobe"], "-version"],
        }

        async def identify(name, command):
            if command[0] is None:
                return
            try:
                result = await self.runner.run(command, directory, timeout=12, capture=16384)
                if result.status == 0 and result.stdout:
                    self.versions[name] = result.stdout.decode("utf-8", "replace").splitlines()[0][:200]
            except ServiceError:
                pass

        await asyncio.gather(*(identify(name, command) for name, command in commands.items()))
        if self.versions["ffmpeg"]:
            result = await self.runner.run([self.paths["ffmpeg"], "-hide_banner", "-encoders"], directory,
                                           timeout=10, capture=131072)
            if not result.status:
                names = re.findall(rb"(?m)^\s+[VAS][.A-Z]{5}\s+(\w+)\s", result.stdout)
                self.encoders = frozenset(name.decode("ascii") for name in names)
        # yt-dlp embeds its resolver in a locally installed package. Deno 2.3+ is required.
        if self.versions["Deno"]:
            match = re.match(r"deno (\d+)\.(\d+)", self.versions["Deno"])
            if not match or tuple(map(int, match.groups())) < (2, 3):
                self.versions["Deno"] = None

    def health(self):
        missing = [engine for engine, version in self.versions.items() if version is None]
        return EngineHealth(ready=not missing, engines=self.versions, missing=missing)

    def require_ready(self):
        if not self.health().ready:
            raise ServiceError("ENGINE_UNAVAILABLE", "Um ou mais motores estão indisponíveis. Consulte a saúde do serviço.", 503)

    def ytdlp(self, source, proxy):
        extractor = "youtube" if source.kind == "youtube" else "generic"
        return [
            sys.executable, "-I", "-m", "yt_dlp", "--ignore-config", "--no-plugin-dirs", "--no-remote-components",
            "--no-cache-dir", "--no-playlist", "--no-cookies", "--no-cookies-from-browser",
            "--no-js-runtimes", "--js-runtimes", f"deno:{self.paths['deno']}", "--use-extractors", extractor,
            "--proxy", proxy, "--downloader", "native", "--socket-timeout", "8", "--retries", "1",
            "--extractor-retries", "0", "--no-check-formats", "--fixup", "never", "--no-colors",
            "--encoding", "utf-8", "--max-filesize", str(self.settings.max_bytes),
        ]

    def origin_error(self, result, proxy):
        if proxy.failure:
            return proxy.failure
        info = result.stderr_tail.lower()
        if b"does not pass filter" in info or b"maximum filesize" in info or b"larger than max-filesize" in info:
            return ServiceError("SIZE_LIMIT", "O arquivo excede o tamanho máximo configurado.", 413)
        if b"unsupported url" in info or b"no suitable extractor" in info:
            return ServiceError("UNSUPPORTED_ORIGIN", "A origem não oferece mídia compatível.")
        if b"http error 404" in info or b"http error 410" in info:
            return ServiceError("ORIGIN_UNAVAILABLE", "A mídia não está mais disponível na origem.", 404)
        if any(term in info for term in (b"sign in", b"http error 403", b"http error 401", b"permission denied",
                                         b"private video", b"not available")):
            return ServiceError("ORIGIN_DENIED", "A origem recusou o acesso à mídia.", 403)
        return ServiceError("ORIGIN_FAILED", "Não foi possível obter a mídia da origem.", 502)

    async def direct_metadata(self, source, proxy):
        try:
            async with httpx.AsyncClient(
                proxy=proxy.url, trust_env=False, follow_redirects=True, max_redirects=5, timeout=8,
            ) as client:
                response = await client.head(source.url, headers={"Accept-Encoding": "identity"})
        except httpx.HTTPError:
            raise proxy.failure or ServiceError("ORIGIN_UNREACHABLE", "Não foi possível conectar à origem.", 502) from None
        if proxy.failure:
            raise proxy.failure
        if response.status_code in {401, 403}:
            raise ServiceError("ORIGIN_DENIED", "A origem recusou o acesso à mídia.", 403)
        if response.status_code in {404, 410}:
            raise ServiceError("ORIGIN_UNAVAILABLE", "A mídia não está mais disponível na origem.", 404)
        if not response.is_success:
            raise ServiceError("ORIGIN_FAILED", "A origem não confirmou os dados da mídia.", 502)
        if response.headers.get("content-encoding", "identity").lower() != "identity":
            raise ServiceError("UNSUPPORTED_ENCODING", "A origem não forneceu os dados de mídia sem compressão HTTP.")
        mime = response.headers.get("content-type", "").split(";")[0].strip().lower()
        if mime == "application/dash+xml":
            return None, await self.manifest_duration(str(response.url), proxy)
        extension = DIRECT_MIME.get(mime)
        if not extension:
            raise ServiceError("NO_SUPPORTED_FORMAT", "A origem autorizada deve fornecer MP4, MP3 ou um manifesto DASH compatível.")
        raw_size = response.headers.get("content-length", "")
        size = int(raw_size) if re.fullmatch(r"[0-9]{1,18}", raw_size) else None
        if size == 0:
            raise ServiceError("EMPTY_SOURCE", "A origem informou um arquivo vazio.")
        if size is not None and size > self.settings.max_bytes:
            raise ServiceError("SIZE_LIMIT", "O arquivo excede o tamanho máximo configurado.", 413)
        final = str(response.url)
        basename = unquote(urlsplit(final).path.rsplit("/", 1)[-1]) or "Mídia"
        return {"id": basename, "title": basename, "url": final, "ext": extension, "filesize": size}, None

    async def manifest_duration(self, url, proxy):
        limit = 1024 * 1024
        content = bytearray()
        try:
            async with httpx.AsyncClient(proxy=proxy.url, trust_env=False, timeout=8) as client:
                async with client.stream("GET", url, headers={"Accept-Encoding": "identity"}) as response:
                    response.raise_for_status()
                    if response.headers.get("content-encoding", "identity").lower() != "identity":
                        raise ValueError
                    async for chunk in response.aiter_raw(16384):
                        if len(content) + len(chunk) > limit:
                            raise ServiceError("MANIFEST_LIMIT", "O manifesto ultrapassou o tamanho permitido.", 413)
                        content.extend(chunk)
            xml = content.decode("utf-8-sig")
            if re.search(r"<!\s*(?:DOCTYPE|ENTITY)", xml, re.IGNORECASE):
                raise ValueError
            root = ElementTree.fromstring(xml)
        except httpx.HTTPError:
            raise proxy.failure or ServiceError("ORIGIN_FAILED", "Não foi possível ler o manifesto.", 502) from None
        except (ValueError, ElementTree.ParseError):
            raise ServiceError("INVALID_MANIFEST", "O manifesto de mídia não é válido.") from None
        if root.tag.rsplit("}", 1)[-1] != "MPD" or root.get("type") == "dynamic":
            raise ServiceError("UNSUPPORTED_MEDIA", "Somente manifestos de mídia gravada são aceitos.")
        match = DASH_DURATION.fullmatch(root.get("mediaPresentationDuration", ""))
        if not match:
            return None
        hours, minutes, seconds = (float(value or 0) for value in match.groups())
        return positive(hours * 3600 + minutes * 60 + seconds)

    async def analyze(self, value, root):
        source = self.policy.admit(value)
        self.require_ready()
        try:
            async with asyncio.timeout(self.settings.analysis_seconds):
                return await self._analyze(source, root)
        except TimeoutError:
            raise ServiceError("TASK_TIMEOUT", "A análise excedeu o tempo permitido.", 504) from None

    async def _analyze(self, source, root):
        duration = None
        async with Egress(self.policy, source, 8 * 1024 ** 2) as proxy:
            if source.kind == "direct":
                raw, duration = await self.direct_metadata(source, proxy)
                if raw is not None:
                    return source, make_media(raw, source, self.policy, self.settings, self.encoders)
            with TemporaryDirectory(prefix="analyze-", dir=root) as temp:
                directory = Path(temp)
                batch = directory / "source.txt"
                batch.write_text(source.url + "\n", encoding="utf-8")
                result = await self.runner.run([
                    *self.ytdlp(source, proxy.url), "--no-simulate", "--skip-download", "--dump-single-json",
                    "--batch-file", batch,
                ], directory, timeout=self.settings.analysis_seconds, capture=4 * 1024 ** 2, proxy=proxy.url)
                if result.status or not result.stdout:
                    raise self.origin_error(result, proxy)
        try:
            raw = json.loads(result.stdout)
        except ValueError:
            raise ServiceError("INVALID_ORIGIN_RESPONSE", "A origem retornou metadados inválidos.", 502) from None
        if isinstance(raw, dict) and duration and not positive(raw.get("duration")):
            raw["duration"] = duration
        return source, make_media(raw, source, self.policy, self.settings, self.encoders)

    async def stream(self, source, stream, cwd, index, count, stop, guard, publish):
        info = cwd / f"track-{index}.json"
        target = cwd / f"track-{index}.{stream.ext}"
        info.write_text(json.dumps({
            "id": "stream", "title": "stream", "url": stream.url, "ext": stream.ext, "protocol": stream.protocol,
        }), encoding="utf-8")
        latest_bytes = -1

        def update(line):
            nonlocal latest_bytes
            if not line.startswith(PROGRESS):
                return
            try:
                data = json.loads(line[len(PROGRESS):])
            except ValueError:
                return
            if not isinstance(data, dict):
                return
            written = integer(data.get("downloaded_bytes"))
            if written is None or written < latest_bytes:
                return
            latest_bytes = written
            total = integer(data.get("total_bytes")) or stream.size
            publish(DownloadProgress(
                downloaded_bytes=written, total_bytes=total, track=index, track_count=count,
                estimated_total_bytes=integer(data.get("total_bytes_estimate")) or stream.estimate,
                bytes_per_second=positive(data.get("speed")),
                eta_seconds=positive(data.get("eta")), percent=min(99, written * 100 / total) if total else None,
            ))

        try:
            async with Egress(self.policy, source, self.settings.max_bytes + 2 * 1024 ** 2) as proxy:
                result = await self.runner.run([
                    *self.ytdlp(source, proxy.url), "--no-mtime", "--quiet", "--progress", "--newline",
                    "--progress-delta", "0.2", "--progress-template", PROGRESS_TEMPLATE,
                    "--load-info-json", info, "--output", target,
                ], cwd, timeout=self.settings.job_seconds, stop=stop, on_line=update, guard=guard, proxy=proxy.url)
                if result.status or not target.is_file() or target.is_symlink() or target.stat().st_size <= 0:
                    raise self.origin_error(result, proxy)
            if stream.size is not None and target.stat().st_size != stream.size:
                raise ServiceError("INCOMPLETE_DOWNLOAD", "O tamanho recebido não corresponde ao arquivo da origem.", 502)
            return target
        finally:
            with suppress(FileNotFoundError):
                info.unlink()

    async def execute(self, job, guard):
        self.require_ready()
        job.stage("downloading")
        inputs = []
        count = len(job.plan.streams)
        for index, stream in enumerate(job.plan.streams, 1):
            job.set_progress(DownloadProgress(track=index, track_count=count, total_bytes=stream.size))
            started = monotonic()
            received = None
            try:
                path = await self.stream(job.source, stream, job.directory, index, count,
                                         job.stop, guard, job.set_progress)
                inputs.append(path)
                received = path.stat().st_size
            finally:
                elapsed = max(0.001, monotonic() - started)
                written = received if received is not None else (job.progress.downloaded_bytes or 0)
                LOG.info(
                    "stream_transfer job=%s origin=%s track=%s/%s format=%s ext=%s audio_codec=%s "
                    "audio_channels=%s bytes=%s expected=%s seconds=%.2f average_bytes_per_second=%.0f",
                    job.id, job.source.kind, index, count, stream.id, stream.ext, stream.acodec,
                    stream.audio_channels, written, stream.size,
                    elapsed, written / elapsed,
                )
        if job.stop.is_set():
            raise Cancelled
        if job.plan.option.requires_processing:
            job.stage("processing")
        output = await self.processor.process(
            inputs, job.plan, job.directory, job_id=job.id, duration=job.media.duration, stop=job.stop,
            guard=guard, publish=job.set_progress,
        )
        job.stage("verifying")
        started = monotonic()
        try:
            return await self.processor.verify(
                output, job.plan, job.media, job.directory, job.id, stop=job.stop, guard=guard,
            )
        finally:
            LOG.info("job_verification job=%s seconds=%.2f", job.id, monotonic() - started)
