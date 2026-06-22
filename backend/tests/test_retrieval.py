from app.models import Chunk, Document, Org, User
from app.retrieval import embed_query, find_relevant_chunks
from tests.conftest import fake_embedding


def _make_org_with_document(db_session, org_name="Acme Inc"):
    org = Org(name=org_name)
    user = User(org=org, name="Sarah", email=f"sarah-{org_name}@acme.com", password_hash="x")
    db_session.add(org)
    db_session.add(user)
    db_session.commit()

    document = Document(
        org_id=org.id,
        uploaded_by=user.id,
        name="handbook.txt",
        size=100,
        status="indexed",
        storage_path="orgs/doc/handbook.txt",
    )
    db_session.add(document)
    db_session.commit()
    return org, document


def _add_chunk(db_session, document, content, embedding, page_number=None):
    chunk = Chunk(document_id=document.id, content=content, embedding=embedding, page_number=page_number)
    db_session.add(chunk)
    db_session.commit()
    return chunk


class TestEmbedQuery:
    def test_embeds_the_query_text_via_generate_embeddings(self, monkeypatch):
        captured = {}

        def fake_generate_embeddings(texts):
            captured["texts"] = texts
            return [fake_embedding(0.5, 0.5, 0.5)]

        monkeypatch.setattr("app.retrieval.generate_embeddings", fake_generate_embeddings)

        result = embed_query("What is the onboarding process?")

        assert captured["texts"] == ["What is the onboarding process?"]
        assert result == fake_embedding(0.5, 0.5, 0.5)


class TestFindRelevantChunks:
    def test_returns_chunks_ordered_by_similarity_to_the_query(self, db_session):
        org, document = _make_org_with_document(db_session)
        close = _add_chunk(db_session, document, "close match", fake_embedding(1.0, 0.0, 0.0))
        far = _add_chunk(db_session, document, "far match", fake_embedding(0.0, 1.0, 0.0))
        _add_chunk(db_session, document, "opposite match", fake_embedding(-1.0, 0.0, 0.0))

        results = find_relevant_chunks(fake_embedding(0.9, 0.1, 0.0), org.id, db_session, limit=2)

        assert [c.id for c in results] == [close.id, far.id]

    def test_never_returns_chunks_from_another_org(self, db_session):
        org_a, doc_a = _make_org_with_document(db_session, org_name="Org A")
        org_b, doc_b = _make_org_with_document(db_session, org_name="Org B")
        _add_chunk(db_session, doc_a, "org a content", fake_embedding(1.0, 0.0, 0.0))
        org_b_chunk = _add_chunk(db_session, doc_b, "org b content", fake_embedding(1.0, 0.0, 0.0))

        results = find_relevant_chunks(fake_embedding(1.0, 0.0, 0.0), org_b.id, db_session, limit=10)

        assert [c.id for c in results] == [org_b_chunk.id]

    def test_respects_the_limit(self, db_session):
        org, document = _make_org_with_document(db_session)
        for i in range(5):
            _add_chunk(db_session, document, f"chunk {i}", fake_embedding(1.0, 0.0, 0.0))

        results = find_relevant_chunks(fake_embedding(1.0, 0.0, 0.0), org.id, db_session, limit=3)

        assert len(results) == 3
