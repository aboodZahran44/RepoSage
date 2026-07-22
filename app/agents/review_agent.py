from typing import Literal, TypedDict

from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from app.ingestion.retrieval import retrieve


class ReviewFlag(BaseModel):
    severity: Literal["info", "warning", "concern"] = Field(
        description="How serious the issue is"
    )
    description: str = Field(description="What the issue is and why it matters")
    related_file: str | None = Field(
        default=None, description="File path this flag relates to, if any"
    )


class ReviewOutput(BaseModel):
    flags: list[ReviewFlag]


class ReviewState(TypedDict):
    diff_text: str
    repo_id: str
    related_chunks: list[dict]
    review_flags: list[dict]


_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
_structured_llm = _llm.with_structured_output(ReviewOutput)


def retrieve_related_node(state: ReviewState) -> dict:
    """
    Retrieves existing code that is semantically similar to the proposed
    diff, to check for duplicated logic or convention mismatches.
    """
    results = retrieve(state["diff_text"], repo_id=state["repo_id"], k=6)
    return {"related_chunks": results}


def review_node(state: ReviewState) -> dict:
    """
    Asks the LLM to review the diff against existing related code and
    flag potential issues (duplication, convention mismatches, concerns).
    """
    context_blocks = []
    for chunk in state["related_chunks"]:
        block = (
            f"File: {chunk['file_path']}\n"
            f"Symbol: {chunk['symbol_name']} ({chunk['chunk_type']})\n"
            f"Code:\n{chunk['raw_code']}\n"
        )
        context_blocks.append(block)

    context = "\n---\n".join(context_blocks)

    prompt = f"""You are a code review assistant. Review the proposed diff below
against existing related code from the same codebase, and flag any issues.

Look specifically for:
- Duplicated logic that already exists elsewhere in the codebase
- Naming or style conventions that don't match the existing code
- Any other concerns worth a human reviewer's attention

Proposed diff:
{state['diff_text']}

Existing related code in the codebase:
{context}

If there are no issues, return an empty list of flags. Be specific and
reference file paths when relevant."""

    output: ReviewOutput = _structured_llm.invoke(prompt)

    return {"review_flags": [f.model_dump() for f in output.flags]}


def build_review_graph():
    graph = StateGraph(ReviewState)

    graph.add_node("retrieve_related", retrieve_related_node)
    graph.add_node("review", review_node)

    graph.set_entry_point("retrieve_related")
    graph.add_edge("retrieve_related", "review")
    graph.add_edge("review", END)

    return graph.compile()


def review_diff(diff_text: str, repo_id: str) -> dict:
    """
    Public entry point: runs the full PR review agent graph and returns
    structured review flags based on related existing code.
    """
    app = build_review_graph()
    result = app.invoke(
        {
            "diff_text": diff_text,
            "repo_id": repo_id,
            "related_chunks": [],
            "review_flags": [],
        }
    )
    return result