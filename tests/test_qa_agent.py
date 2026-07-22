from qdrant_client.models import FieldCondition, Filter, FilterSelector, MatchValue

from app.agents.qa_agent import ask_question
from app.ingestion.code_parser import CodeChunk
from app.ingestion.vector_store import COLLECTION_NAME, _client, store_chunks

TEST_REPO_ID = "test-qa-agent-repo"


def test_ask_question_returns_grounded_answer():
    sample_chunks = [
        CodeChunk(
            file_path="auth.py",
            chunk_type="function",
            symbol_name="verify_password",
            start_line=1,
            end_line=4,
            raw_code="def verify_password(plain, hashed):\n    # Compares a plaintext password against a bcrypt hash\n    return bcrypt.checkpw(plain.encode(), hashed)",
        ),
    ]
    store_chunks(sample_chunks, repo_id=TEST_REPO_ID)

    try:
        result = ask_question("how are passwords verified?", repo_id=TEST_REPO_ID)

        assert "answer" in result
        assert len(result["answer"]) > 0
        assert "verify_password" in result["answer"] or "bcrypt" in result["answer"].lower()
        assert len(result["retrieved_chunks"]) > 0

    finally:
        _client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=FilterSelector(
                filter=Filter(
                    must=[FieldCondition(key="repo_id", match=MatchValue(value=TEST_REPO_ID))]
                )
            ),
        )