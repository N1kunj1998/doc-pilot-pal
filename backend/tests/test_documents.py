from tests.conftest import fake_embedding


def signup(client, email="sarah@acme.com", password="password123", name="Sarah", org_name="Acme Inc"):
    response = client.post(
        "/auth/signup",
        json={"name": name, "email": email, "password": password, "org_name": org_name},
    )
    return response.json()


def auth_headers(client, **signup_kwargs):
    token = signup(client, **signup_kwargs)["access_token"]
    return {"Authorization": f"Bearer {token}"}


def mock_upload(monkeypatch):
    monkeypatch.setattr("app.routers.documents.upload_file", lambda *a, **kw: None)


def mock_embeddings(monkeypatch):
    monkeypatch.setattr("app.ingestion.generate_embeddings", lambda texts: [fake_embedding(0.1, 0.2, 0.3) for _ in texts])


class TestListDocuments:
    def test_list_documents_requires_auth(self, client):
        response = client.get("/documents")
        assert response.status_code == 401

    def test_list_documents_empty_for_new_org(self, client):
        headers = auth_headers(client)

        response = client.get("/documents", headers=headers)

        assert response.status_code == 200
        assert response.json() == []


class TestUploadDocument:
    def test_upload_requires_auth(self, client):
        response = client.post("/documents", files={"file": ("test.pdf", b"fake pdf content", "application/pdf")})
        assert response.status_code == 401

    def test_upload_creates_and_indexes_the_document(self, client, monkeypatch):
        uploaded = {}
        monkeypatch.setattr(
            "app.routers.documents.upload_file",
            lambda key, content, content_type: uploaded.update(key=key, content=content, content_type=content_type),
        )
        mock_embeddings(monkeypatch)
        headers = auth_headers(client)

        response = client.post(
            "/documents",
            headers=headers,
            files={"file": ("handbook.txt", b"Hello, this is the handbook.", "text/plain")},
        )

        assert response.status_code == 201
        body = response.json()
        assert body["name"] == "handbook.txt"
        assert body["size"] == len(b"Hello, this is the handbook.")
        assert body["status"] == "indexed"
        # actually called the storage layer with the real file bytes
        assert uploaded["content"] == b"Hello, this is the handbook."
        assert uploaded["content_type"] == "text/plain"

    def test_upload_marks_failed_when_ingestion_fails_but_still_returns_201(self, client, monkeypatch):
        mock_upload(monkeypatch)

        def boom(texts):
            raise RuntimeError("OpenAI is down")

        monkeypatch.setattr("app.ingestion.generate_embeddings", boom)
        headers = auth_headers(client)

        response = client.post(
            "/documents",
            headers=headers,
            files={"file": ("handbook.txt", b"Hello, this is the handbook.", "text/plain")},
        )

        assert response.status_code == 201
        assert response.json()["status"] == "failed"

    def test_uploaded_document_appears_in_list(self, client, monkeypatch):
        mock_upload(monkeypatch)
        mock_embeddings(monkeypatch)
        headers = auth_headers(client)
        client.post(
            "/documents", headers=headers, files={"file": ("handbook.txt", b"content", "text/plain")}
        )

        response = client.get("/documents", headers=headers)

        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["name"] == "handbook.txt"

    def test_documents_are_isolated_per_org(self, client, monkeypatch):
        mock_upload(monkeypatch)
        mock_embeddings(monkeypatch)
        org_a_headers = auth_headers(client, email="a@orga.com", org_name="Org A")
        org_b_headers = auth_headers(client, email="b@orgb.com", org_name="Org B")
        client.post(
            "/documents",
            headers=org_a_headers,
            files={"file": ("org-a-doc.txt", b"content", "text/plain")},
        )

        response = client.get("/documents", headers=org_b_headers)

        assert response.status_code == 200
        assert response.json() == []

    def test_upload_rejects_file_too_large(self, client, monkeypatch):
        mock_upload(monkeypatch)
        headers = auth_headers(client)
        oversized_content = b"x" * (26 * 1024 * 1024)  # over the 25MB limit

        response = client.post(
            "/documents",
            headers=headers,
            files={"file": ("big.pdf", oversized_content, "application/pdf")},
        )

        assert response.status_code == 413

    def test_upload_rejects_disallowed_content_type(self, client, monkeypatch):
        mock_upload(monkeypatch)
        headers = auth_headers(client)

        response = client.post(
            "/documents",
            headers=headers,
            files={"file": ("script.exe", b"content", "application/x-msdownload")},
        )

        assert response.status_code == 415
