import asyncio
from contextlib import suppress
import ctypes
from ctypes import wintypes
from dataclasses import dataclass
import os
from pathlib import Path
import signal
import sys

from .errors import Cancelled, ServiceError


class JobBasicLimits(ctypes.Structure):
    _fields_ = [
        ("process_time", ctypes.c_int64), ("job_time", ctypes.c_int64),
        ("flags", wintypes.DWORD), ("min_working_set", ctypes.c_size_t), ("max_working_set", ctypes.c_size_t),
        ("process_count", wintypes.DWORD), ("affinity", ctypes.c_size_t),
        ("priority", wintypes.DWORD), ("scheduling", wintypes.DWORD),
    ]


class JobLimits(ctypes.Structure):
    _fields_ = [
        ("basic", JobBasicLimits), ("io_counts", ctypes.c_uint64 * 6),
        ("process_memory", ctypes.c_size_t), ("job_memory", ctypes.c_size_t),
        ("peak_process_memory", ctypes.c_size_t), ("peak_job_memory", ctypes.c_size_t),
    ]


class WindowsJob:
    def __init__(self, pid, settings):
        self.kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        for name, result, args in (
            ("CreateJobObjectW", wintypes.HANDLE, [ctypes.c_void_p, wintypes.LPCWSTR]),
            ("OpenProcess", wintypes.HANDLE, [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]),
            ("SetInformationJobObject", wintypes.BOOL, [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD]),
            ("AssignProcessToJobObject", wintypes.BOOL, [wintypes.HANDLE, wintypes.HANDLE]),
            ("CloseHandle", wintypes.BOOL, [wintypes.HANDLE]),
        ):
            call = getattr(self.kernel, name)
            call.restype, call.argtypes = result, args
        self.handle = self.kernel.CreateJobObjectW(None, None)
        if not self.handle:
            raise ctypes.WinError(ctypes.get_last_error())
        limits = JobLimits()
        # KILL_ON_JOB_CLOSE | JOB_MEMORY | ACTIVE_PROCESS | PROCESS_TIME
        limits.basic.flags = 0x2000 | 0x0200 | 0x0008 | 0x0002
        limits.basic.process_count = 8
        limits.basic.process_time = settings.cpu_seconds * 10_000_000
        limits.job_memory = settings.memory_bytes
        try:
            if not self.kernel.SetInformationJobObject(self.handle, 9, ctypes.byref(limits), ctypes.sizeof(limits)):
                raise ctypes.WinError(ctypes.get_last_error())
            process = self.kernel.OpenProcess(0x0101, False, pid)  # SET_QUOTA | TERMINATE
            if not process:
                raise ctypes.WinError(ctypes.get_last_error())
            try:
                if not self.kernel.AssignProcessToJobObject(self.handle, process):
                    raise ctypes.WinError(ctypes.get_last_error())
            finally:
                self.kernel.CloseHandle(process)
        except BaseException:
            self.close()
            raise

    def close(self):
        self.kernel.CloseHandle(self.handle)


@dataclass(frozen=True)
class RunResult:
    status: int
    stdout: bytes
    stderr_tail: bytes


class ProcessRunner:
    def __init__(self, settings):
        self.settings = settings

    async def run(self, args, cwd: Path, *, timeout, stop=None, on_line=None, guard=None, capture=0, proxy=None):
        if stop is not None and stop.is_set():
            raise Cancelled
        env = {
            name: value for name, value in os.environ.items()
            if name.lower() in {"systemroot", "windir", "systemdrive"}
        }
        env.update({
            "TEMP": str(cwd), "TMP": str(cwd), "TMPDIR": str(cwd),
            "HOME": str(cwd), "USERPROFILE": str(cwd), "APPDATA": str(cwd), "LOCALAPPDATA": str(cwd),
            "DENO_DIR": str(cwd / "deno-cache"), "DENO_NO_UPDATE_CHECK": "1",
        })
        if proxy:
            env.update({"http_proxy": proxy, "https_proxy": proxy})
        kwargs = {"creationflags": 0x08000000} if os.name == "nt" else {"start_new_session": True}
        gate = Path(__file__).with_name("engine_gate.py")
        try:
            proc = await asyncio.create_subprocess_exec(
                sys.executable, "-I", str(gate), str(self.settings.cpu_seconds),
                str(self.settings.memory_bytes), str(self.settings.max_bytes), *map(str, args),
                stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                cwd=cwd, env=env, **kwargs,
            )
        except OSError:
            raise ServiceError("ENGINE_START", "Não foi possível iniciar o motor.", 503) from None

        windows_job = None
        pumps = []
        data = bytearray()
        error_tail = bytearray()

        async def pump(stream, is_error):
            partial = b""
            while chunk := await stream.read(16384):
                if is_error:
                    error_tail.extend(chunk)
                    del error_tail[:-8192]
                elif capture:
                    data.extend(chunk)
                    if len(data) > capture:
                        raise ServiceError("ENGINE_OUTPUT_LIMIT", "O motor excedeu o limite de metadados.")
                if on_line is not None:
                    *lines, partial = (partial + chunk).split(b"\n")
                    for line in lines:
                        if len(line) <= 8192:
                            on_line(line.rstrip(b"\r"))
                    if len(partial) > 8192:
                        partial = b""

        try:
            if os.name == "nt":
                try:
                    windows_job = WindowsJob(proc.pid, self.settings)
                except OSError:
                    raise ServiceError("ISOLATION_FAILED", "Não foi possível isolar os processos do motor.", 503) from None
            proc.stdin.write(b"G")
            await proc.stdin.drain()
            proc.stdin.close()
            pumps = [asyncio.create_task(pump(proc.stdout, False)), asyncio.create_task(pump(proc.stderr, True))]
            async with asyncio.timeout(timeout):
                while proc.returncode is None:
                    if stop is not None and stop.is_set():
                        raise Cancelled
                    if guard is not None:
                        guard()
                    for task in pumps:
                        if task.done():
                            task.result()
                    await asyncio.sleep(0.05)
        except TimeoutError:
            raise ServiceError("TASK_TIMEOUT", "O motor excedeu o tempo permitido.", 504) from None
        finally:
            proc.stdin.close()
            if windows_job is not None:
                windows_job.close()
            elif os.name != "nt":
                with suppress(ProcessLookupError):
                    os.killpg(proc.pid, signal.SIGKILL)
            elif proc.returncode is None:
                with suppress(ProcessLookupError):
                    proc.kill()
            await asyncio.gather(*pumps, return_exceptions=True)
            await proc.wait()
        if stop is not None and stop.is_set():
            raise Cancelled
        for task in pumps:
            task.result()
        if guard is not None:
            guard()
        return RunResult(proc.returncode, bytes(data), bytes(error_tail))
