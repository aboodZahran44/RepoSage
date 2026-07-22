from app.ingestion.retrieval import retrieve


def test_retrieve_returns_relevant_results():
    results = retrieve(
        "how does the library handle SSL certificate verification?",
        repo_id="psf-requests",
        k=5,
    )

    assert len(results) == 5
    assert all("score" in r for r in results)
    assert all("raw_code" in r for r in results)

    # At least one result should be topically related to SSL/certificates
    combined_text = " ".join(r["symbol_name"].lower() for r in results)
    assert "ssl" in combined_text or "cert" in combined_text or "tls" in combined_text