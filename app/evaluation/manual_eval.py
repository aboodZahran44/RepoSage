from app.ingestion.retrieval import retrieve

EVAL_QUESTIONS = [
    {
        "query": "how does the library handle SSL certificate verification?",
        "expected_symbol": "SSLError",
        "expected_file": "exceptions.py",
    },
    {
        "query": "what does merge_setting do?",
        "expected_symbol": "merge_setting",
        "expected_file": "sessions.py",
    },
    {
        "query": "where are cookies merged together?",
        "expected_symbol": "merge_cookies",
        "expected_file": "cookies.py",
    },
    {
        "query": "how does the library prepare a request before sending it?",
        "expected_symbol": "PreparedRequest",
        "expected_file": "models.py",
    },
    {
        "query": "what handles HTTP redirects?",
        "expected_symbol": "resolve_redirects",
        "expected_file": "sessions.py",
    },
    {
        "query": "how does the library manage connection pooling?",
        "expected_symbol": "HTTPAdapter",
        "expected_file": "adapters.py",
    },
    {
        "query": "what represents an HTTP response object?",
        "expected_symbol": "Response",
        "expected_file": "models.py",
    },
    {
        "query": "how are query parameters encoded into a URL?",
        "expected_symbol": "requote_uri",
        "expected_file": "utils.py",
    },
    {
        "query": "what handles authentication headers?",
        "expected_symbol": "HTTPBasicAuth",
        "expected_file": "auth.py",
    },
    {
        "query": "how does the library detect the encoding of a response?",
        "expected_symbol": "get_encoding_from_headers",
        "expected_file": "utils.py",
    },
]


def run_evaluation(repo_id: str, k: int = 5) -> None:
    strict_hits = 0
    lenient_hits = 0

    for item in EVAL_QUESTIONS:
        results = retrieve(item["query"], repo_id=repo_id, k=k)
        found_symbols = [r["symbol_name"] for r in results]
        found_files = [r["file_path"] for r in results]

        is_strict_hit = item["expected_symbol"] in found_symbols
        is_lenient_hit = any(item["expected_file"] in f for f in found_files)

        strict_hits += is_strict_hit
        lenient_hits += is_lenient_hit

        if is_strict_hit:
            status = "✅ STRICT HIT"
        elif is_lenient_hit:
            status = "🟡 FILE MATCH (lenient hit, strict miss)"
        else:
            status = "❌ MISS"

        print(f"{status} | Query: {item['query']}")
        print(f"       Expected: {item['expected_symbol']} ({item['expected_file']}), Got: {found_symbols}")
        print()

    total = len(EVAL_QUESTIONS)
    print(f"--- Strict Recall@{k} (exact symbol): {strict_hits}/{total} ({strict_hits/total:.1%}) ---")
    print(f"--- Lenient Recall@{k} (same file): {lenient_hits}/{total} ({lenient_hits/total:.1%}) ---")


if __name__ == "__main__":
    run_evaluation(repo_id="psf-requests")