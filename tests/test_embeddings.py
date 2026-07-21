from app.ingestion.embeddings import generate_embedding


def test_generate_embedding_returns_correct_length():
    result = generate_embedding("hello world")

    assert isinstance(result, list)
    assert len(result) == 1536
    assert all(isinstance(v, float) for v in result)