import asyncio
import ctypes
from ctypes import wintypes
from dataclasses import replace
import logging
import os
from pathlib import Path
import sys
from time import monotonic, sleep
from uuid import UUID

import pytest

from app.errors import Cancelled, ServiceError
from app.processes import ProcessRunner
from test_engine import BASE, analyze, start, terminal, wait_for


def assert_clean(client, identifier):
    directory = client.app.state.manager.jobs[UUID(identifier)].directory
    assert not directory.exists(), list(directory.iterdir())
    assert client.get(f"{BASE}/jobs/{identifier}/file").status_code == 409


def test_bounded_queue_true_transfer_progress_and_cancellation(api, origin):
    with api(max_queue=1) as client:
        analysis = analyze(client, "slow.mp4")
        active = start(client, analysis, "mp4-original")
        running, _ = wait_for(client, active["id"], lambda job: (
            job["status"] == "downloading" and (job["progress"]["downloadedBytes"] or 0) > 0
        ))
        assert origin[2].is_set()
        progress = running["progress"]
        assert 0 < progress["downloadedBytes"] < progress["totalBytes"]
        assert 0 < progress["percent"] < 100
        assert progress["track"] == 1 and progress["trackCount"] == 1
        queued = start(client, analysis, "mp4-original")
        assert queued["status"] == "queued"
        exceeded = client.post(f"{BASE}/jobs", json={"analysisId": analysis["analysisId"], "optionId": "mp4-original"})
        assert exceeded.status_code == 429 and exceeded.json()["error"]["code"] == "QUEUE_FULL"
        assert client.post(f"{BASE}/jobs/{queued['id']}/cancel").json()["status"] == "cancelled"
        assert_clean(client, queued["id"])
        endpoint = f"{BASE}/jobs/{active['id']}/cancel"
        assert client.post(endpoint).json()["cancelRequested"]
        assert client.post(endpoint).json()["cancelRequested"]
        stopped, _ = terminal(client, active["id"])
        assert stopped["status"] == "cancelled"
        assert stopped["file"] is None
        assert_clean(client, active["id"])
        assert origin[3].wait(3), "HTTP connection did not close after cancellation"


def test_cancel_during_real_ffmpeg_processing(api):
    with api() as client:
        analysis = analyze(client, "sources.mpd")
        runner = client.app.state.manager.engine.runner
        original = runner.run

        async def controlled(args, directory, **kwargs):
            if "-progress" in args:
                args = list(args)
                before = args.index("-i")
                args[before:before] = ["-readrate", "0.2"]
            return await original(args, directory, **kwargs)

        runner.run = controlled
        job = start(client, analysis, "mp3-192")
        work, states = wait_for(client, job["id"], lambda state: (
            state["status"] == "processing" and (state["progress"]["processedSeconds"] or 0) > 0
        ))
        assert "downloading" in states
        assert work["progress"]["durationSeconds"] == pytest.approx(2.4)
        assert work["progress"]["downloadedBytes"] is None
        client.post(f"{BASE}/jobs/{job['id']}/cancel")
        final, _ = terminal(client, job["id"])
        assert final["status"] == "cancelled"
        assert_clean(client, job["id"])


@pytest.mark.parametrize(("name", "error"), [
    ("invalid.mp4", "UNVERIFIED_FILE"), ("incomplete.mp4", "ORIGIN_FAILED"), ("offline.mp4", "ORIGIN_FAILED"),
])
def test_failed_and_incomplete_files_are_never_delivered(api, name, error):
    with api() as client:
        analysis = analyze(client, name)
        job = start(client, analysis, "mp4-original")
        final, _ = terminal(client, job["id"])
        assert final["status"] == "failed"
        expected = {error, "INCOMPLETE_DOWNLOAD"} if name == "incomplete.mp4" else {error}
        assert final["error"]["code"] in expected
        assert final["file"] is None
        assert_clean(client, job["id"])


