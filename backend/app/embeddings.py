from app.openai_client import get_openai_client

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    response = get_openai_client().embeddings.create(model=EMBEDDING_MODEL, input=texts)
    return [item.embedding for item in response.data]
