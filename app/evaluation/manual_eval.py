from app.ingestion.retrieval import retrieve

# Each entry: a natural-language question, and the symbol_name we
# expect to see in the top-k results based on manual inspection
# of the psf/requests codebase.
EVAL_QUESTIONS = [
    {
        "query": "how does the library handle SSL certificate verification?",
        "expected_symbol": "SSLError",
    },
    {
        "query": "what does merge_setting do?",
        "expected_symbol": "merge_setting",
    },
    {
        "query": "where are cookies merged together?",
        "expected_symbol": "merge_cookies",
    },
    {
        "query": "how does the library prepare a request before sending it?",
        "expected_symbol": "PreparedRequest",
    },
    {
        "query": "what handles HTTP redirects?",
        "expected_symbol": "resolve_redirects",
    },
    {
        "query": "how does the library manage connection pooling?",
        "expected_symbol": "HTTPAdapter",
    },
    {
        "query": "what represents an HTTP response object?",
        "expected_symbol": "Response",
    },
    {
        "query": "how are query parameters encoded into a URL?",
        "expected_symbol": "requote_uri",
    },
    {
        "query": "what handles authentication headers?",
        "expected_symbol": "HTTPBasicAuth",
    },
    {
        "query": "how does the library detect the encoding of a response?",
        "expected_symbol": "get_encoding_from_headers",
    },
]


def run_evaluation(repo_id: str, k: int = 5) -> None:
    hits = 0

    for item in EVAL_QUESTIONS:
        results = retrieve(item["query"], repo_id=repo_id, k=k)
        found_symbols = [r["symbol_name"] for r in results]

        is_hit = item["expected_symbol"] in found_symbols
        hits += is_hit

        status = "✅ HIT" if is_hit else "❌ MISS"
        print(f"{status} | Query: {item['query']}")
        print(f"       Expected: {item['expected_symbol']}, Got: {found_symbols}")
        print()

    total = len(EVAL_QUESTIONS)
    recall = hits / total
    print(f"--- Recall@{k}: {hits}/{total} ({recall:.1%}) ---")


if __name__ == "__main__":
    run_evaluation(repo_id="psf-requests")