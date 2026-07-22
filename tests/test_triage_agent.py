from qdrant_client.models import FieldCondition, Filter, FilterSelector, MatchValue

from app.agents.triage_agent import triage_issue
from app.ingestion.code_parser import CodeChunk
from app.ingestion.vector_store import COLLECTION_NAME, _client, store_chunks

TEST_REPO_ID = "test-triage-agent-repo"


def test_triage_issue_returns_structured_results():
    sample_chunks = [
        CodeChunk(
            file_path="payments.py",
            chunk_type="function",
            symbol_name="process_refund",
            start_line=1,
            end_line=5,
            raw_code="def process_refund(order_id, amount):\n    # Issues a refund for a given order via the payment gateway\n    return gateway.refund(order_id, amount)",
        ),
        CodeChunk(
            file_path="unrelated.py",
            chunk_type="function",
            symbol_name="format_date",
            start_line=1,
            end_line=2,
            raw_code="def format_date(dt):\n    return dt.strftime('%Y-%m-%d')",
        ),
    ]
    store_chunks(sample_chunks, repo_id=TEST_REPO_ID)

    try:
        result = triage_issue(
            "Customers report that refunds are not being processed correctly",
            repo_id=TEST_REPO_ID,
        )

        assert "triage_results" in result
        assert len(result["triage_results"]) > 0

        for item in result["triage_results"]:
            assert "file_path" in item
            assert "relevance_score" in item
            assert "reasoning" in item
            assert 0.0 <= item["relevance_score"] <= 1.0

        top_result = max(result["triage_results"], key=lambda r: r["relevance_score"])
        assert "payments.py" in top_result["file_path"]

    finally:
        _client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=FilterSelector(
                filter=Filter(
                    must=[FieldCondition(key="repo_id", match=MatchValue(value=TEST_REPO_ID))]
                )
            ),
        )