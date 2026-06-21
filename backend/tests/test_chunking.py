from app.chunking import chunk_text


class TestChunkText:
    def test_returns_single_chunk_for_short_text(self):
        chunks = chunk_text("Hello world.", chunk_size=1000, overlap=100)
        assert chunks == ["Hello world."]

    def test_splits_long_text_into_multiple_chunks(self):
        text = "a" * 2500
        chunks = chunk_text(text, chunk_size=1000, overlap=100)
        assert len(chunks) > 1
        assert all(len(c) <= 1000 for c in chunks)

    def test_consecutive_chunks_overlap(self):
        text = "0123456789" * 250  # 2500 chars
        chunks = chunk_text(text, chunk_size=1000, overlap=100)
        assert chunks[0][-100:] == chunks[1][:100]

    def test_empty_text_returns_no_chunks(self):
        assert chunk_text("", chunk_size=1000, overlap=100) == []

    def test_whitespace_only_text_returns_no_chunks(self):
        assert chunk_text("   \n\t  ", chunk_size=1000, overlap=100) == []
