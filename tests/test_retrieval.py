from app.ingestion.code_parser import CodeChunk
from app.ingestion.retrieval import retrieve
from app.ingestion.vector_store import _client, COLLECTION_NAME, store_chunks
from qdrant_client.models import Filter, FieldCondition, MatchValue, FilterSelector

TEST_REPO_ID = "test-retrieval-repo"


def test_retrieve_returns_relevant_results():
    # Arrange: store known sample chunks specifically for this test
    sample_chunks = [
        CodeChunk(
            file_path="ssl_utils.py",
            chunk_type="function",
            symbol_name="verify_ssl_certificate",
            start_line=1,
            end_line=5,
            raw_code="def verify_ssl_certificate(cert, hostname):\n    # validates SSL/TLS certificate against hostname\n    return check_cert_chain(cert, hostname)",
        ),
        CodeChunk(
            file_path="math_utils.py",
            chunk_type="function",
            symbol_name="add_numbers",
            start_line=1,
            end_line=2,
            raw_code="def add_numbers(a, b):\n    return a + b",
        ),
    ]
    store_chunks(sample_chunks, repo_id=TEST_REPO_ID)

    try:
        # Act
        results = retrieve(
            "how does the library handle SSL certificate verification?",
            repo_id=TEST_REPO_ID,
            k=2,
        )

        # Assert
        assert len(results) == 2
        assert all("score" in r for r in results)
        assert all("raw_code" in r for r in results)

        # The SSL-related chunk should rank first (higher similarity)
        assert results[0]["symbol_name"] == "verify_ssl_certificate"

    finally:
        # Clean up: remove test data regardless of pass/fail
        _client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=FilterSelector(
                filter=Filter(
                    must=[FieldCondition(key="repo_id", match=MatchValue(value=TEST_REPO_ID))]
                )
            ),
        )