def test_disk_reservation_blocks_work_before_any_transfer(api, origin):
    with api(disk_budget=1024) as client:
        analysis = analyze(client, "combined.mp4")
        job = start(client, analysis, "mp4-original")
        failed, _ = terminal(client, job["id"])
        assert failed["status"] == "failed" and failed["error"]["code"] == "NO_SPACE"
        assert ("GET", "combined.mp4") not in origin[1]
        assert_clean(client, job["id"])


def test_job_timeout_cleans_partial_files(api):
    with api(job_seconds=1) as client:
        analysis = analyze(client, "slow.mp4")
        job = start(client, analysis, "mp4-original")
        failed, _ = terminal(client, job["id"])
        assert failed["status"] == "failed" and failed["error"]["code"] == "TASK_TIMEOUT"
        assert_clean(client, job["id"])


def test_workspace_cleanup_error_does_not_stop_worker(api, monkeypatch, caplog):
    with api(retain_seconds=10) as client:
        manager = client.app.state.manager
        remove = manager.storage.remove
        failures = []

        def fail_once(directory):
            if directory.is_dir() and directory.name.startswith("job-") and not failures:
                failures.append(directory)
                raise RuntimeError("unsafe path details must stay private")
            return remove(directory)

        monkeypatch.setattr(manager.storage, "remove", fail_once)
        failed_analysis = analyze(client, "offline.mp4")
        job = start(client, failed_analysis, "mp4-original")
        failed, _ = wait_for(client, job["id"], lambda state: state["status"] == "failed", timeout=4)
        assert failed["error"]["code"] == "CLEANUP_FAILED"
        assert failed["file"] is None
        assert len(failures) == 1
        directory = failures[0]
        assert directory not in manager.storage.reservations
        assert "unsafe path details" not in caplog.text

        next_job = start(client, analyze(client, "combined.mp4"), "mp4-original")
        finished, _ = terminal(client, next_job["id"])
        assert finished["status"] == "completed"
        until = monotonic() + 7
        while directory.exists() and monotonic() < until:
            sleep(0.05)
        assert not directory.exists()


def test_mp3_download_timeout_precedes_ffmpeg_and_records_phase(api, caplog):
    caplog.set_level(logging.INFO, logger="edudownloader")
    with api(job_seconds=2) as client:
        analysis = analyze(client, "slow-sources.mpd")
        engine = client.app.state.manager.engine
        commands = []
        run = engine.runner.run

        async def record(args, directory, **kwargs):
            commands.append(args[0])
            return await run(args, directory, **kwargs)

        engine.runner.run = record
        job = start(client, analysis, "mp3-192")
        failed, _ = terminal(client, job["id"])
        assert failed["error"]["code"] == "TASK_TIMEOUT"
        assert engine.paths["ffmpeg"] not in commands
        assert engine.paths["ffprobe"] not in commands
        assert_clean(client, job["id"])
    assert "stream_transfer" in caplog.text
    assert "phase=downloading" in caplog.text and "budget_seconds=2" in caplog.text
    assert "fixtures.test" not in caplog.text


def test_restart_during_transfer_cleans_tasks_and_stale_private_directories(api, origin):
    with api() as client:
        analysis = analyze(client, "slow.mp4")
        job = start(client, analysis, "mp4-original")
        assert origin[2].wait(5)
        workspace = client.app.state.manager.jobs[UUID(job["id"])].directory
        assert workspace.is_dir()
    assert not workspace.exists()
    # Cold recovery sees an orphaned workspace without a resumable queue record.
    stale = workspace.parent / "job-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    stale.mkdir()
    (stale / "track-1.mp4.part").write_bytes(b"interrupted")
    (workspace.parent / "unrelated.txt").write_text("preserve", encoding="utf-8")
    with api() as restarted:
        assert restarted.get(f"{BASE}/jobs/{job['id']}").status_code == 404
        assert not stale.exists()
        assert (workspace.parent / "unrelated.txt").is_file()


