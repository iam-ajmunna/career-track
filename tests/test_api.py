import os
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///./data/test-career-track.db"
os.environ["AI_ENABLED"] = "false"
os.environ["SECRET_KEY"] = "test-only-secret-key"

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def setup_module():
    Path("data/test-career-track.db").unlink(missing_ok=True)


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_account_profile_and_session():
    email = "test-student@example.com"
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "a-strong-test-password", "display_name": "Test Student"},
    )
    assert response.status_code == 200
    assert "career_track_session" in response.cookies

    response = client.get("/api/me")
    assert response.status_code == 200
    assert response.json()["user"]["email"] == email

    response = client.put(
        "/api/profile",
        json={
            "nationality": "Bangladeshi",
            "degree": "BSc in Computer Science",
            "cgpa": "3.74 / 4.00",
            "fields": ["Artificial Intelligence", "Computer Vision"],
        },
    )
    assert response.status_code == 200
    profile = response.json()
    assert profile["nationality"] == "Bangladeshi"
    assert profile["fields"][0] == "Artificial Intelligence"

    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    assert response.cookies.get("career_track_session") is None
