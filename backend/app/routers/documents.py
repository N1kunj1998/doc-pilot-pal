from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Document, User
from app.schemas import DocumentResponse
from app.storage import upload_file

router = APIRouter(prefix="/documents", tags=["documents"])

MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024  # 25MB
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/markdown",
}


@router.get("", response_model=list[DocumentResponse])
def list_documents(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Document).filter(Document.org_id == user.org_id).order_by(Document.created_at.desc()).all()


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_document(
    file: UploadFile,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {file.content_type}",
        )

    content = file.file.read()
    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)}MB limit",
        )

    document = Document(
        org_id=user.org_id,
        uploaded_by=user.id,
        name=file.filename,
        size=len(content),
        status="processing",
        storage_path="",  # filled in below once we have the row's id
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    # Keyed by document.id (not filename) so two uploads with the same
    # filename in the same org never collide/overwrite each other in S3.
    document.storage_path = f"{user.org_id}/{document.id}/{file.filename}"
    db.commit()
    db.refresh(document)

    upload_file(key=document.storage_path, content=content, content_type=file.content_type)

    return document
