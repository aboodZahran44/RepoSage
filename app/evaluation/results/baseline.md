# Retrieval Evaluation - Baseline

**Date:** initial hybrid search implementation (semantic + exact symbol match boost)
**Repo:** psf/requests
**Metric:** Recall@5
**Result:** 6/10 (60.0%)

## Misses observed:
1. "HTTP redirects" → expected `resolve_redirects`, got `SessionRedirectMixin` (semantically close, different symbol)
2. "connection pooling" → expected `HTTPAdapter`, no close match in top-5
3. "query parameter encoding" → expected `requote_uri`, got `RequestEncodingMixin`/`prepare_url` (semantically close)
4. "encoding detection" → expected `get_encoding_from_headers`, got `Response` (too generic)

## Notes for future improvement (Phase 5):
- Several "misses" returned semantically related results with different symbol names - the strict single-expected-symbol metric may be too rigid; worth revisiting with a more lenient scoring (e.g. accept any result from the same file, or manually judge relevance)
- "Connection pooling" had zero relevant results - worth investigating chunking or embedding quality for that specific code area