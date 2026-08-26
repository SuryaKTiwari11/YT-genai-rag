import os
from fastapi.testclient import TestClient

os.environ["GOOGLE_API_KEY"] = "test-key"
os.environ["ACCESS_CODE"] = "205442"

from backend.main import app

client = TestClient(app)


def test_ingest_requires_valid_access_code():
    response = client.post(
        "/ingest",
        json={
            "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "access_code": "wrong-code",
        },
    )
    assert response.status_code == 403
    assert "Invalid access code" in response.json()["detail"]


def test_ingest_allows_valid_access_code():
    response = client.post(
        "/ingest",
        json={
            "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "access_code": "205442",
        },
    )
    assert response.status_code in {200, 422}
