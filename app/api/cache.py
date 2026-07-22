import hashlib
import json
import os

import redis

_redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))

CACHE_TTL_SECONDS = 60 * 60  # 1 hour


def _make_cache_key(repo_id: str, query_type: str, text: str) -> str:
    """
    Builds a stable cache key from the repo, the type of query
    (ask/triage/review), and a hash of the input text.
    """
    text_hash = hashlib.sha256(text.encode()).hexdigest()
    return f"cache:{repo_id}:{query_type}:{text_hash}"


def get_cached(repo_id: str, query_type: str, text: str) -> dict | None:
    key = _make_cache_key(repo_id, query_type, text)
    cached = _redis_client.get(key)
    if cached is None:
        return None
    return json.loads(cached)


def set_cached(repo_id: str, query_type: str, text: str, result: dict) -> None:
    key = _make_cache_key(repo_id, query_type, text)
    _redis_client.setex(key, CACHE_TTL_SECONDS, json.dumps(result))