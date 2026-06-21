from openai import OpenAI

from app.config import settings

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536


def get_openai_client() -> OpenAI:
    return OpenAI(api_key=settings.openai_api_key)


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    response = get_openai_client().embeddings.create(model=EMBEDDING_MODEL, input=texts)
    return [item.embedding for item in response.data]
