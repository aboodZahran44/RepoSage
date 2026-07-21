from dataclasses import dataclass
from pathlib import Path

import tree_sitter_python as tspython
from tree_sitter import Language, Node, Parser

PY_LANGUAGE = Language(tspython.language())
_parser = Parser(PY_LANGUAGE)


@dataclass
class CodeChunk:
    file_path: str
    chunk_type: str  # "function" or "class"
    symbol_name: str
    start_line: int
    end_line: int
    raw_code: str


def _extract_name(node: Node) -> str:
    for child in node.children:
        if child.type == "identifier":
            return child.text.decode("utf-8")
    return "unknown"


def parse_file(file_path: Path) -> list[CodeChunk]:
    """
    Parses a single Python file and extracts function and class
    definitions as CodeChunks.
    """
    source_code = file_path.read_bytes()
    tree = _parser.parse(source_code)

    chunks: list[CodeChunk] = []

    def walk(node: Node):
        if node.type in ("function_definition", "class_definition"):
            chunk_type = "function" if node.type == "function_definition" else "class"
            chunks.append(
                CodeChunk(
                    file_path=str(file_path),
                    chunk_type=chunk_type,
                    symbol_name=_extract_name(node),
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    raw_code=node.text.decode("utf-8"),
                )
            )
            # Don't recurse into function bodies to avoid capturing
            # nested functions as separate top-level chunks for now
            return

        for child in node.children:
            walk(child)

    walk(tree.root_node)
    return chunks