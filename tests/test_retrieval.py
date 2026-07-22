from qdrant_client.models import FieldCondition, Filter, FilterSelector, MatchValue

from app.ingestion.code_parser import CodeChunk
from app.ingestion.retrieval import retrieve
from app.ingestion.vector_store import COLLECTION_NAME, _client, store_chunks

TEST_REPO_ID = "test-retrieval-repo"


def _seed_test_data():
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


def _cleanup_test_data():
    _client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=FilterSelector(
            filter=Filter(
                must=[FieldCondition(key="repo_id", match=MatchValue(value=TEST_REPO_ID))]
            )
        ),
    )


def test_retrieve_returns_relevant_results():
    _seed_test_data()
    try:
        results = retrieve(
            "how does the library handle SSL certificate verification?",
            repo_id=TEST_REPO_ID,
            k=2,
        )

        assert len(results) == 2
        assert results[0]["symbol_name"] == "verify_ssl_certificate"
    finally:
        _cleanup_test_data()


def test_retrieve_boosts_exact_symbol_name_match():
    _seed_test_data()
    try:
        # Query mentions the exact function name literally
        results = retrieve(
            "explain what add_numbers does",
            repo_id=TEST_REPO_ID,
            k=2,
        )

        # Exact match bonus should push add_numbers to the top,
        # even though semantically it's less related to a "SSL" query
        assert results[0]["symbol_name"] == "add_numbers"
        assert results[0]["score"] > 1.0  # semantic score + 0.5 bonus
    finally:
        _cleanup_test_data()