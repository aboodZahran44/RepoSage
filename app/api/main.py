from fastapi import FastAPI

app = FastAPI(title="RepoSage")


@app.get("/health")
def health_check():
    return {"status": "ok"}