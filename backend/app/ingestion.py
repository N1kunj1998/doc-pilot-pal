from sqlalchemy.orm import Session

from app.chunking import chunk_text
from app.embeddings import generate_embeddings
from app.extraction import extract_text
from app.models import Chunk, Document


def ingest_document(document: Document, content: bytes, content_type: str, db: Session) -> None:
    try:
        text = extract_text(content, content_type)
        chunks = chunk_text(text)
        embeddings = generate_embeddings(chunks)
        for chunk_content, embedding in zip(chunks, embeddings):
            db.add(Chunk(document_id=document.id, content=chunk_content, embedding=embedding))
        document.status = "indexed"
    except Exception:
        # A failure here (bad file format, embedding API down, etc.) must
        # not crash the upload request — the file itself uploaded fine.
        document.status = "failed"
    db.commit()
