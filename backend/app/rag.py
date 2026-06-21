from sqlalchemy.orm import Session

from app.openai_client import get_openai_client
from app.retrieval import embed_query, find_relevant_chunks

CHAT_MODEL = "gpt-4o-mini"

SYSTEM_PROMPT = (
    "You are DocPilot, an assistant that answers questions using only the "
    "provided document excerpts. If the excerpts don't contain the answer, "
    "say you don't know rather than guessing."
)

NO_CONTEXT_ANSWER = "I couldn't find anything in your documents to answer that."


def answer_question(question: str, org_id: str, db: Session) -> tuple[str, list[dict]]:
    query_embedding = embed_query(question)
    chunks = find_relevant_chunks(query_embedding, org_id, db)

    if not chunks:
        return NO_CONTEXT_ANSWER, []

    context = "\n\n".join(f"[{i + 1}] {chunk.content}" for i, chunk in enumerate(chunks))
    response = get_openai_client().chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"},
        ],
    )
    answer = response.choices[0].message.content

    citations = [
        {
            "chunk_id": chunk.id,
            "doc_name": chunk.document.name,
            "page": chunk.page_number,
            "snippet": chunk.content,
        }
        for chunk in chunks
    ]
    return answer, citations
