import uuid

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db, init_db
from app.db.models import Repo
from app.ingestion.pipeline import ingest_repository
from app.ingestion.vector_store import store_chunks

app = FastAPI(title="RepoSage")


@app.on_event("startup")
def on_startup():
    init_db()


class IndexRepoRequest(BaseModel):
    github_url: str


class AskRequest(BaseModel):
    query: str


class TriageRequest(BaseModel):
    issue_text: str


class ReviewRequest(BaseModel):
    diff_text: str


def run_ingestion(repo_id: str, github_url: str):
    from app.db.database import SessionLocal

    db = SessionLocal()
    try:
        repo = db.query(Repo).filter(Repo.id == repo_id).first()
        repo.status = "indexing"
        db.commit()

        chunks = ingest_repository(github_url)
        store_chunks(chunks, repo_id=repo_id)

        repo.status = "ready"
        db.commit()
    except Exception as e:
        import traceback
        print(f"Ingestion failed for repo {repo_id}: {e}")
        traceback.print_exc()
        repo.status = "failed"
        db.commit()
    finally:
        db.close()


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/repos/index")
def index_repo(
    request: IndexRepoRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    repo_id = str(uuid.uuid4())
    repo = Repo(id=repo_id, github_url=request.github_url, status="pending")
    db.add(repo)
    db.commit()

    background_tasks.add_task(run_ingestion, repo_id, request.github_url)

    return {"repo_id": repo_id, "status": "pending"}


@app.get("/repos/{repo_id}/status")
def get_repo_status(repo_id: str, db: Session = Depends(get_db)):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if repo is None:
        raise HTTPException(status_code=404, detail="Repo not found")
    return {"repo_id": repo.id, "status": repo.status, "github_url": repo.github_url}


@app.post("/repos/{repo_id}/ask")
def ask(repo_id: str, request: AskRequest):
    return {"repo_id": repo_id, "query": request.query, "answer": "placeholder"}


@app.post("/repos/{repo_id}/triage")
def triage(repo_id: str, request: TriageRequest):
    return {"repo_id": repo_id, "results": []}


@app.post("/repos/{repo_id}/review")
def review(repo_id: str, request: ReviewRequest):
    return {"repo_id": repo_id, "flags": []}