from typing import TypedDict

from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph

from app.ingestion.retrieval import retrieve


class QAState(TypedDict):
    query: str
    repo_id: str
    retrieved_chunks: list[dict]
    answer: str


_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)


def retrieve_node(state: QAState) -> dict:
    """
    Retrieves relevant code chunks for the user's query.
    """
    results = retrieve(state["query"], repo_id=state["repo_id"], k=5)
    return {"retrieved_chunks": results}


def generate_answer_node(state: QAState) -> dict:
    """
    Constructs a grounded prompt using the retrieved code and asks
    the LLM to answer, citing the specific file/symbol used.
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

    prompt = f"""You are a code assistant answering questions about a codebase.
Use ONLY the code context below to answer. If the context doesn't contain
enough information to answer confidently, say so explicitly.

Code context:
{context}

Question: {state['query']}

Answer, and mention which file/symbol your answer is based on:"""

    response = _llm.invoke(prompt)
    return {"answer": response.content}


def build_qa_graph():
    graph = StateGraph(QAState)

    graph.add_node("retrieve", retrieve_node)
    graph.add_node("generate_answer", generate_answer_node)

    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "generate_answer")
    graph.add_edge("generate_answer", END)

    return graph.compile()


def ask_question(query: str, repo_id: str) -> dict:
    """
    Public entry point: runs the full Q&A agent graph and returns
    the answer along with the chunks it was based on.
    """
    app = build_qa_graph()
    result = app.invoke(
        {"query": query, "repo_id": repo_id, "retrieved_chunks": [], "answer": ""}
    )
    return result