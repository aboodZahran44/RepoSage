import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(override=True)

_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

EMBEDDING_MODEL = "text-embedding-3-small"
MAX_CHARS = 20000


def generate_embedding(text: str) -> list[float]:
    """
    Converts a piece of text (code or query) into an embedding vector
    using OpenAI's embedding model. Long inputs are truncated to stay
    within the model's context limit.
    """
    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS]

    response = _client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
    )
    return response.data[0].embedding