from qdrant_client.models import FieldCondition, Filter, FilterSelector, MatchValue

from app.agents.review_agent import review_diff
from app.ingestion.code_parser import CodeChunk
from app.ingestion.vector_store import COLLECTION_NAME, _client, store_chunks

TEST_REPO_ID = "test-review-agent-repo"


def test_review_diff_flags_duplicated_logic():
    sample_chunks = [
        CodeChunk(
            file_path="utils.py",
            chunk_type="function",
            symbol_name="calculate_discount",
            start_line=1,
            end_line=4,
            raw_code=(
                "def calculate_discount(price, percentage):\n"
                "    # Applies a percentage discount to a given price\n"
                "    return price - (price * percentage / 100)"
            ),
        ),
    ]
    store_chunks(sample_chunks, repo_id=TEST_REPO_ID)

    try:
        diff = (
            "+ def apply_percentage_discount(price, percent):\n"
            "+     discount = price * percent / 100\n"
            "+     return price - discount"
        )

        result = review_diff(diff, repo_id=TEST_REPO_ID)

        assert "review_flags" in result
        assert len(result["review_flags"]) > 0

        for flag in result["review_flags"]:
            assert flag["severity"] in ("info", "warning", "concern")
            assert "description" in flag

        # At least one flag should mention the duplicated logic
        descriptions = " ".join(f["description"].lower() for f in result["review_flags"])
        assert "discount" in descriptions or "duplicat" in descriptions

    finally:
        _client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=FilterSelector(
                filter=Filter(
                    must=[FieldCondition(key="repo_id", match=MatchValue(value=TEST_REPO_ID))]
                )
            ),
        )