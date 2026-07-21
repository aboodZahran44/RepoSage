from pathlib import Path

from app.ingestion.cloner import clone_repo


def test_clone_repo_creates_local_directory():
    path = clone_repo("https://github.com/psf/requests.git")

    assert path.exists()
    assert path.is_dir()


def test_clone_repo_contains_python_files():
    path = clone_repo("https://github.com/psf/requests.git")

    python_files = list(path.rglob("*.py"))
    assert len(python_files) > 0