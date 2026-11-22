import asyncio
from collections import deque
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
import errno
import logging
from pathlib import Path
from time import monotonic
from uuid import UUID, uuid4

from .errors import Cancelled, ServiceError
from .models import AnalysisResponse, DownloadProgress, ErrorDetail, FileInfo, JobResponse
from .plans import Media, Plan
from .security import Source
from .storage import no_space


LOG = logging.getLogger("edudownloader")
TERMINAL = frozenset({"completed", "failed", "cancelled"})
TRANSITIONS = {
    "queued": {"analyzing", "failed", "cancelled"},
    "analyzing": {"downloading", "failed", "cancelled"},
    "downloading": {"processing", "verifying", "failed", "cancelled"},
    "processing": {"verifying", "failed", "cancelled"},
    "verifying": {"completed", "failed", "cancelled"},
}


def utcnow():
    return datetime.now(UTC)


def missing():
    return ServiceError("NOT_FOUND", "A tarefa ou análise não está disponível.", 404)


@dataclass
class Analysis:
    owner: str
    source: Source
    media: Media
    expires: datetime


@dataclass
class Job:
    id: UUID
    owner: str
    source: Source
    media: Media
    plan: Plan
    directory: Path
    deadline: float
    created: datetime = field(default_factory=utcnow)
    updated: datetime = field(default_factory=utcnow)
    status: str = "queued"
    stop: asyncio.Event = field(default_factory=asyncio.Event)
    progress: DownloadProgress = field(default_factory=DownloadProgress)
    error: ErrorDetail | None = None
    file: FileInfo | None = None
    path: Path | None = None
    expires: datetime | None = None
    readers: int = 0
    cleanup_pending: bool = False

    def stage(self, status):
        if status not in TRANSITIONS.get(self.status, ()):
            raise RuntimeError("Transição de tarefa inválida")
        self.status, self.updated = status, utcnow()
        self.progress = DownloadProgress()

    def set_progress(self, progress):
        self.progress, self.updated = progress, utcnow()

    def response(self):
        return JobResponse(
            id=self.id, status=self.status, created_at=self.created, updated_at=self.updated,
            expires_at=self.expires, can_cancel=self.status not in TERMINAL and not self.stop.is_set(),
            cancel_requested=self.stop.is_set(), progress=self.progress, option=self.plan.option,
            file=self.file, error=self.error,
        )


