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

## Experiment 2: Introducing file-level (lenient) recall metric

**Motivation:** Manual inspection of the 4 original misses (by cloning and inspecting the actual `psf/requests` source) revealed that most "misses" were not retrieval failures — they were scoring artifacts caused by the chunking granularity (functions retrieved as part of their containing class) or symbol-vs-file mismatches.

**Verified findings per miss (via direct source inspection):**
| Query | Expected symbol | Actual file | System returned | Root cause |
|---|---|---|---|---|
| HTTP redirects | `resolve_redirects` | `sessions.py` | `SessionRedirectMixin` | Same file, same class — correct at file/class level, wrong at method level |
| Connection pooling | `HTTPAdapter` | `adapters.py` | `_urllib3_request_context` (also in `adapters.py`) | Same file — correct, just different symbol |
| Query encoding | `requote_uri` | `utils.py` | `RequestEncodingMixin` (`models.py`) | Different file, but `RequestEncodingMixin` calls `requote_uri` internally — topically related |
| Encoding detection | `get_encoding_from_headers` | `utils.py` | `Response` (`models.py`) | Different file, but `Response.encoding` is set via this function — topically related |

**New metric added:** Lenient Recall@5 — checks whether *any* top-5 result comes from the same file as the expected symbol, not just an exact symbol name match.

**Result:**
- Strict Recall@5: 6/10 (60.0%) — unchanged
- **Lenient Recall@5: 9/10 (90.0%)**

**Conclusion:** The retrieval system's real-world quality is significantly better than the strict metric suggested. Only one query (SSL certificate verification) is a genuine retrieval failure with no relevant file returned. This is a good example of over-strict evaluation criteria masking actual system quality — a key lesson for designing evaluation methodology, not just tuning the retrieval system itself.

**Remaining known limitation:** SSL certificate verification query does not retrieve any chunk from `exceptions.py` (where `SSLError` is defined) in the top-5 — worth investigating further (e.g., whether `SSLError`'s chunk embedding is being outcompeted by more test-heavy content for this specific query).