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

## Experiment 1: Adding file path + symbol name as embedding context

**Change:** Prepended `File: {path}\nSymbol: {name} ({type})` to the code text before generating embeddings (metadata only, not re-added to raw_code payload).

**Result:** Recall@5 = 6/10 (60.0%) — same overall score as baseline, but different composition:
- **Gained:** "query parameter encoding" query now correctly retrieves `requote_uri` (was a miss in baseline)
- **Lost:** "SSL certificate verification" query no longer retrieves `SSLError` in top-5 (was a hit in baseline)

**Conclusion:** Adding file/symbol context as embedding input is not a universal improvement — it's a trade-off that helps some queries (where the filename is semantically informative) while hurting others (where it introduces noise relative to the code's actual content). Net recall unchanged. This suggests chunking-level context alone isn't the main lever here; the bigger opportunity is likely in retrieval strategy (e.g., k value, hybrid search weighting) or evaluati
on methodology itself (the strict single-symbol match may be under-crediting semantically valid misses).