from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class Contract(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, validate_by_name=True, extra="forbid")


class ErrorDetail(Contract):
    code: str
    message: str


class ErrorResponse(Contract):
    error: ErrorDetail


class EngineHealth(Contract):
    ready: bool
    engines: dict[str, str | None]
    missing: list[str]


class AnalyzeRequest(Contract):
    url: Annotated[str, Field(min_length=1, max_length=8192)]


class MediaOption(Contract):
    id: str
    format: Literal["MP4", "MP3"]
    mime_type: str
    quality: str | None = None
    operation: Literal["original", "remux", "merge", "transcode"]
    requires_processing: bool
    width: int | None = None
    height: int | None = None
    video_codec: str | None = None
    audio_codec: str | None = None
    bitrate_kbps: int | None = None
    size_bytes: int | None = None
    estimated_size_bytes: int | None = None
    source_ext: list[str]


class AnalysisResponse(Contract):
    analysis_id: UUID
    available: Literal[True] = True
    name: str
    media_id: str | None = None
    platform: str
    duration_seconds: float | None = None
    expires_at: datetime
    options: list[MediaOption]


class CreateJob(Contract):
    analysis_id: UUID
    option_id: Annotated[str, Field(pattern=r"^[A-Za-z0-9_-]{1,64}$")]


class DownloadProgress(Contract):
    downloaded_bytes: int | None = None
    total_bytes: int | None = None
    estimated_total_bytes: int | None = None
    bytes_per_second: float | None = None
    eta_seconds: float | None = None
    percent: float | None = None
    track: int | None = None
    track_count: int | None = None
    processed_seconds: float | None = None
    duration_seconds: float | None = None


class FileInfo(Contract):
    name: str
    mime_type: str
    format: Literal["MP4", "MP3"]
    size_bytes: int
    duration_seconds: float
    width: int | None = None
    height: int | None = None
    video_codec: str | None = None
    audio_codec: str | None = None
    bitrate_kbps: float | None = None
    sha256: str
    download_path: str


JobStatus = Literal["queued", "analyzing", "downloading", "processing", "verifying", "completed", "failed", "cancelled"]


class JobResponse(Contract):
    id: UUID
    status: JobStatus
    created_at: datetime
    updated_at: datetime
    expires_at: datetime | None = None
    can_cancel: bool
    cancel_requested: bool
    option: MediaOption
    progress: DownloadProgress
    error: ErrorDetail | None = None
    file: FileInfo | None = None
