def signup(client, email="sarah@acme.com", password="password123", name="Sarah", org_name="Acme Inc"):
    response = client.post(
        "/auth/signup",
        json={"name": name, "email": email, "password": password, "org_name": org_name},
    )
    return response.json()


def auth_headers(client, **signup_kwargs):
    token = signup(client, **signup_kwargs)["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestListThreads:
    def test_list_threads_requires_auth(self, client):
        response = client.get("/chat/threads")
        assert response.status_code == 401

    def test_list_threads_empty_for_new_org(self, client):
        headers = auth_headers(client)
        response = client.get("/chat/threads", headers=headers)
        assert response.status_code == 200
        assert response.json() == []


class TestCreateThread:
    def test_create_thread_requires_auth(self, client):
        response = client.post("/chat/threads", json={})
        assert response.status_code == 401

    def test_create_thread_with_default_title(self, client):
        headers = auth_headers(client)
        response = client.post("/chat/threads", headers=headers, json={})
        assert response.status_code == 201
        body = response.json()
        assert body["title"] == "New conversation"
        assert body["messages"] == []

    def test_created_thread_appears_in_list(self, client):
        headers = auth_headers(client)
        client.post("/chat/threads", headers=headers, json={})

        response = client.get("/chat/threads", headers=headers)

        assert len(response.json()) == 1

    def test_threads_are_isolated_per_org(self, client):
        org_a_headers = auth_headers(client, email="a@orga.com", org_name="Org A")
        org_b_headers = auth_headers(client, email="b@orgb.com", org_name="Org B")
        client.post("/chat/threads", headers=org_a_headers, json={})

        response = client.get("/chat/threads", headers=org_b_headers)

        assert response.json() == []


class TestSendMessage:
    def test_send_message_requires_auth(self, client):
        response = client.post("/chat/threads/some-id/messages", json={"content": "hi"})
        assert response.status_code == 401

    def test_send_message_to_unknown_thread_returns_404(self, client):
        headers = auth_headers(client)
        response = client.post("/chat/threads/does-not-exist/messages", headers=headers, json={"content": "hi"})
        assert response.status_code == 404

    def test_send_message_returns_the_assistant_reply(self, client, monkeypatch):
        monkeypatch.setattr(
            "app.routers.chat.answer_question",
            lambda question, org_id, db: ("The answer is 42.", [{"chunk_id": "c1", "doc_name": "doc.pdf", "page": 1, "snippet": "..."}]),
        )
        headers = auth_headers(client)
        thread_id = client.post("/chat/threads", headers=headers, json={}).json()["id"]

        response = client.post(
            f"/chat/threads/{thread_id}/messages", headers=headers, json={"content": "What is the answer?"}
        )

        assert response.status_code == 201
        body = response.json()
        assert body["role"] == "assistant"
        assert body["content"] == "The answer is 42."
        assert body["citations"] == [{"chunk_id": "c1", "doc_name": "doc.pdf", "page": 1, "snippet": "..."}]

    def test_send_message_persists_both_user_and_assistant_messages(self, client, monkeypatch):
        monkeypatch.setattr(
            "app.routers.chat.answer_question",
            lambda question, org_id, db: ("The answer is 42.", []),
        )
        headers = auth_headers(client)
        thread_id = client.post("/chat/threads", headers=headers, json={}).json()["id"]

        client.post(f"/chat/threads/{thread_id}/messages", headers=headers, json={"content": "What is the answer?"})

        thread = next(t for t in client.get("/chat/threads", headers=headers).json() if t["id"] == thread_id)
        assert [m["role"] for m in thread["messages"]] == ["user", "assistant"]
        assert thread["messages"][0]["content"] == "What is the answer?"
        assert thread["messages"][1]["content"] == "The answer is 42."

    def test_first_message_sets_the_thread_title(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.chat.answer_question", lambda question, org_id, db: ("answer", []))
        headers = auth_headers(client)
        thread_id = client.post("/chat/threads", headers=headers, json={}).json()["id"]

        client.post(f"/chat/threads/{thread_id}/messages", headers=headers, json={"content": "What is the onboarding process?"})

        thread = next(t for t in client.get("/chat/threads", headers=headers).json() if t["id"] == thread_id)
        assert thread["title"] == "What is the onboarding process?"

    def test_cannot_send_message_to_another_orgs_thread(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.chat.answer_question", lambda question, org_id, db: ("answer", []))
        org_a_headers = auth_headers(client, email="a@orga.com", org_name="Org A")
        org_b_headers = auth_headers(client, email="b@orgb.com", org_name="Org B")
        thread_id = client.post("/chat/threads", headers=org_a_headers, json={}).json()["id"]

        response = client.post(f"/chat/threads/{thread_id}/messages", headers=org_b_headers, json={"content": "hi"})

        assert response.status_code == 404

    def test_send_message_works_with_tracing_decorator_added(self, client, monkeypatch):
        # Regression guard: @observe() + propagate_attributes() must never
        # raise, even when Langfuse credentials are unset (the default in
        # tests/CI) — the SDK is documented to no-op silently in that case.
        monkeypatch.setattr(
            "app.routers.chat.answer_question",
            lambda question, org_id, db: ("The answer is 42.", []),
        )
        headers = auth_headers(client)
        thread_id = client.post("/chat/threads", headers=headers, json={}).json()["id"]

        response = client.post(
            f"/chat/threads/{thread_id}/messages", headers=headers, json={"content": "hello"}
        )

        assert response.status_code == 201
