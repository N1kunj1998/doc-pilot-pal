from sqlalchemy.orm import Session

from app.chunking import chunk_text
from app.embeddings import generate_embeddings
from app.extraction import extract_pages
from app.models import Chunk, Document


def ingest_document(document: Document, content: bytes, content_type: str, db: Session) -> None:
    try:
        pages = extract_pages(content, content_type)
        chunk_records = [
            (page_number, chunk_content)
            for page_number, page_text in pages
            for chunk_content in chunk_text(page_text)
        ]

        embeddings = generate_embeddings([content for _, content in chunk_records])
        for (page_number, chunk_content), embedding in zip(chunk_records, embeddings):
            db.add(
                Chunk(
                    document_id=document.id,
                    content=chunk_content,
                    embedding=embedding,
                    page_number=page_number,
                )
            )
        document.status = "indexed"
    except Exception:
        # A failure here (bad file format, embedding API down, etc.) must
        # not crash the upload request — the file itself uploaded fine.
        document.status = "failed"
    db.commit()
