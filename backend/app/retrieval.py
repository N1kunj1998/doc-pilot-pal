from sqlalchemy.orm import Session

from app.embeddings import generate_embeddings
from app.models import Chunk, Document


def embed_query(query: str) -> list[float]:
    return generate_embeddings([query])[0]


def find_relevant_chunks(query_embedding: list[float], org_id: str, db: Session, limit: int = 5) -> list[Chunk]:
    base_query = (
        db.query(Chunk).join(Document, Chunk.document_id == Document.id).filter(Document.org_id == org_id)
    )

    if db.bind.dialect.name == "postgresql":
        return base_query.order_by(Chunk.embedding.cosine_distance(query_embedding)).limit(limit).all()

    # SQLite (tests/local dev) has no pgvector distance operator — fall
    # back to computing cosine similarity in Python. Fine at test/dev
    # data volumes; production always takes the real pgvector path above.
    chunks = base_query.all()
    chunks.sort(key=lambda c: _cosine_similarity(c.embedding, query_embedding), reverse=True)
    return chunks[:limit]


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5
    if not norm_a or not norm_b:
        return 0.0
    return dot / (norm_a * norm_b)
