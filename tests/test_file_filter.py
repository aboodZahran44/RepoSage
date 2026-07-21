from pathlib import Path

from app.ingestion.file_filter import find_python_files


def test_find_python_files_excludes_venv(tmp_path):
    # Simulate a repo structure
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.py").write_text("# main file")

    (tmp_path / "venv" / "lib").mkdir(parents=True)
    (tmp_path / "venv" / "lib" / "some_dependency.py").write_text("# dependency")

    (tmp_path / "__pycache__").mkdir()
    (tmp_path / "__pycache__" / "cache.py").write_text("# cache")

    result = find_python_files(tmp_path)
    result_names = [f.name for f in result]

    assert "main.py" in result_names
    assert "some_dependency.py" not in result_names
    assert "cache.py" not in result_names