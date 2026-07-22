import os
import uuid

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.agents.qa_agent import ask_question
from app.agents.review_agent import review_diff
from app.agents.triage_agent import triage_issue
from app.auth.security import create_access_token, verify_token
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


@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    correct_username = os.getenv("API_USERNAME")
    correct_password = os.getenv("API_PASSWORD")

    if form_data.username != correct_username or form_data.password != correct_password:
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    token = create_access_token(username=form_data.username)
    return {"access_token": token, "token_type": "bearer"}


@app.post("/repos/index")
def index_repo(
    request: IndexRepoRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: str = Depends(verify_token),
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
def ask(repo_id: str, request: AskRequest, current_user: str = Depends(verify_token)):
    result = ask_question(request.query, repo_id=repo_id)
    return {"repo_id": repo_id, "query": request.query, "answer": result["answer"]}


@app.post("/repos/{repo_id}/triage")
def triage(repo_id: str, request: TriageRequest, current_user: str = Depends(verify_token)):
    result = triage_issue(request.issue_text, repo_id=repo_id)
    return {"repo_id": repo_id, "results": result["triage_results"]}


@app.post("/repos/{repo_id}/review")
def review(repo_id: str, request: ReviewRequest, current_user: str = Depends(verify_token)):
    result = review_diff(request.diff_text, repo_id=repo_id)
    return {"repo_id": repo_id, "flags": result["review_flags"]}