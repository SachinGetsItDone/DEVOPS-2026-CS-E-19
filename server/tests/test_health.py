from fastapi.testclient import TestClient

from core.gateway import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/")

    assert response.status_code == 200

    data = response.json()

    assert data["message"] == "Mock Interview Engine API is running"