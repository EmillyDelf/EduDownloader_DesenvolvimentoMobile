import hashlib
import json
import logging
from time import monotonic, sleep

import pytest

from app.plans import make_media
from app.security import OriginPolicy
from conftest import OTHER


BASE = "/api/v1"
TERMINAL = {"completed", "failed", "cancelled"}


def analyze(client, file):
    response = client.post(f"{BASE}/media/analyze", json={"url": f"http://fixtures.test/{file}"})
    assert response.status_code == 200, response.json()
    return response.json()


def start(client, analysis, option, key=None):
    response = client.post(f"{BASE}/jobs", json={"analysisId": analysis["analysisId"], "optionId": option},
                           headers={"Idempotency-Key": key} if key else {})
    assert response.status_code == 202, response.json()
    return response.json()


def wait_for(client, identifier, predicate, timeout=22):
    deadline = monotonic() + timeout
    observed = []
    while monotonic() < deadline:
        response = client.get(f"{BASE}/jobs/{identifier}")
        assert response.status_code == 200, response.json()
        job = response.json()
        observed.append(job["status"])
        if predicate(job):
            return job, observed
        if job["status"] in TERMINAL:
            pytest.fail(f"Task reached {job} before the expected state")
        sleep(0.08)
    pytest.fail(f"Task {identifier} did not reach the expected state: {observed[-6:]}")


def terminal(client, identifier):
    return wait_for(client, identifier, lambda job: job["status"] in TERMINAL)


def assert_result(client, identifier, fmt, option, size=None):
    finished, states = terminal(client, identifier)
    assert finished["status"] == "completed", finished
    assert finished["option"]["id"] == option
    file = finished["file"]
    assert file["format"] == fmt and file["sizeBytes"] > 0 and file["durationSeconds"] > 0
    assert file["downloadPath"] == f"{BASE}/jobs/{identifier}/file"
    response = client.get(file["downloadPath"])
    assert response.status_code == 200
    assert response.headers["content-type"] == file["mimeType"]
    assert hashlib.sha256(response.content).hexdigest() == response.headers["x-content-sha256"] == file["sha256"]
    if size:
        assert len(response.content) == size
    assert len(response.content) == file["sizeBytes"]
    partial = client.get(file["downloadPath"], headers={"Range": "bytes=0-15"})
    assert partial.status_code == 206 and partial.content == response.content[:16]
    print("EVIDENCE", json.dumps({key: value for key, value in file.items() if key != "downloadPath"}, ensure_ascii=False))
    return file, states, response.content


def test_health_and_real_downloads_are_identified_then_verified(api, media, origin):
    with api() as client:
        health = client.get(f"{BASE}/health").json()
        assert health["ready"], health
        assert set(health["engines"]) == {"yt-dlp", "Deno", "ffmpeg", "ffprobe"}
        for name, fmt in [("combined.mp4", "MP4"), ("original.mp3", "MP3")]:
            analysis = analyze(client, name)
            assert [option["format"] for option in analysis["options"]] == [fmt]
            assert not analysis["options"][0]["requiresProcessing"]
            assert "url" not in analysis["options"][0]
            assert origin[1].count(("GET", name)) == 0, origin[1]
            option = analysis["options"][0]["id"]
            job = start(client, analysis, option, key=f"download-{fmt}")
            assert job["status"] == "queued"
            restarted = start(client, analysis, option, key=f"download-{fmt}")
            assert restarted["id"] == job["id"]
            saved, states, received = assert_result(client, job["id"], fmt, option, (media / name).stat().st_size)
            assert received == (media / name).read_bytes()
            assert "processing" not in states
            assert saved["audioCodec"] == ("aac" if fmt == "MP4" else "mp3")
            assert saved["height"] == (180 if fmt == "MP4" else None)
            assert client.get(saved["downloadPath"], headers=OTHER).status_code == 404
            assert client.post(f"{BASE}/jobs/{job['id']}/cancel").json()["status"] == "completed"
            directory = client.app.state.manager.jobs[
                next(identifier for identifier in client.app.state.manager.jobs if str(identifier) == job["id"])
            ].directory
            assert list(directory.iterdir()) == [directory / f"result.{fmt.lower()}"]


def test_two_resolutions_mux_and_real_mp3_encoding(api, caplog):
    caplog.set_level(logging.INFO, logger="edudownloader")
    with api() as client:
        analysis = analyze(client, "sources.mpd")
        by_id = {option["id"]: option for option in analysis["options"]}
        assert set(by_id) == {"mp4-180p", "mp4-360p", "mp3-128", "mp3-192", "mp3-320"}, by_id
        assert by_id["mp4-360p"]["operation"] == "merge"
        assert by_id["mp4-360p"]["height"] == 360
        assert by_id["mp4-180p"]["height"] == 180
        assert analysis["durationSeconds"] == pytest.approx(2.4)
        combined = start(client, analysis, "mp4-360p")
        saved, _, _ = assert_result(client, combined["id"], "MP4", "mp4-360p")
        assert (saved["width"], saved["height"]) == (640, 360)
        assert (saved["videoCodec"], saved["audioCodec"]) == ("h264", "aac")
        assert saved["durationSeconds"] == pytest.approx(2.4, abs=0.15)
        conversion = start(client, analysis, "mp3-192")
        saved, _, _ = assert_result(client, conversion["id"], "MP3", "mp3-192")
        assert saved["videoCodec"] is None
        assert saved["audioCodec"] == "mp3"
        assert saved["bitrateKbps"] == pytest.approx(192, abs=8)
        assert saved["durationSeconds"] == pytest.approx(2.4, abs=0.15)
        messages = [record.getMessage() for record in caplog.records if f"job={conversion['id']}" in record.getMessage()]
        assert any(line.startswith("stream_transfer ") and "audio_codec=mp4a.40.2" in line
                   and "bytes=" in line and "average_bytes_per_second=" in line for line in messages)
        assert any(line.startswith("ffmpeg_conversion ") and "format=MP3 bitrate_kbps=192 seconds=" in line for line in messages)
        assert any(line.startswith("job_verification ") and "seconds=" in line for line in messages)
        assert all("fixtures.test" not in line for line in messages)


@pytest.mark.parametrize("channels,expected", [(2, "140"), (None, "258")])
def test_youtube_mp3_prefers_audio_without_downmix(settings, channels, expected):
    policy = OriginPolicy()
    source = policy.admit("https://www.youtube.com/watch?v=example")
    audio = {"ext": "m4a", "vcodec": "none", "acodec": "mp4a.40.2", "protocol": "https"}
    metadata = {
        "id": "example",
        "formats": [
            {**audio, "format_id": "140", "url": "https://fixture.googlevideo.com/stereo",
             "abr": 130, "audio_channels": channels, "filesize": 535702},
            {**audio, "format_id": "258", "url": "https://fixture.googlevideo.com/surround",
             "abr": 388, "audio_channels": 6, "filesize": 1603919},
            {**audio, "format_id": "blocked", "url": "https://invalid.test/stereo",
             "abr": 400, "audio_channels": 2},
        ],
    }
    media = make_media(metadata, source, policy, settings, {"libmp3lame"})
    plan = next(plan for plan in media.plans if plan.option.id == "mp3-192")
    assert plan.streams[0].id == expected
    assert plan.audio_bitrate == 192
    assert plan.option.requires_processing
