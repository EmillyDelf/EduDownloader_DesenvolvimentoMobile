import asyncio
import socket

import httpx
import uvicorn

from app.main import create_app
from conftest import OWNER
from test_engine import BASE


def test_uvicorn_live_http_and_openapi(settings, origin):
    async def validate():
        application = create_app(settings, policy=origin[0])
        server = uvicorn.Server(uvicorn.Config(application, log_level="critical", access_log=False,
                                               proxy_headers=False, ws="none", lifespan="on"))
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            port = listener.getsockname()[1]
            running = asyncio.create_task(server.serve(sockets=[listener]))
            try:
                async with asyncio.timeout(8):
                    while not server.started:
                        if running.done():
                            running.result()
                            raise AssertionError("Service did not start")
                        await asyncio.sleep(0.05)
                async with httpx.AsyncClient(base_url=f"http://127.0.0.1:{port}", trust_env=False) as client:
                    health = await client.get(f"{BASE}/health", headers=OWNER)
                    assert health.status_code == 200 and health.json()["ready"]
                    spec = (await client.get("/openapi.json")).json()
                    endpoints = {"health", "media/analyze", "jobs", "jobs/{job_id}",
                                 "jobs/{job_id}/cancel", "jobs/{job_id}/file"}
                    assert {f"{BASE}/{path}" for path in endpoints} <= spec["paths"].keys()
                    assert spec["components"]["securitySchemes"]["HTTPBearer"]["scheme"] == "bearer"
                    result = await client.post(f"{BASE}/media/analyze", headers=OWNER,
                                               json={"url": "http://fixtures.test/combined.mp4"})
                    assert result.status_code == 200 and result.json()["options"][0]["id"] == "mp4-original"
            finally:
                server.should_exit = True
                await asyncio.wait_for(running, timeout=10)

    asyncio.run(validate())
