from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_hello():
    response = client.get("/api/hello")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello from DocPilot backend"}


def test_cors_allows_configured_origin(monkeypatch):
    # Sanity check: this guards against silently breaking CORS again
    # (we shipped that bug once already during the Render deploy).
    response = client.get(
        "/api/hello",
        headers={"Origin": "http://localhost:3000"},
    )
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_cors_rejects_unconfigured_origin():
    response = client.get(
        "/api/hello",
        headers={"Origin": "https://evil.example.com"},
    )
    assert "access-control-allow-origin" not in response.headers
