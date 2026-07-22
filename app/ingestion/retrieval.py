from qdrant_client.models import FieldCondition, Filter, MatchValue

from app.ingestion.embeddings import generate_embedding
from app.ingestion.vector_store import COLLECTION_NAME, _client


def retrieve(query: str, repo_id: str, k: int = 5) -> list[dict]:
    """
    Retrieves the top-k most relevant code chunks for a given query,
    using hybrid search: semantic similarity boosted by exact symbol
    name matches found in the query text.
    """
    query_vector = generate_embedding(query)

    # Fetch a larger pool than k, so exact matches have room to be
    # re-ranked to the top even if their semantic score alone is low
    pool_size = max(k * 3, 15)

    results = _client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=Filter(
            must=[FieldCondition(key="repo_id", match=MatchValue(value=repo_id))]
        ),
        limit=pool_size,
    )

    query_lower = query.lower()

    scored_results = []
    for point in results.points:
        symbol_name = point.payload["symbol_name"]
        semantic_score = point.score

        # Boost: if the exact symbol name appears literally in the query,
        # treat it as a near-certain match regardless of semantic score
        exact_match_bonus = 0.5 if symbol_name.lower() in query_lower else 0.0

        scored_results.append(
            {
                "score": semantic_score + exact_match_bonus,
                "file_path": point.payload["file_path"],
                "symbol_name": symbol_name,
                "chunk_type": point.payload["chunk_type"],
                "raw_code": point.payload["raw_code"],
            }
        )

    scored_results.sort(key=lambda r: r["score"], reverse=True)
    return scored_results[:k]