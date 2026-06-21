from app.embeddings import EMBEDDING_DIM, EMBEDDING_MODEL, generate_embeddings


class FakeEmbeddingData:
    def __init__(self, embedding):
        self.embedding = embedding


class FakeEmbeddingsResponse:
    def __init__(self, vectors):
        self.data = [FakeEmbeddingData(v) for v in vectors]


class FakeEmbeddingsAPI:
    def __init__(self, vectors):
        self._vectors = vectors
        self.calls = []

    def create(self, model, input):
        self.calls.append({"model": model, "input": input})
        return FakeEmbeddingsResponse(self._vectors)


class FakeOpenAIClient:
    def __init__(self, vectors):
        self.embeddings = FakeEmbeddingsAPI(vectors)


class TestGenerateEmbeddings:
    def test_calls_openai_with_the_configured_model_and_returns_vectors(self, monkeypatch):
        fake_vectors = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
        fake_client = FakeOpenAIClient(fake_vectors)
        monkeypatch.setattr("app.embeddings.get_openai_client", lambda: fake_client)

        result = generate_embeddings(["chunk one", "chunk two"])

        assert result == fake_vectors
        assert fake_client.embeddings.calls == [{"model": EMBEDDING_MODEL, "input": ["chunk one", "chunk two"]}]

    def test_returns_empty_list_for_empty_input_without_calling_the_api(self, monkeypatch):
        fake_client = FakeOpenAIClient([])
        monkeypatch.setattr("app.embeddings.get_openai_client", lambda: fake_client)

        result = generate_embeddings([])

        assert result == []
        assert fake_client.embeddings.calls == []

    def test_embedding_dim_matches_the_configured_model(self):
        assert EMBEDDING_MODEL == "text-embedding-3-small"
        assert EMBEDDING_DIM == 1536
