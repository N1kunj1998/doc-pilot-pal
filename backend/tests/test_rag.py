from app.models import Chunk, Document, Org, User
from app.rag import answer_question
from tests.conftest import fake_embedding


def _make_org_with_document(db_session):
    org = Org(name="Acme Inc")
    user = User(org=org, name="Sarah", email="sarah@acme.com", password_hash="x")
    db_session.add(org)
    db_session.add(user)
    db_session.commit()

    document = Document(
        org_id=org.id,
        uploaded_by=user.id,
        name="Onboarding Guide.pdf",
        size=100,
        status="indexed",
        storage_path="orgs/doc/onboarding.pdf",
    )
    db_session.add(document)
    db_session.commit()
    return org, document


def _add_chunk(db_session, document, content, embedding, page_number=None):
    chunk = Chunk(document_id=document.id, content=content, embedding=embedding, page_number=page_number)
    db_session.add(chunk)
    db_session.commit()
    return chunk


class FakeChoice:
    def __init__(self, content):
        self.message = type("Message", (), {"content": content})()


class FakeChatCompletionResponse:
    def __init__(self, content):
        self.choices = [FakeChoice(content)]


class FakeChatCompletionsAPI:
    def __init__(self, answer):
        self._answer = answer
        self.calls = []

    def create(self, model, messages):
        self.calls.append({"model": model, "messages": messages})
        return FakeChatCompletionResponse(self._answer)


class FakeOpenAIClient:
    def __init__(self, answer):
        self.chat = type("Chat", (), {"completions": FakeChatCompletionsAPI(answer)})()


class TestAnswerQuestion:
    def test_returns_a_real_fallback_when_no_chunks_exist(self, db_session, monkeypatch):
        org, _ = _make_org_with_document(db_session)
        monkeypatch.setattr("app.rag.embed_query", lambda q: fake_embedding(1.0, 0.0, 0.0))

        answer, citations = answer_question("What is the onboarding process?", org.id, db_session)

        assert citations == []
        assert "couldn't find" in answer.lower() or "don't know" in answer.lower()

    def test_answers_using_retrieved_chunks_and_returns_real_citations(self, db_session, monkeypatch):
        org, document = _make_org_with_document(db_session)
        chunk = _add_chunk(
            db_session, document, "New hires get a laptop on day one.", fake_embedding(1.0, 0.0, 0.0), page_number=3
        )

        monkeypatch.setattr("app.rag.embed_query", lambda q: fake_embedding(1.0, 0.0, 0.0))
        fake_client = FakeOpenAIClient("New hires receive a laptop on their first day. [1]")
        monkeypatch.setattr("app.rag.get_openai_client", lambda: fake_client)

        answer, citations = answer_question("What do new hires get?", org.id, db_session)

        assert answer == "New hires receive a laptop on their first day. [1]"
        assert citations == [
            {
                "chunk_id": chunk.id,
                "doc_name": "Onboarding Guide.pdf",
                "page": 3,
                "snippet": "New hires get a laptop on day one.",
            }
        ]
        # the retrieved chunk's content was actually included in the prompt
        call = fake_client.chat.completions.calls[0]
        assert call["model"] == "gpt-4o-mini"
        assert any("laptop on day one" in m["content"] for m in call["messages"])
        assert any("What do new hires get?" in m["content"] for m in call["messages"])

    def test_only_retrieves_chunks_from_the_requesting_org(self, db_session, monkeypatch):
        org_a, doc_a = _make_org_with_document(db_session)
        org_b = Org(name="Org B")
        user_b = User(org=org_b, name="Ben", email="ben@orgb.com", password_hash="x")
        db_session.add(org_b)
        db_session.add(user_b)
        db_session.commit()
        doc_b = Document(
            org_id=org_b.id, uploaded_by=user_b.id, name="org-b.pdf", size=10, status="indexed", storage_path="x"
        )
        db_session.add(doc_b)
        db_session.commit()
        _add_chunk(db_session, doc_b, "org b secret content", fake_embedding(1.0, 0.0, 0.0))

        monkeypatch.setattr("app.rag.embed_query", lambda q: fake_embedding(1.0, 0.0, 0.0))

        answer, citations = answer_question("anything?", org_a.id, db_session)

        assert citations == []

    def test_runs_without_error_when_decorated_for_tracing(self, db_session, monkeypatch):
        # Regression guard: @observe() must never raise, even when Langfuse
        # credentials are unset (the default in tests/CI) — the SDK is
        # documented to no-op silently in that case.
        org, _ = _make_org_with_document(db_session)
        monkeypatch.setattr("app.rag.embed_query", lambda q: fake_embedding(1.0, 0.0, 0.0))

        answer, citations = answer_question("anything?", org.id, db_session)

        assert citations == []
