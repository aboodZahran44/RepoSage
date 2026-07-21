from pathlib import Path

EXCLUDED_DIRS = {
    ".git",
    "venv",
    ".venv",
    "__pycache__",
    "node_modules",
    "build",
    "dist",
    ".pytest_cache",
    "site-packages",
}


def find_python_files(repo_path: Path) -> list[Path]:
    """
    Walks the repo directory and returns all relevant .py files,
    excluding virtual environments, build artifacts, and dependency folders.
    """
    python_files = []

    for path in repo_path.rglob("*.py"):
        if any(excluded in path.parts for excluded in EXCLUDED_DIRS):
            continue
        python_files.append(path)

    return python_files