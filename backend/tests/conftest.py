import asyncio
from dataclasses import replace
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import re
import shutil
import subprocess
import threading
import time

from fastapi.testclient import TestClient
import pytest

from app.config import MIB, Settings
from app.main import create_app
from app.security import OriginPolicy, deny


ROOT = Path(__file__).resolve().parents[1]
OWNER = {"Authorization": "Bearer " + "a" * 40}
OTHER = {"Authorization": "Bearer " + "b" * 40}


def installed(env, bundled, name):
    answer = os.environ.get(env) or (str(bundled) if bundled and bundled.is_file() else shutil.which(name))
    if not answer:
        pytest.fail(f"Configure {env} antes de validar os motores reais")
    return str(Path(answer).resolve())


@pytest.fixture(scope="session")
def tools():
    ff_bin = next((ROOT / ".tools" / "ffmpeg").glob("*/bin"), None)
    return {
        "ffmpeg": installed("EDU_FFMPEG", ff_bin / "ffmpeg.exe" if ff_bin else None, "ffmpeg"),
        "ffprobe": installed("EDU_FFPROBE", ff_bin / "ffprobe.exe" if ff_bin else None, "ffprobe"),
        "deno": installed("EDU_DENO", ROOT / ".tools" / "deno" / "deno.exe", "deno"),
    }


@pytest.fixture(scope="session")
def media(tmp_path_factory, tools):
    folder = tmp_path_factory.mktemp("midia-autoral")
    ffmpeg = tools["ffmpeg"]
    video = ["-f", "lavfi", "-i", "testsrc2=size=320x180:rate=15"]
    audio = ["-f", "lavfi", "-i", "sine=frequency=550:sample_rate=44100"]

    def generate(name, *args):
        subprocess.run([ffmpeg, "-v", "error", "-nostdin", "-y", *args, str(folder / name)],
                       check=True, capture_output=True, timeout=15, shell=False)

    generate("combined.mp4", *video, *audio, "-t", "1.2", "-c:v", "libx264", "-pix_fmt", "yuv420p",
             "-c:a", "aac", "-threads", "2", "-movflags", "+faststart")
    generate("v180.mp4", *video, "-t", "2.4", "-an", "-c:v", "libx264",
             "-pix_fmt", "yuv420p", "-threads", "2", "-movflags", "+faststart")
    generate("v360.mp4", "-f", "lavfi", "-i", "testsrc2=size=640x360:rate=15", "-t", "2.4",
             "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-threads", "2", "-movflags", "+faststart")
    generate("audio.m4a", *audio, "-t", "2.4", "-vn", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart")
    generate("original.mp3", *audio, "-t", "0.8", "-vn", "-c:a", "libmp3lame", "-b:a", "128k")
    (folder / "invalid.mp4").write_bytes(b"Not a media file (intentional test).")
    (folder / "sources.mpd").write_text("""<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static" mediaPresentationDuration="PT2.4S" minBufferTime="PT1S">
  <Period start="PT0S">
    <AdaptationSet contentType="video" mimeType="video/mp4">
      <Representation id="v180" width="320" height="180" bandwidth="350000" codecs="avc1.64001E">
        <BaseURL>v180.mp4</BaseURL>
      </Representation>
      <Representation id="v360" width="640" height="360" bandwidth="850000" codecs="avc1.64001E">
        <BaseURL>v360.mp4</BaseURL>
      </Representation>
    </AdaptationSet>
    <AdaptationSet contentType="audio" mimeType="audio/mp4">
      <Representation id="a96" bandwidth="96000" codecs="mp4a.40.2">
        <BaseURL>audio.m4a</BaseURL>
      </Representation>
    </AdaptationSet>
  </Period>
</MPD>""", encoding="utf-8")
    manifest = (folder / "sources.mpd").read_text(encoding="utf-8")
    (folder / "slow-sources.mpd").write_text(manifest.replace("audio.m4a", "slow.m4a"), encoding="utf-8")
    return folder


@pytest.fixture
def origin(media):
    requests = []
    active = threading.Event()
    abandoned = threading.Event()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def do_HEAD(self):
            self.serve()

        def do_GET(self):
            self.serve()

        def serve(self):
            name = self.path.split("?", 1)[0][1:]
            requests.append((self.command, name))
            if name == "redirect.mp4":
                self.send_response(302)
                self.send_header("Location", "http://127.0.0.1/forbidden.mp4")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            if name == "private.mp4":
                self.send_error(403)
                return
            known = {"combined.mp4", "v180.mp4", "v360.mp4", "audio.m4a", "original.mp3", "invalid.mp4",
                     "sources.mpd", "slow-sources.mpd", "longer.mp4"}
            if name not in known | {"slow.mp4", "slow.m4a", "incomplete.mp4", "large.mp4", "offline.mp4"}:
                self.send_error(404)
                return
            alias = {"slow.mp4": "v360.mp4", "slow.m4a": "audio.m4a", "incomplete.mp4": "combined.mp4",
                     "large.mp4": "v360.mp4", "offline.mp4": "combined.mp4"}
            data = (media / alias.get(name, name)).read_bytes()
            mime = {"mpd": "application/dash+xml", "mp3": "audio/mpeg", "m4a": "audio/mp4"}.get(name.split(".")[-1], "video/mp4")
            if name == "offline.mp4" and self.command == "GET":
                self.close_connection = True
                return
            start = 0
            if value := self.headers.get("Range"):
                match = re.fullmatch(r"bytes=(\d+)-", value)
                if match:
                    start = int(match[1])
            size = len(data)
            if start >= size:
                self.send_error(416)
                return
            self.send_response(206 if start else 200)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str((128 * MIB if name == "large.mp4" else size) - start))
            self.send_header("Accept-Ranges", "bytes")
            if start:
                self.send_header("Content-Range", f"bytes {start}-{size - 1}/{size}")
            self.end_headers()
            if self.command == "HEAD":
                return
            try:
                if name in {"slow.mp4", "slow.m4a"}:
                    active.set()
                    for index in range(start, size, 2048):
                        self.wfile.write(data[index:index + 2048])
                        self.wfile.flush()
                        time.sleep(0.2 if name == "slow.m4a" else 0.06)
                elif name == "incomplete.mp4":
                    self.wfile.write(data[start:start + 1024])
                elif name != "large.mp4":
                    self.wfile.write(data[start:])
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                abandoned.set()

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    class FixturePolicy(OriginPolicy):
        """Only this test maps the single fixture DNS label to its ephemeral port."""
        def __init__(self):
            super().__init__(("fixtures.test",))

        async def connect(self, source, host, port):
            if source.host != "fixtures.test" or host != "fixtures.test" or port != 80:
                raise deny()
            return await asyncio.open_connection("127.0.0.1", server.server_port)

    yield FixturePolicy(), requests, active, abandoned
    server.shutdown()
    server.server_close()
    thread.join(3)


@pytest.fixture
def settings(tmp_path, tools):
    directory = tmp_path / "pasta com espaço & mídia"
    return Settings(directory, {"john": "a" * 40, "guest": "b" * 40}, **tools,
                    workers=1, analysis_seconds=14, job_seconds=24, min_free=MIB,
                    max_bytes=16 * MIB, disk_budget=256 * MIB, rate_per_minute=3000)


@pytest.fixture
def api(settings, origin):
    def factory(**changes):
        return TestClient(create_app(replace(settings, **changes), policy=origin[0]), headers=OWNER)
    return factory
