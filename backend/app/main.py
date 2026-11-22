from collections import defaultdict, deque
from contextlib import asynccontextmanager
import hmac
import logging
import re
from tempfile import TemporaryDirectory
from pathlib import Path
from time import monotonic
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, FastAPI, Header, Request, Security
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette.exceptions import HTTPException

from .config import TOKEN, Settings, number
from .engine import Engine
from .errors import ServiceError
from .jobs import JobManager
from .models import AnalysisResponse, AnalyzeRequest, CreateJob, EngineHealth, ErrorResponse, JobResponse
from .security import OriginPolicy
from .storage import Storage


MAX_BODY = 12 * 1024
IDENTITY_KEY = re.compile(r"[A-Za-z0-9_.-]{1,128}\Z")
BEARER = HTTPBearer(auto_error=False, description="Credencial temporária ou chave de desenvolvimento individual.")
AUTHENTICATION = Annotated[HTTPAuthorizationCredentials | None, Security(BEARER)]


def json_error(code, message, status, headers=None):
    return JSONResponse({"error": {"code": code, "message": message}}, status_code=status,
                        headers={"Cache-Control": "no-store", **(headers or {})})


class BodyLimit:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] != "POST":
            await self.app(scope, receive, send)
            return
        content = bytearray()
        while True:
            event = await receive()
            if event["type"] == "http.disconnect":
                return
            chunk = event.get("body", b"")
            if len(content) + len(chunk) > MAX_BODY:
                await json_error("BODY_LIMIT", "A solicitação ultrapassou o tamanho permitido.", 413)(scope, receive, send)
                return
            content.extend(chunk)
            if not event.get("more_body"):
                break
        delivered = False

        async def body():
            nonlocal delivered
            if delivered:
                return await receive()
            delivered = True
            return {"type": "http.request", "body": bytes(content), "more_body": False}

        await self.app(scope, body, send)


class ManagedFileResponse(FileResponse):
    def __init__(self, path, *, release, **kwargs):
        super().__init__(path, **kwargs)
        self.release = release

    async def __call__(self, scope, receive, send):
        try:
            await super().__call__(scope, receive, send)
        finally:
            await self.release()


class RateLimit:
    def __init__(self):
        self.requests = defaultdict(deque)

    def allow(self, key, limit):
        entries = self.requests[key]
        now = monotonic()
        while entries and now - entries[0] >= 60:
            entries.popleft()
        if len(entries) >= limit:
            return False
        entries.append(now)
        return True


def owner(request: Request, auth: AUTHENTICATION):
    settings = request.app.state.settings
    identity = None
    if auth and TOKEN.fullmatch(auth.credentials):
        for identifier, token in settings.client_tokens.items():
            if hmac.compare_digest(auth.credentials, token):
                identity = identifier
    if identity is None:
        raise ServiceError("UNAUTHORIZED", "Informe uma credencial válida.", 401)
    limits = request.app.state.rate
    if not limits.allow((identity, "all"), settings.rate_per_minute):
        raise ServiceError("RATE_LIMIT", "O limite de requisições foi atingido. Tente novamente em instantes.", 429)
    return identity


