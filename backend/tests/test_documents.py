def signup(client, email="sarah@acme.com", password="password123", name="Sarah", org_name="Acme Inc"):
    response = client.post(
        "/auth/signup",
        json={"name": name, "email": email, "password": password, "org_name": org_name},
    )
    return response.json()


def auth_headers(client, **signup_kwargs):
    token = signup(client, **signup_kwargs)["access_token"]
    return {"Authorization": f"Bearer {token}"}


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

    def test_upload_creates_document_with_processing_status(self, client, monkeypatch):
        uploaded = {}
        monkeypatch.setattr(
            "app.routers.documents.upload_file",
            lambda key, content, content_type: uploaded.update(key=key, content=content, content_type=content_type),
        )
        headers = auth_headers(client)

        response = client.post(
            "/documents",
            headers=headers,
            files={"file": ("handbook.pdf", b"fake pdf content", "application/pdf")},
        )

        assert response.status_code == 201
        body = response.json()
        assert body["name"] == "handbook.pdf"
        assert body["size"] == len(b"fake pdf content")
        assert body["status"] == "processing"
        # actually called the storage layer with the real file bytes
        assert uploaded["content"] == b"fake pdf content"
        assert uploaded["content_type"] == "application/pdf"

    def test_uploaded_document_appears_in_list(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.documents.upload_file", lambda *a, **kw: None)
        headers = auth_headers(client)
        client.post(
            "/documents", headers=headers, files={"file": ("handbook.pdf", b"content", "application/pdf")}
        )

        response = client.get("/documents", headers=headers)

        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["name"] == "handbook.pdf"

    def test_documents_are_isolated_per_org(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.documents.upload_file", lambda *a, **kw: None)
        org_a_headers = auth_headers(client, email="a@orga.com", org_name="Org A")
        org_b_headers = auth_headers(client, email="b@orgb.com", org_name="Org B")
        client.post(
            "/documents",
            headers=org_a_headers,
            files={"file": ("org-a-doc.pdf", b"content", "application/pdf")},
        )

        response = client.get("/documents", headers=org_b_headers)

        assert response.status_code == 200
        assert response.json() == []

    def test_upload_rejects_file_too_large(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.documents.upload_file", lambda *a, **kw: None)
        headers = auth_headers(client)
        oversized_content = b"x" * (26 * 1024 * 1024)  # over the 25MB limit

        response = client.post(
            "/documents",
            headers=headers,
            files={"file": ("big.pdf", oversized_content, "application/pdf")},
        )

        assert response.status_code == 413

    def test_upload_rejects_disallowed_content_type(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.documents.upload_file", lambda *a, **kw: None)
        headers = auth_headers(client)

        response = client.post(
            "/documents",
            headers=headers,
            files={"file": ("script.exe", b"content", "application/x-msdownload")},
        )

        assert response.status_code == 415
