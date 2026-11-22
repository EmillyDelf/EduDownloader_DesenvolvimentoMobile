import asyncio
import logging
import socket
from uuid import uuid4

import pytest

from app.errors import ServiceError
from app.security import OriginPolicy, public_ip
from conftest import OTHER
from test_engine import BASE, analyze, start


@pytest.mark.parametrize("address", [
    "0.0.0.0", "127.0.0.1", "10.3.4.5", "172.16.3.4", "192.168.1.1", "169.254.169.254",
    "100.64.0.1", "192.0.2.1", "198.18.0.1", "224.0.0.1", "255.255.255.255",
    "::", "::1", "fc00::1", "fe80::1", "ff00::1", "2001:db8::1",
    "::ffff:127.0.0.1", "2002:7f00:1::", "64:ff9b::7f00:1",
])
def test_private_and_reserved_address_policy(address):
    assert not public_ip(address)


@pytest.mark.parametrize("url", [
    "file:///etc/passwd", "ftp://www.youtube.com/foo", "https://", "http://127.0.0.1/",
    "http://[::1]/", "http://localhost/", "http://169.254.169.254/", "http://www.youtube.com:8080/",
    "https://user:secret@www.youtube.com/watch", "https://www.youtube.com@fixtures.test/",
    "https://www.youtube.com\\ignored", "https://www.youtube.com/a\r\nvalue",
    "https://www.youtube.com.evil.test/", "http://2130706433/", "http://127.000.000.001/",
])
def test_url_policy_rejects_untrusted_destinations(url):
    with pytest.raises(ServiceError):
        OriginPolicy(("fixtures.test",)).admit(url)


def test_dns_checks_the_whole_answer_and_connects_only_to_pinned_numeric_address(monkeypatch):
    async def verify():
        loop = asyncio.get_running_loop()
        records = [("93.184.215.14", 80), ("127.0.0.1", 80)]
        calls = []

        async def dns(host, port, **kwargs):
            assert host == "files.example."
            return [(socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", addr) for addr in records]

        async def connect(ip, port, *, flags, limit):
            calls.append((ip, port, flags))
            return "reader", "writer"

        monkeypatch.setattr(loop, "getaddrinfo", dns)
        monkeypatch.setattr(asyncio, "open_connection", connect)
        policy = OriginPolicy(("files.example",))
        source = policy.admit("http://files.example/media.mp4")
        with pytest.raises(ServiceError, match="DESTINATION_BLOCKED"):
            await policy.connect(source, source.host, 80)
        assert calls == []
        records[:] = [("93.184.215.14", 80)]
        assert await policy.connect(source, source.host, 80) == ("reader", "writer")
        assert calls == [("93.184.215.14", 80, socket.AI_NUMERICHOST)]
        records[:] = [("10.5.0.1", 80)]
        with pytest.raises(ServiceError, match="DESTINATION_BLOCKED"):
            await policy.connect(source, source.host, 80)
        assert len(calls) == 1

    asyncio.run(verify())


def test_authorization_isolation_redirect_validation_errors_and_redacted_logs(api, origin, caplog):
    caplog.set_level(logging.INFO)
    with api() as client:
        assert client.get(f"{BASE}/health", headers={"Authorization": ""}).status_code == 401
        assert client.get(f"{BASE}/health", headers={"Authorization": "Bearer " + "z" * 40}).status_code == 401
        target = f"{BASE}/media/analyze"
        response = client.post(target, json={"url": "http://fixtures.test/redirect.mp4?secret=credential-example"})
        assert response.status_code == 403 and response.json()["error"]["code"] == "DESTINATION_BLOCKED"
        assert ("HEAD", "forbidden.mp4") not in origin[1]
        missing = client.post(target, json={"url": "http://fixtures.test/unavailable.mp4?token=sensitive-example"})
        assert missing.status_code == 404
        denied = client.post(target, json={"url": "http://fixtures.test/private.mp4?token=sensitive-example"})
        assert denied.status_code == 403
        assert "sensitive-example" not in denied.text + missing.text + caplog.text
        invalid = client.post(target, json={"url": {"token": "do-not-reflect"}})
        assert invalid.status_code == 422
        assert "do-not-reflect" not in invalid.text
        assert client.post(target, content="x" * 13000).status_code == 413
        oversized = client.post(target, json={"url": "http://fixtures.test/large.mp4"})
        assert oversized.status_code == 413 and oversized.json()["error"]["code"] == "SIZE_LIMIT"
        assert ("GET", "large.mp4") not in origin[1]

        analysis = analyze(client, "combined.mp4")
        payload = {"analysisId": analysis["analysisId"], "optionId": "mp4-original"}
        assert client.post(f"{BASE}/jobs", json=payload, headers=OTHER).status_code == 404
        assert client.post(f"{BASE}/jobs", json={**payload, "optionId": "invalid-option"}).status_code == 422
        job = start(client, analysis, "mp4-original", key="one-request")
        conflict = client.post(f"{BASE}/jobs", json={**payload, "analysisId": str(uuid4())},
                               headers={"Idempotency-Key": "one-request"})
        assert conflict.status_code == 409
        assert client.get(f"{BASE}/jobs/{job['id']}", headers=OTHER).status_code == 404
        assert client.post(f"{BASE}/jobs/{job['id']}/cancel", headers=OTHER).status_code == 404
        assert client.get(f"{BASE}/jobs/{job['id']}/file", headers=OTHER).status_code == 404
        for url in (f"{BASE}/jobs/..%2F..%2Fpackage.json/file", f"{BASE}/jobs/{uuid4()}/file"):
            response = client.get(url)
            assert response.status_code in {404, 422} and "node_modules" not in response.text


def test_rate_is_per_client_and_engine_failure_is_clear(api, tmp_path):
    with api(deno=str(tmp_path / "missing-deno.exe"), rate_per_minute=4) as client:
        health = client.get(f"{BASE}/health").json()
        assert health["ready"] is False and health["missing"] == ["Deno"]
        response = client.post(f"{BASE}/media/analyze", json={"url": "http://fixtures.test/combined.mp4"})
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "ENGINE_UNAVAILABLE"
        assert "missing-deno" not in response.text
        assert client.get(f"{BASE}/health").status_code == 200
        assert client.get(f"{BASE}/health").status_code == 200
        limited = client.get(f"{BASE}/health")
        assert limited.status_code == 429 and int(limited.headers["retry-after"]) > 0
        assert client.get(f"{BASE}/health", headers=OTHER).status_code == 200