def test_retention_expires_files_and_idempotency_keys(api):
    with api(retain_seconds=1) as client:
        analysis = analyze(client, "original.mp3")
        job = start(client, analysis, "mp3-original", key="expiry-key")
        final, _ = terminal(client, job["id"])
        assert final["status"] == "completed"
        file = client.app.state.manager.jobs[UUID(job["id"])].path
        assert file.is_file()
        sleep(1.1)
        assert client.get(final["file"]["downloadPath"]).status_code == 404
        assert not file.exists()
        assert start(client, analysis, "mp3-original", key="expiry-key")["id"] != job["id"]


def alive(pid):
    if os.name == "nt":
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.OpenProcess.restype = wintypes.HANDLE
        kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
        kernel.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
        kernel.WaitForSingleObject.restype = wintypes.DWORD
        kernel.CloseHandle.argtypes = [wintypes.HANDLE]
        process = kernel.OpenProcess(0x100000, False, pid)  # SYNCHRONIZE
        if not process:
            return False
        try:
            return kernel.WaitForSingleObject(process, 3000) == 0x102
        finally:
            kernel.CloseHandle(process)
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    proc = Path(f"/proc/{pid}/stat")
    return not proc.exists() or ") Z " not in proc.read_text()


def test_supervisor_cancels_process_tree_and_bounds_output(settings, tmp_path):
    async def validate():
        runner = ProcessRunner(settings)
        stop, started = asyncio.Event(), asyncio.Event()
        pids = []

        def line(message):
            if message.startswith(b"PIDS "):
                pids.extend(map(int, message.split()[1:]))
                started.set()

        command = (
            "import os,subprocess,sys,time;"
            "child=subprocess.Popen([sys.executable,'-c','import time;time.sleep(60)']);"
            "print('PIDS',os.getpid(),child.pid,flush=True);time.sleep(60)"
        )
        running = asyncio.create_task(runner.run([sys.executable, "-c", command], tmp_path,
                                                 timeout=10, stop=stop, on_line=line))
        try:
            await asyncio.wait_for(started.wait(), timeout=5)
        finally:
            stop.set()
            with pytest.raises(Cancelled):
                await running
        assert len(pids) == 2
        assert all(not alive(pid) for pid in pids)
        with pytest.raises(ServiceError, match="ENGINE_OUTPUT_LIMIT"):
            await runner.run([sys.executable, "-c", "print('a'*20000)"], tmp_path, timeout=3, capture=4096)

    asyncio.run(validate())


def test_supervisor_enforces_native_memory_and_cpu_limits(settings, tmp_path):
    async def validate():
        runner = ProcessRunner(replace(settings, memory_bytes=128 * 1024 ** 2, cpu_seconds=1))
        alloc = await runner.run([
            sys.executable, "-c", "data = bytearray(256 * 1024 * 1024); print('unbounded')",
        ], tmp_path, timeout=5, capture=1024)
        assert alloc.status != 0 and b"unbounded" not in alloc.stdout
        cpu = await runner.run([sys.executable, "-c", "while True: pass"], tmp_path, timeout=8, capture=1024)
        assert cpu.status != 0

    asyncio.run(validate())


def test_bundled_deno_runs_javascript_without_network_permission(tools, settings, tmp_path):
    async def validate():
        runner = ProcessRunner(settings)
        valid = await runner.run([tools["deno"], "run", "--no-config", "--no-remote", "--cached-only", "--no-prompt",
                                  str(script)], tmp_path, timeout=8, capture=8192)
        assert valid.status == 0
        assert valid.stdout.strip() == b"deno-ok"
        denied = await runner.run([tools["deno"], "run", "--no-config", "--no-remote", "--cached-only", "--no-prompt",
                                   str(network)], tmp_path, timeout=8, capture=8192)
        assert denied.status != 0
        assert b"Requires net access" in denied.stderr_tail

    script = tmp_path / "script.js"
    script.write_text('if (2 + 2 !== 4) throw Error("runtime"); console.log("deno-ok");')
    network = tmp_path / "network.js"
    network.write_text('await Deno.connect({ hostname: "127.0.0.1", port: 8765 });')
    asyncio.run(validate())
