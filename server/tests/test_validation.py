from fastapi.testclient import TestClient

from core.gateway import app

client = TestClient(app)


def test_interview_turn_without_input():
    response = client.post(
        "/api/interview/turn",
        data={}
    )

    assert response.status_code == 200

    data = response.json()

    assert "error" in data


def test_invalid_api_route():
    response = client.get("/api/invalid-route")

    assert response.status_code == 404