from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db import get_db
from dependencies import get_current_user
from models.user import User
from models.document import Document
from schemas.document import DocumentCreateRequest, DocumentUpdateRequest, DocumentOut
from services.document import create_document, get_document_owned

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=list[DocumentOut])
def list_documents(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    docs = (
        db.query(Document)
        .filter(Document.user_id == user.id)
        .order_by(Document.updated_at.desc())
        .all()
    )
    return docs


@router.post("", response_model=DocumentOut)
def create_doc(
    req: DocumentCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return create_document(db, user, req.title)


@router.get("/{doc_id}", response_model=DocumentOut)
def get_doc(
    doc_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return get_document_owned(db, user, doc_id)


@router.patch("/{doc_id}", response_model=DocumentOut)
def update_doc(
    doc_id: int,
    req: DocumentUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = get_document_owned(db, user, doc_id)

    if req.title is not None:
        doc.title = req.title
    if req.content is not None:
        doc.content = req.content
    if req.content_format is not None:
        doc.content_format = req.content_format
    if req.status is not None:
        doc.status = req.status

    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{doc_id}")
def delete_doc(
    doc_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = get_document_owned(db, user, doc_id)
    db.delete(doc)
    db.commit()
    return {"ok": True}
