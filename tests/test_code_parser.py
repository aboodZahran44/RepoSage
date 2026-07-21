from pathlib import Path

from app.ingestion.code_parser import parse_file


def test_parse_file_extracts_function(tmp_path):
    code = '''
def greet(name):
    return f"Hello, {name}"
'''
    file_path = tmp_path / "sample.py"
    file_path.write_text(code)

    chunks = parse_file(file_path)

    assert len(chunks) == 1
    assert chunks[0].chunk_type == "function"
    assert chunks[0].symbol_name == "greet"


def test_parse_file_extracts_class(tmp_path):
    code = '''
class Animal:
    def speak(self):
        pass
'''
    file_path = tmp_path / "sample.py"
    file_path.write_text(code)

    chunks = parse_file(file_path)

    class_chunks = [c for c in chunks if c.chunk_type == "class"]
    assert len(class_chunks) == 1
    assert class_chunks[0].symbol_name == "Animal"


def test_parse_file_extracts_multiple_functions(tmp_path):
    code = '''
def first():
    pass

def second():
    pass
'''
    file_path = tmp_path / "sample.py"
    file_path.write_text(code)

    chunks = parse_file(file_path)

    assert len(chunks) == 2
    names = {c.symbol_name for c in chunks}
    assert names == {"first", "second"}