from fastapi import APIRouter, Depends, HTTPException, status
from langfuse import observe, propagate_attributes
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import ChatMessage, ChatThread, User
from app.rag import answer_question
from app.schemas import ChatMessageResponse, ChatThreadResponse, CreateThreadRequest, SendMessageRequest

router = APIRouter(prefix="/chat", tags=["chat"])


def _get_org_thread_or_404(thread_id: str, user: User, db: Session) -> ChatThread:
    thread = db.query(ChatThread).filter(ChatThread.id == thread_id, ChatThread.org_id == user.org_id).first()
    if thread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    return thread


@router.get("/threads", response_model=list[ChatThreadResponse])
def list_threads(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(ChatThread).filter(ChatThread.org_id == user.org_id).order_by(ChatThread.created_at.desc()).all()


@router.post("/threads", response_model=ChatThreadResponse, status_code=status.HTTP_201_CREATED)
def create_thread(
    payload: CreateThreadRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thread = ChatThread(org_id=user.org_id, user_id=user.id, title=payload.title)
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return thread


@router.post(
    "/threads/{thread_id}/messages", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED
)
@observe(name="send-message", capture_input=False)
def send_message(
    thread_id: str,
    payload: SendMessageRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    with propagate_attributes(user_id=str(user.id), metadata={"org_id": user.org_id}):
        thread = _get_org_thread_or_404(thread_id, user, db)

        db.add(ChatMessage(thread_id=thread.id, role="user", content=payload.content))

        if thread.title == "New conversation":
            thread.title = payload.content[:80]

        answer, citations = answer_question(payload.content, user.org_id, db)

        assistant_message = ChatMessage(thread_id=thread.id, role="assistant", content=answer, citations=citations)
        db.add(assistant_message)
        db.commit()
        db.refresh(assistant_message)
        return assistant_message
