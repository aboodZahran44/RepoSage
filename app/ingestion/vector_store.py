import os
import uuid

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.ingestion.code_parser import CodeChunk
from app.ingestion.embeddings import generate_embedding

_client = QdrantClient(
    url=os.getenv("QDRANT_URL", "http://localhost:6333"),
    api_key=os.getenv("QDRANT_API_KEY"),
)

COLLECTION_NAME = "code_embeddings"
VECTOR_SIZE = 1536


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
    with metadata for later filtering. The embedding text includes
    the file path and symbol name as extra context, in addition to
    the raw code itself.
    """
    ensure_collection_exists()

    points = []
    for chunk in chunks:
        embedding_text = (
            f"File: {chunk.file_path}\n"
            f"Symbol: {chunk.symbol_name} ({chunk.chunk_type})\n\n"
            f"{chunk.raw_code}"
        )
        vector = generate_embedding(embedding_text)
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