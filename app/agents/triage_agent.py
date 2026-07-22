from typing import TypedDict

from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from app.ingestion.retrieval import retrieve


class FileTriageResult(BaseModel):
    file_path: str = Field(description="Path of the relevant file")
    relevance_score: float = Field(description="Confidence score between 0 and 1")
    reasoning: str = Field(description="Brief explanation of why this file is relevant")


class TriageOutput(BaseModel):
    results: list[FileTriageResult]


class TriageState(TypedDict):
    issue_text: str
    repo_id: str
    retrieved_chunks: list[dict]
    triage_results: list[dict]


_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
_structured_llm = _llm.with_structured_output(TriageOutput)


def retrieve_node(state: TriageState) -> dict:
    """
    Retrieves candidate code chunks related to the issue description.
    """
    results = retrieve(state["issue_text"], repo_id=state["repo_id"], k=8)
    return {"retrieved_chunks": results}


def triage_node(state: TriageState) -> dict:
    """
    Asks the LLM to score and explain the relevance of each retrieved
    file to the given issue, returning structured, parseable output.
    """
    context_blocks = []
    for chunk in state["retrieved_chunks"]:
        block = (
            f"File: {chunk['file_path']}\n"
            f"Symbol: {chunk['symbol_name']} ({chunk['chunk_type']})\n"
            f"Code:\n{chunk['raw_code']}\n"
        )
        context_blocks.append(block)

    context = "\n---\n".join(context_blocks)

    prompt = f"""You are a code triage assistant. Given a bug report or feature
request, and a set of candidate code files, score how relevant each file is
to resolving the issue.

Issue description:
{state['issue_text']}

Candidate files:
{context}

For each candidate file, provide a relevance_score (0.0 to 1.0) and a short
reasoning. Only include files that are plausibly relevant (score > 0.1)."""

    output: TriageOutput = _structured_llm.invoke(prompt)

    return {"triage_results": [r.model_dump() for r in output.results]}


def build_triage_graph():
    graph = StateGraph(TriageState)

    graph.add_node("retrieve", retrieve_node)
    graph.add_node("triage", triage_node)

    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "triage")
    graph.add_edge("triage", END)

    return graph.compile()


def triage_issue(issue_text: str, repo_id: str) -> dict:
    """
    Public entry point: runs the full triage agent graph and returns
    ranked, structured file relevance results.
    """
    app = build_triage_graph()
    result = app.invoke(
        {
            "issue_text": issue_text,
            "repo_id": repo_id,
            "retrieved_chunks": [],
            "triage_results": [],
        }
    )
    return result