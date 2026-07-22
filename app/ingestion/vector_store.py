import uuid

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.ingestion.code_parser import CodeChunk
from app.ingestion.embeddings import generate_embedding

COLLECTION_NAME = "code_embeddings"
VECTOR_SIZE = 1536  # matches text-embedding-3-small output size

_client = QdrantClient(url="http://localhost:6333")


def ensure_collection_exists() -> None:
    """
    Creates the Qdrant collection if it doesn't already exist.
    """
    existing = [c.name for c in _client.get_collections().collections]
    if COLLECTION_NAME not in existing:
        _client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )


def store_chunks(chunks: list[CodeChunk], repo_id: str) -> int:
    """
    Generates embeddings for each chunk and stores them in Qdrant
    with metadata for later filtering.

    Returns the number of chunks stored.
    """
    ensure_collection_exists()

    points = []
    for chunk in chunks:
        vector = generate_embedding(chunk.raw_code)
        point_id = str(uuid.uuid4())

        points.append(
            PointStruct(
                id=point_id,
                vector=vector,
                payload={
                    "repo_id": repo_id,
                    "file_path": chunk.file_path,
                    "chunk_type": chunk.chunk_type,
                    "symbol_name": chunk.symbol_name,
                    "start_line": chunk.start_line,
                    "end_line": chunk.end_line,
                    "raw_code": chunk.raw_code,
                },
            )
        )

    _client.upsert(collection_name=COLLECTION_NAME, points=points)
    return len(points)