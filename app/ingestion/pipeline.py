from pathlib import Path

from app.ingestion.cloner import clone_repo
from app.ingestion.file_filter import find_python_files
from app.ingestion.code_parser import CodeChunk, parse_file


def ingest_repository(github_url: str) -> list[CodeChunk]:
    """
    Full ingestion pipeline: clones a repo, filters to relevant
    Python files, and parses each one into CodeChunks.
    """
    repo_path = clone_repo(github_url)
    python_files = find_python_files(repo_path)

    all_chunks: list[CodeChunk] = []
    for file_path in python_files:
        try:
            chunks = parse_file(file_path)
            all_chunks.extend(chunks)
        except (SyntaxError, UnicodeDecodeError):
            # Some files might have encoding issues or be invalid syntax
            # (e.g. Python 2 files in an old repo) - skip and continue
            continue

    return all_chunks