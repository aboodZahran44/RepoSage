import shutil
import tempfile
from pathlib import Path

from git import Repo, GitCommandError


def clone_repo(github_url: str, dest_dir: str | None = None) -> Path:
    """
    Clones a GitHub repository to a local directory (shallow clone).

    Args:
        github_url: Full URL of the repo, e.g. "https://github.com/user/repo.git"
        dest_dir: Where to clone it. If None, creates a temp directory.

    Returns:
        Path to the cloned repository on disk.
    """
    if dest_dir is None:
        dest_dir = tempfile.mkdtemp(prefix="reposage_")

    dest_path = Path(dest_dir)

    if dest_path.exists() and any(dest_path.iterdir()):
        shutil.rmtree(dest_path)

    try:
        Repo.clone_from(github_url, dest_path, depth=1)
    except GitCommandError as e:
        raise ValueError(f"Failed to clone repository: {e}")

    return dest_path