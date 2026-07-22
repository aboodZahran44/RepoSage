# RepoSage

**A Codebase Intelligence Agent** — point it at any GitHub repository, and ask it questions about the code, get help triaging bug reports, or get automated review feedback on proposed changes. Built as a full RAG + Multi-Agent system with production-grade engineering practices: authentication, observability, evaluation, and a live deployment.

🔗 **Live Demo:** [https://reposage-api.onrender.com/docs](https://reposage-api.onrender.com/docs)
📂 **Repository:** [github.com/aboodZahran44/RepoSage](https://github.com/aboodZahran44/RepoSage)

> Note: the API runs on a free-tier instance and spins down after inactivity — the first request after idle time may take up to ~50 seconds to respond while it wakes up.

---

## What it does

Give RepoSage a GitHub URL, and it indexes the entire codebase (clones it, parses every function and class, embeds them, and stores them in a vector database). Once indexed, you can:

1. **Ask questions** about how the code works — answers are grounded in the actual source, with citations to the specific file/function used.
2. **Triage an issue** — paste a bug report or feature request, and get a ranked list of the files most likely relevant, with a relevance score and reasoning for each.
3. **Review a diff** — paste a proposed code change, and get structured feedback (severity-tagged: info / warning / concern) flagging duplicated logic or convention mismatches against the existing codebase.

Everything is grounded in the real code of whichever repository you index — not general knowledge about programming.

---

## Architecture

```
                        ┌─────────────────────┐
                        │   GitHub Repository │
                        └──────────┬───────────┘
                                   │ (clone via GitHub API)
                                   ▼
                        ┌─────────────────────┐
                        │  Ingestion Pipeline  │
                        │  - Clone repo        │
                        │  - Filter to .py     │
                        │  - Parse via         │
                        │    tree-sitter       │
                        │  - Chunk by          │
                        │    function/class    │
                        └──────────┬───────────┘
                                   │
                     ┌─────────────┼─────────────┐
                     ▼                           ▼
          ┌─────────────────┐          ┌──────────────────┐
          │   PostgreSQL     │          │   Qdrant Cloud    │
          │ (repo status,    │          │ (code embeddings, │
          │  tracking)       │          │  hybrid search)   │
          └─────────────────┘          └──────────────────┘
                     │                           │
                     └─────────────┬─────────────┘
                                   ▼
                        ┌─────────────────────┐
                        │   LangGraph Agents   │
                        │  - Q&A Agent         │
                        │  - Issue Triage Agent│
                        │  - PR Review Agent   │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │     FastAPI Layer    │
                        │  JWT-protected        │
                        │  /index /ask /triage  │
                        │  /review /status      │
                        └──────────┬───────────┘
                                   │
                     ┌─────────────┼─────────────┐
                     ▼                           ▼
          ┌─────────────────┐          ┌──────────────────┐
          │  Upstash Redis   │          │  Langfuse Cloud  │
          │  (response cache)│          │  (LLM traces,    │
          │                  │          │   cost tracking) │
          └─────────────────┘          └──────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| LLM & Embeddings | OpenAI (`gpt-4o-mini`, `text-embedding-3-small`) |
| Orchestration | LangChain + LangGraph |
| Code parsing | tree-sitter (`tree-sitter-python`) |
| Vector DB | Qdrant Cloud (hybrid search: semantic + exact symbol match) |
| Relational DB | PostgreSQL (SQLAlchemy) |
| Caching | Redis (Upstash, TLS) |
| Backend | FastAPI, Pydantic |
| Auth | JWT (`python-jose`) |
| Observability | Langfuse (traces, token usage, cost per call) |
| Containerization | Docker + Docker Compose |
| CI | GitHub Actions (automated tests on every push) |
| Deployment | Render (Docker web service) |
| Repo access | GitPython |

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/health` | Health check | No |
| POST | `/login` | Get a JWT access token | No |
| POST | `/repos/index` | Start indexing a GitHub repo (background task) | Yes |
| GET | `/repos/{repo_id}/status` | Poll indexing status | No |
| POST | `/repos/{repo_id}/ask` | Ask a question about the indexed code | Yes |
| POST | `/repos/{repo_id}/triage` | Get ranked file relevance for a bug/feature report | Yes |
| POST | `/repos/{repo_id}/review` | Get structured review flags for a proposed diff | Yes |

All protected endpoints require a `Bearer` token obtained from `/login`. Responses from `/ask`, `/triage`, and `/review` are cached (1-hour TTL) — identical repeated queries return instantly with `"cached": true`.

---

## Evaluation

Rather than assuming the system "just works," retrieval quality was measured against a 10-question manual evaluation set on `psf/requests` (a real, mature open-source Python library).

### Results

| Metric | Score |
|---|---|
| Strict Recall@5 (exact symbol name match) | 6/10 (60%) |
| **Lenient Recall@5 (correct file returned)** | **9/10 (90%)** |

### Why two metrics

Manually inspecting each "miss" against the actual `psf/requests` source revealed that most were not retrieval failures — they were scoring artifacts. For example, a query about HTTP redirects was scored as a miss because it returned `SessionRedirectMixin` instead of `resolve_redirects` — but `resolve_redirects` is a method *inside* `SessionRedirectMixin`, in the same file. The system had, in fact, found the right place in the code; the strict metric just didn't give it credit.

The one remaining genuine gap (an SSL-related query not retrieving `SSLError`) was root-caused by inspecting the actual chunk: `SSLError` is a two-line exception subclass with no functional logic, producing a semantically "thin" embedding compared to behavior-rich code — a known, documented limitation rather than an unexplained failure.

### Cost & Latency

Measured via Langfuse's automatic tracking on each LLM call (model: `gpt-4o-mini`):

| Agent | Latency | Cost per call |
|---|---|---|
| Q&A | ~4.3s | $0.000032 |
| Triage | ~3.6s | $0.000114 |
| Review | ~2.4s | $0.000133 |

At this cost, realistic usage volumes (hundreds of requests/day) would cost well under $1/day.

---

## Running it locally

**Requirements:** Docker Desktop, an OpenAI API key.

```bash
git clone https://github.com/aboodZahran44/RepoSage.git
cd RepoSage
```

Create a `.env` file with:
```
OPENAI_API_KEY=your_key_here
API_USERNAME=admin
API_PASSWORD=your_password
JWT_SECRET_KEY=a_long_random_string
```

Then:
```bash
docker compose up -d --build
```

The API will be available at `http://localhost:8000/docs`. This local setup uses self-hosted PostgreSQL, Qdrant, and Redis via Docker Compose — no cloud accounts needed to run it locally.

---

## Known Limitations

- **Python only.** The parser currently supports Python (`tree-sitter-python`). Adding other languages (JavaScript, Java, etc.) is architecturally straightforward — the ingestion, storage, and agent layers are all language-agnostic and operate on a generic `CodeChunk` structure — but requires per-language grammar mapping and a dedicated evaluation set to verify quality.
- **Retrieval quality depends on the target codebase.** Well-documented, clearly-named code retrieves better than sparse or poorly-documented code — this is a property of any embedding-based retrieval system, not unique to this project. The evaluation methodology built here (strict + lenient recall, root-cause analysis of misses) is designed to be reapplied to any new repository to measure this directly, rather than assumed.
- **Free-tier hosting trade-offs.** The deployed instance spins down after inactivity (cold start ~50s), and free-tier compute limits (512MB RAM) cap how large a repository can be indexed comfortably.
- **Truncation on very long code chunks.** Functions/classes exceeding ~20,000 characters are truncated before embedding to stay within the embedding model's context limit — a pragmatic trade-off documented during evaluation.

---

## Engineering Decisions Worth Noting

- **Function/class-level chunking via AST parsing** (not naive line-based splitting) — ensures retrieved context is always a complete, coherent unit of code.
- **Hybrid search**: semantic similarity boosted by exact symbol-name matching, so a query literally naming a function reliably surfaces it even if its embedding similarity alone is moderate.
- **Structured (Pydantic) output** for Triage and Review agents, so results are machine-consumable, not free text requiring parsing.
- **Background tasks for indexing** — a multi-minute operation (clone + parse + embed hundreds of chunks) never blocks the HTTP response; the client polls `/status` instead.
- **Environment-variable-driven configuration throughout** (`QDRANT_URL`, `DATABASE_URL`, `REDIS_URL`, etc.), each with a local-Docker fallback — the same codebase runs unmodified whether connected to local Docker services or fully managed cloud services (Qdrant Cloud, Upstash, Render Postgres).
