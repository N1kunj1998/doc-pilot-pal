import pytest

from app.ingestion import ingest_document
from app.models import Chunk, Document, Org, User
from tests.conftest import fake_embedding


def _make_document(db_session, content_type="text/plain"):
    org = Org(name="Acme Inc")
    user = User(org=org, name="Sarah", email="sarah@acme.com", password_hash="x")
    db_session.add(org)
    db_session.add(user)
    db_session.commit()

    document = Document(
        org_id=org.id,
        uploaded_by=user.id,
        name="handbook.txt",
        size=100,
        status="processing",
        storage_path="orgs/doc/handbook.txt",
    )
    db_session.add(document)
    db_session.commit()
    return document


class TestIngestDocument:
    def test_successful_ingestion_creates_chunks_and_marks_indexed(self, db_session, monkeypatch):
        monkeypatch.setattr(
            "app.ingestion.generate_embeddings",
            lambda texts: [fake_embedding(0.1, 0.2, 0.3) for _ in texts],
        )
        document = _make_document(db_session)

        ingest_document(document, b"Hello world, this is the document body.", "text/plain", db_session)

        assert document.status == "indexed"
        chunks = db_session.query(Chunk).filter(Chunk.document_id == document.id).all()
        assert len(chunks) == 1
        assert chunks[0].content == "Hello world, this is the document body."
        # pytest.approx, not exact equality: real pgvector stores
        # embeddings as float32, so a value round-tripped through real
        # Postgres won't be bit-exact to the float64 literal used here.
        assert chunks[0].embedding == pytest.approx(fake_embedding(0.1, 0.2, 0.3))

    def test_chunks_each_get_their_own_embedding(self, db_session, monkeypatch):
        captured = {}

        def fake_generate_embeddings(texts):
            captured["texts"] = texts
            return [fake_embedding(float(i)) for i in range(len(texts))]

        monkeypatch.setattr("app.ingestion.generate_embeddings", fake_generate_embeddings)
        monkeypatch.setattr("app.ingestion.chunk_text", lambda text, **kw: ["chunk a", "chunk b"])
        document = _make_document(db_session)

        ingest_document(document, b"irrelevant", "text/plain", db_session)

        assert captured["texts"] == ["chunk a", "chunk b"]
        chunks = db_session.query(Chunk).filter(Chunk.document_id == document.id).order_by(Chunk.content).all()
        assert [c.content for c in chunks] == ["chunk a", "chunk b"]
        assert chunks[0].embedding == pytest.approx(fake_embedding(0.0))
        assert chunks[1].embedding == pytest.approx(fake_embedding(1.0))

    def test_empty_extracted_text_marks_indexed_with_no_chunks(self, db_session, monkeypatch):
        monkeypatch.setattr("app.ingestion.generate_embeddings", lambda texts: [fake_embedding(0.1) for _ in texts])
        document = _make_document(db_session)

        ingest_document(document, b"   ", "text/plain", db_session)

        assert document.status == "indexed"
        assert db_session.query(Chunk).filter(Chunk.document_id == document.id).count() == 0

    def test_extraction_failure_marks_failed_without_crashing(self, db_session):
        document = _make_document(db_session, content_type="application/x-msdownload")

        ingest_document(document, b"not a real format", "application/x-msdownload", db_session)

        assert document.status == "failed"
        assert db_session.query(Chunk).filter(Chunk.document_id == document.id).count() == 0

    def test_embedding_failure_marks_failed_without_crashing(self, db_session, monkeypatch):
        def boom(texts):
            raise RuntimeError("OpenAI is down")

        monkeypatch.setattr("app.ingestion.generate_embeddings", boom)
        document = _make_document(db_session)

        ingest_document(document, b"Hello world", "text/plain", db_session)

        assert document.status == "failed"
        assert db_session.query(Chunk).filter(Chunk.document_id == document.id).count() == 0

    def test_text_plain_chunks_have_no_page_number(self, db_session, monkeypatch):
        monkeypatch.setattr("app.ingestion.generate_embeddings", lambda texts: [fake_embedding(0.1) for _ in texts])
        document = _make_document(db_session)

        ingest_document(document, b"Hello world", "text/plain", db_session)

        chunks = db_session.query(Chunk).filter(Chunk.document_id == document.id).all()
        assert all(c.page_number is None for c in chunks)

    def test_pdf_chunks_are_tagged_with_their_source_page(self, db_session, monkeypatch):
        import io

        from pypdf import PdfReader, PdfWriter
        from reportlab.pdfgen import canvas

        def pdf_page_with_text(text):
            buf = io.BytesIO()
            c = canvas.Canvas(buf)
            c.drawString(50, 100, text)
            c.save()
            buf.seek(0)
            return PdfReader(buf).pages[0]

        writer = PdfWriter()
        for label in ("First page content", "Second page content"):
            page = writer.add_blank_page(width=200, height=200)
            page.merge_page(pdf_page_with_text(label))
        buf = io.BytesIO()
        writer.write(buf)
        pdf_bytes = buf.getvalue()

        monkeypatch.setattr("app.ingestion.generate_embeddings", lambda texts: [fake_embedding(0.1) for _ in texts])
        document = _make_document(db_session, content_type="application/pdf")

        ingest_document(document, pdf_bytes, "application/pdf", db_session)

        chunks = db_session.query(Chunk).filter(Chunk.document_id == document.id).order_by(Chunk.page_number).all()
        assert [c.page_number for c in chunks] == [1, 2]
        assert "First page" in chunks[0].content
        assert "Second page" in chunks[1].content