def create_app(settings: Settings | None = None, *, policy: OriginPolicy | None = None):
    @asynccontextmanager
    async def lifespan(api):
        config = settings or Settings.from_env()
        # These libraries include request URLs and connection details at INFO/DEBUG.
        logging.getLogger("httpx").setLevel(logging.WARNING)
        logging.getLogger("httpcore").setLevel(logging.WARNING)
        storage = Storage(config)
        storage.open()
        try:
            engine = Engine(config, policy or OriginPolicy(config.direct_hosts))
            with TemporaryDirectory(prefix="discover-", dir=storage.root) as directory:
                await engine.detect(Path(directory))
            manager = JobManager(config, engine, storage)
            manager.start()
            api.state.settings, api.state.manager, api.state.rate = config, manager, RateLimit()
            try:
                yield
            finally:
                await manager.shutdown()
        finally:
            storage.close()

    api = FastAPI(
        title="EduDownloader Mobile API", version="1.0.0", lifespan=lifespan,
        description="Análise e download autorizado de mídia com fila local e erros estáveis.",
    )
    api.add_middleware(BodyLimit)
    router = APIRouter(prefix="/api/v1", responses={
        code: {"model": ErrorResponse} for code in (401, 403, 404, 409, 410, 413, 422, 429, 502, 503, 504, 507)
    })

    @api.exception_handler(ServiceError)
    async def on_service_error(_, error):
        headers = {"WWW-Authenticate": "Bearer"} if error.status == 401 else {}
        if error.status == 429:
            headers["Retry-After"] = "60"
        return json_error(error.code, error.message, error.status, headers)

    @api.exception_handler(RequestValidationError)
    async def on_validation(_, _error):
        return json_error("INVALID_REQUEST", "Confira os campos da solicitação.", 422)

    @api.exception_handler(HTTPException)
    async def on_http(_, error):
        return json_error("HTTP_ERROR", "A operação HTTP não está disponível.", error.status_code)

    @router.get("/health", response_model=EngineHealth, summary="Consultar os motores instalados")
    async def health(request: Request, auth: AUTHENTICATION):
        owner(request, auth)
        return request.app.state.manager.engine.health()

    @router.post("/media/analyze", response_model=AnalysisResponse, summary="Identificar mídia, formatos e qualidades")
    async def analyze(payload: AnalyzeRequest, request: Request, auth: AUTHENTICATION):
        identity = owner(request, auth)
        if not request.app.state.rate.allow((identity, "analysis"), request.app.state.settings.analysis_rate_per_minute):
            raise ServiceError("ANALYSIS_RATE_LIMIT", "O limite de análises por minuto foi atingido.", 429)
        return await request.app.state.manager.analyze(identity, payload.url)

    @router.post("/jobs", status_code=202, response_model=JobResponse, summary="Enfileirar uma opção da análise")
    async def create_job(
        payload: CreateJob, request: Request, auth: AUTHENTICATION,
        idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
    ):
        identity = owner(request, auth)
        if idempotency_key is not None and not IDENTITY_KEY.fullmatch(idempotency_key):
            raise ServiceError("INVALID_IDEMPOTENCY_KEY", "Informe uma chave de idempotência válida.")
        return request.app.state.manager.create(identity, payload, idempotency_key).response()

    @router.get("/jobs/{job_id}", response_model=JobResponse, summary="Consultar estado e progresso")
    async def get_job(job_id: UUID, request: Request, auth: AUTHENTICATION):
        return request.app.state.manager.get(owner(request, auth), job_id).response()

    @router.post("/jobs/{job_id}/cancel", response_model=JobResponse, summary="Cancelar uma tarefa")
    async def cancel_job(job_id: UUID, request: Request, auth: AUTHENTICATION):
        manager = request.app.state.manager
        return manager.cancel(manager.get(owner(request, auth), job_id)).response()

    @router.get("/jobs/{job_id}/file", response_class=FileResponse, summary="Transferir a saída já verificada",
                responses={200: {"content": {"video/mp4": {}, "audio/mpeg": {}}}, 206: {"description": "Parte do arquivo"}})
    async def get_file(job_id: UUID, request: Request, auth: AUTHENTICATION):
        manager = request.app.state.manager
        job = manager.get(owner(request, auth), job_id)
        path = manager.acquire_file(job)
        return ManagedFileResponse(
            path, media_type=job.file.mime_type, filename=job.file.name,
            headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
                     "X-Content-SHA256": job.file.sha256},
            release=lambda: manager.release_file(job),
        )

    api.include_router(router)
    return api


app = create_app()


if __name__ == "__main__":
    import uvicorn

    logging.basicConfig()
    logging.getLogger("edudownloader").setLevel(logging.INFO)
    uvicorn.run(app, host="127.0.0.1", port=number("EDU_PORT", 8765, 1024, 65535),
                access_log=False, proxy_headers=False, limit_concurrency=48)
