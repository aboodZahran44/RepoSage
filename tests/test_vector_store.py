from qdrant_client.models import Filter, FieldCondition, MatchValue, FilterSelector

from app.ingestion.code_parser import CodeChunk
from app.ingestion.vector_store import store_chunks, ensure_collection_exists, _client, COLLECTION_NAME


def test_store_chunks_stores_correct_count():
    ensure_collection_exists()

    sample_chunks = [
        CodeChunk(
            file_path="sample.py",
            chunk_type="function",
            symbol_name="test_func",
            start_line=1,
            end_line=3,
            raw_code="def test_func():\n    return True",
        )
    ]

    count = store_chunks(sample_chunks, repo_id="test-repo")

    assert count == 1

    # Clean up: remove the test point so it doesn't pollute real data
    _client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=FilterSelector(
            filter=Filter(
                must=[FieldCondition(key="repo_id", match=MatchValue(value="test-repo"))]
            )
        ),
    )