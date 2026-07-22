from qdrant_client.models import FieldCondition, Filter, MatchValue

from app.ingestion.embeddings import generate_embedding
from app.ingestion.vector_store import COLLECTION_NAME, _client


def retrieve(query: str, repo_id: str, k: int = 5) -> list[dict]:
    """
    Retrieves the top-k most semantically relevant code chunks
    for a given natural-language query, scoped to a specific repo.
    """
    query_vector = generate_embedding(query)

    results = _client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=Filter(
            must=[FieldCondition(key="repo_id", match=MatchValue(value=repo_id))]
        ),
        limit=k,
    )

    return [
        {
            "score": point.score,
            "file_path": point.payload["file_path"],
            "symbol_name": point.payload["symbol_name"],
            "chunk_type": point.payload["chunk_type"],
            "raw_code": point.payload["raw_code"],
        }
        for point in results.points
    ]