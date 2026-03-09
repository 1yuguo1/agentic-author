from sqlalchemy.orm import Session
from fastapi import HTTPException
from models.document import Document
from models.user import User


def create_document(db: Session, user: User, title: str | None) -> Document:
    doc = Document(user_id=user.id, title=title or "未命名文档", content=None)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def get_document_owned(db: Session, user: User, doc_id: int) -> Document:
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc
