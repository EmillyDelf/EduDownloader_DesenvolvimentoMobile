from dataclasses import dataclass, field
import json
import os
from pathlib import Path
import re
import tempfile


MIB = 1024 ** 2
GIB = 1024 ** 3
CLIENT_ID = re.compile(r"[A-Za-z0-9_-]{1,64}\Z")
TOKEN = re.compile(r"[A-Za-z0-9_-]{32,128}\Z")


def number(name: str, default: int, low: int, high: int) -> int:
    try:
        value = int(os.environ.get(name, default))
    except ValueError:
        value = -1
    if not low <= value <= high:
        raise ValueError(f"{name} deve estar entre {low} e {high}")
    return value


@dataclass(frozen=True)
class Settings:
    data_dir: Path
    client_tokens: dict[str, str] = field(repr=False)
    direct_hosts: tuple[str, ...] = ()
    ffmpeg: str = "ffmpeg"
    ffprobe: str = "ffprobe"
    deno: str = "deno"
    workers: int = 2
    max_queue: int = 8
    max_analyses: int = 16
    max_history: int = 128
    analysis_seconds: int = 35
    job_seconds: int = 600
    retain_seconds: int = 3600
    analysis_ttl: int = 900
    max_duration: int = 3600
    max_bytes: int = 250 * MIB
    disk_budget: int = 3 * GIB
    min_free: int = 256 * MIB
    memory_bytes: int = 768 * MIB
    cpu_seconds: int = 240
    rate_per_minute: int = 120
    analysis_rate_per_minute: int = 10
    max_resolution: int = 1080

    @classmethod
    def from_env(cls) -> "Settings":
        try:
            clients = json.loads(os.environ["EDU_CLIENT_TOKENS"])
        except (KeyError, ValueError):
            clients = None
        if (
            not isinstance(clients, dict)
            or not 1 <= len(clients) <= 32
            or any(not CLIENT_ID.fullmatch(key) or not isinstance(value, str) or not TOKEN.fullmatch(value)
                   for key, value in clients.items())
            or len(set(clients.values())) != len(clients)
        ):
            raise ValueError("Configure EDU_CLIENT_TOKENS com IDs únicos e chaves aleatórias de 32 a 128 caracteres")
        return cls(
            data_dir=Path(os.environ.get("EDU_DATA_DIR") or tempfile.gettempdir()),
            client_tokens=clients,
            direct_hosts=tuple(value.strip().lower() for value in os.environ.get("EDU_DIRECT_HOSTS", "").split(",") if value.strip()),
            ffmpeg=os.environ.get("EDU_FFMPEG", "ffmpeg"),
            ffprobe=os.environ.get("EDU_FFPROBE", "ffprobe"),
            deno=os.environ.get("EDU_DENO", "deno"),
            workers=number("EDU_WORKERS", 2, 1, 4),
            max_queue=number("EDU_MAX_QUEUE", 8, 1, 24),
            max_analyses=number("EDU_MAX_ANALYSES", 16, 1, 64),
            max_history=number("EDU_MAX_HISTORY", 128, 1, 512),
            analysis_seconds=number("EDU_ANALYSIS_SECONDS", 35, 1, 120),
            job_seconds=number("EDU_JOB_SECONDS", 600, 1, 1800),
            retain_seconds=number("EDU_RETAIN_SECONDS", 3600, 10, 86400),
            analysis_ttl=number("EDU_ANALYSIS_TTL", 900, 10, 3600),
            max_duration=number("EDU_MAX_DURATION", 3600, 1, 10800),
            max_bytes=number("EDU_MAX_FILE_MIB", 250, 1, 1024) * MIB,
            disk_budget=number("EDU_DISK_BUDGET_MIB", 3072, 16, 32768) * MIB,
            min_free=number("EDU_MIN_FREE_MIB", 256, 1, 4096) * MIB,
            memory_bytes=number("EDU_MEMORY_MIB", 768, 128, 4096) * MIB,
            cpu_seconds=number("EDU_CPU_SECONDS", 240, 1, 900),
            rate_per_minute=number("EDU_RATE_LIMIT", 120, 1, 900),
            analysis_rate_per_minute=number("EDU_ANALYSIS_RATE_LIMIT", 10, 1, 60),
            max_resolution=number("EDU_MAX_RESOLUTION", 1080, 144, 2160),
        )
