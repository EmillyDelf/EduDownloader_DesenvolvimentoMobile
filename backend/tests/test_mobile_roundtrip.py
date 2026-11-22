import asyncio
from dataclasses import replace
import json
import os
import secrets
import shutil
import socket
import subprocess

import pytest
import uvicorn
from fastapi.testclient import TestClient

from app.main import create_app
from app.security import OriginPolicy
from conftest import ROOT


def test_real_mobile_client_transfers_verifies_and_persists(settings, origin, media, tools):
    node = shutil.which("node")
    if not node or not (ROOT.parent / "node_modules" / "@noble" / "hashes").is_dir():
        pytest.skip("Para a integração mobile instale Node e execute npm ci na raiz do aplicativo")
    large = media / "longer.mp4"
    subprocess.run([
        tools["ffmpeg"], "-v", "error", "-nostdin", "-y", "-f", "lavfi",
        "-i", "testsrc2=size=1280x720:rate=24", "-t", "8", "-an", "-c:v", "libx264",
        "-preset", "ultrafast", "-crf", "10", "-threads", "2", "-movflags", "+faststart", str(large),
    ], check=True, timeout=30, capture_output=True)
    assert 4 * 1024 * 1024 < large.stat().st_size < settings.max_bytes
    tokens = {"app": secrets.token_urlsafe(32), "other": secrets.token_urlsafe(32)}
    external = os.getenv("EDU_TEST_EXTERNAL_MOBILE") == "1"

    class MobileFixturePolicy(OriginPolicy):
        def __init__(self):
            super().__init__(("fixtures.test", "developer.mozilla.org") if external else ("fixtures.test",))

        async def connect(self, source, host, port):
            if source.host == "fixtures.test":
                return await origin[0].connect(source, host, port)
            return await super().connect(source, host, port)

    async def roundtrip():
        app = create_app(replace(settings, client_tokens=tokens), policy=MobileFixturePolicy())
        server = uvicorn.Server(uvicorn.Config(app, log_level="critical", access_log=False, proxy_headers=False, ws="none"))
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            address = f"http://127.0.0.1:{listener.getsockname()[1]}"
            running = asyncio.create_task(server.serve(sockets=[listener]))
            try:
                async with asyncio.timeout(12):
                    while not server.started:
                        if running.done():
                            running.result()
                            raise AssertionError("O serviço de integração não iniciou")
                        await asyncio.sleep(0.05)
                env = {**os.environ, "EDU_MOBILE_TEST_API": address, "EDU_MOBILE_TEST_SESSIONS": json.dumps(tokens)}
                command = [node, "--test", "--test-reporter=tap", "tests/helpers/mobileBackendRoundtrip.cjs"]
                result = await asyncio.to_thread(subprocess.run, command, cwd=ROOT.parent, env=env,
                                                 capture_output=True, text=True, encoding="utf-8", timeout=110)
                output = result.stdout + result.stderr
                for token in tokens.values():
                    output = output.replace(token, "[credencial omitida]")
                print(output)
                assert result.returncode == 0, output
            finally:
                server.should_exit = True
                await asyncio.wait_for(running, timeout=12)
        workspaces = list((settings.data_dir / "edudownloader-jobs-v1").glob("job-*"))
        assert len(workspaces) == (6 if external else 5)
        for directory in workspaces:
            entries = list(directory.iterdir())
            assert len(entries) == 1 and entries[0].name in {"result.mp4", "result.mp3"}
        restarted = create_app(replace(settings, client_tokens=tokens), policy=origin[0])
        with TestClient(restarted) as client:
            response = client.get("/api/v1/jobs/" + workspaces[0].name[4:],
                                  headers={"Authorization": "Bearer " + tokens["app"]})
            assert response.status_code == 404
            assert not list((settings.data_dir / "edudownloader-jobs-v1").glob("job-*"))

    asyncio.run(roundtrip())