class JobManager:
    def __init__(self, settings, engine, storage):
        self.settings, self.engine, self.storage = settings, engine, storage
        self.analyses = {}
        self.jobs = {}
        self.keys = {}
        self.queue = deque()
        self.wake = asyncio.Event()
        self.closed = False
        self.analyzing = asyncio.Semaphore(settings.workers)
        self.analysis_tasks = set()

    def start(self):
        self.workers = [asyncio.create_task(self.worker()) for _ in range(self.settings.workers)]
        self.janitor = asyncio.create_task(self.reap())

    async def shutdown(self):
        self.closed = True
        for job in self.jobs.values():
            if job.status not in TERMINAL:
                job.stop.set()
        self.wake.set()
        active = list(self.analysis_tasks)
        for task in active:
            task.cancel()
        self.janitor.cancel()
        await asyncio.gather(*active, *self.workers, self.janitor, return_exceptions=True)

    def sweep(self, *, retry_cleanup=False):
        now = utcnow()
        for identifier, analysis in list(self.analyses.items()):
            if analysis.expires <= now:
                del self.analyses[identifier]
        for identifier, job in list(self.jobs.items()):
            expired = job.expires is not None and job.expires <= now
            if not job.readers and (expired or (retry_cleanup and job.cleanup_pending)):
                try:
                    self.storage.remove(job.directory)
                except (OSError, RuntimeError):
                    LOG.warning("retention_cleanup_pending job=%s", job.id)
                    continue
                job.cleanup_pending = False
                if expired:
                    del self.jobs[identifier]
        for key, (identifier, _) in list(self.keys.items()):
            if identifier not in self.jobs:
                del self.keys[key]
        for job in list(self.queue):
            if monotonic() >= job.deadline:
                self.queue.remove(job)
                self.finish(job, "failed", ServiceError("TASK_TIMEOUT", "A tarefa excedeu o tempo permitido na fila.", 504))

    async def reap(self):
        while True:
            await asyncio.sleep(min(15, self.settings.retain_seconds / 2))
            self.sweep(retry_cleanup=True)

    async def analyze(self, owner, url):
        self.sweep()
        if self.closed or self.analyzing.locked() or len(self.analyses) + len(self.analysis_tasks) >= self.settings.max_analyses:
            raise ServiceError("ANALYSIS_BUSY", "O serviço atingiu o limite de análises. Tente novamente mais tarde.", 429)
        request = asyncio.current_task()
        self.analysis_tasks.add(request)
        try:
            async with self.analyzing:
                source, media = await self.engine.analyze(url, self.storage.root)
            identifier, expires = uuid4(), utcnow() + timedelta(seconds=self.settings.analysis_ttl)
            self.analyses[identifier] = Analysis(owner, source, media, expires)
            return AnalysisResponse(
                analysis_id=identifier, name=media.name, media_id=media.media_id, platform=media.platform,
                duration_seconds=media.duration, expires_at=expires,
                options=[plan.option for plan in media.plans],
            )
        finally:
            self.analysis_tasks.discard(request)

    def create(self, owner, payload, idempotency):
        self.sweep()
        signature = (payload.analysis_id, payload.option_id)
        key = (owner, idempotency) if idempotency else None
        if key and key in self.keys:
            identifier, original = self.keys[key]
            if signature != original:
                raise ServiceError("IDEMPOTENCY_CONFLICT", "A chave já está associada a outra solicitação.", 409)
            return self.jobs[identifier]
        analysis = self.analyses.get(payload.analysis_id)
        if analysis is None or analysis.owner != owner:
            raise missing()
        plan = next((choice for choice in analysis.media.plans if choice.option.id == payload.option_id), None)
        if plan is None:
            raise ServiceError("UNKNOWN_OPTION", "Escolha uma opção da análise atual.")
        if self.closed or len(self.queue) >= self.settings.max_queue or len(self.jobs) >= self.settings.max_history:
            raise ServiceError("QUEUE_FULL", "A fila está cheia. Tente novamente mais tarde.", 429)
        self.engine.require_ready()
        identifier = uuid4()
        job = Job(identifier, owner, analysis.source, analysis.media, plan,
                  self.storage.root / f"job-{identifier}", monotonic() + self.settings.job_seconds)
        self.jobs[identifier] = job
        if key:
            self.keys[key] = (identifier, signature)
        self.queue.append(job)
        self.wake.set()
        return job

    def get(self, owner, identifier):
        self.sweep()
        job = self.jobs.get(identifier)
        if job is None or job.owner != owner or job.expires and job.expires <= utcnow():
            raise missing()
        return job

    def cancel(self, job):
        if job.status in TERMINAL:
            return job
        job.stop.set()
        if job.status == "queued":
            self.queue.remove(job)
            self.finish(job, "cancelled")
        return job

    def finish(self, job, status, error=None):
        phase = job.status
        job.stage(status)
        job.expires = utcnow() + timedelta(seconds=self.settings.retain_seconds)
        if error:
            job.error = ErrorDetail(code=error.code, message=error.message)
            elapsed = self.settings.job_seconds + monotonic() - job.deadline
            LOG.warning("job_failed code=%s job=%s phase=%s elapsed_seconds=%.2f budget_seconds=%s",
                        error.code, job.id, phase, elapsed, self.settings.job_seconds)

    async def worker(self):
        while not self.closed:
            if not self.queue:
                self.wake.clear()
                await self.wake.wait()
                continue
            job = self.queue.popleft()
            await self.run(job)
        for job in list(self.queue):
            self.cancel(job)

    async def run(self, job):
        result = None
        failure = None
        status = "failed"
        try:
            job.stage("analyzing")
            self.storage.reserve(job)
            async with asyncio.timeout(max(0, job.deadline - monotonic())):
                result = await self.engine.execute(job, lambda: self.storage.guard(job.directory))
            if job.stop.is_set():
                raise Cancelled
            self.storage.finish(job.directory, result[0])
            job.path, job.file = result
            status = "completed"
        except Cancelled:
            status = "cancelled"
        except TimeoutError:
            failure = ServiceError("TASK_TIMEOUT", "A tarefa excedeu o tempo permitido.", 504)
        except ServiceError as error:
            failure = error
        except OSError as error:
            failure = no_space() if error.errno == errno.ENOSPC else ServiceError(
                "FILE_OPERATION_FAILED", "Não foi possível preparar ou gravar o arquivo temporário.", 500,
            )
        except Exception:
            failure = ServiceError("INTERNAL_ERROR", "Não foi possível concluir a tarefa.", 500)
        if status != "completed":
            try:
                self.storage.finish(job.directory)
            except (OSError, RuntimeError) as error:
                job.cleanup_pending = True
                LOG.error("job_cleanup_deferred job=%s phase=%s original_code=%s error_type=%s",
                          job.id, job.status, failure.code if failure else status, type(error).__name__)
                status = "failed"
                failure = ServiceError("CLEANUP_FAILED", "A limpeza do espaço de trabalho será repetida pelo serviço.", 500)
        self.finish(job, status, failure)

    def acquire_file(self, job):
        if job.status != "completed" or job.path is None or job.file is None:
            raise ServiceError("FILE_NOT_READY", "O arquivo ainda não está disponível.", 409)
        if not job.path.is_file() or job.path.is_symlink() or job.path.stat().st_size != job.file.size_bytes:
            raise ServiceError("FILE_UNAVAILABLE", "O arquivo concluído não está disponível.", 410)
        job.readers += 1
        return job.path

    async def release_file(self, job):
        job.readers = max(0, job.readers - 1)
