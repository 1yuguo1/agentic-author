from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db import get_db
from dependencies import get_current_user
from models.user import User
from models.chat_log import ChatLog
from services.document import get_document_owned
from schemas.chat import ChatLogOut

router = APIRouter(prefix="/documents", tags=["chat"])


@router.get("/{doc_id}/chat_logs", response_model=list[ChatLogOut])
def list_chat_logs(
    doc_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _ = get_document_owned(db, user, doc_id)
    logs = (
        db.query(ChatLog)
        .filter(ChatLog.doc_id == doc_id, ChatLog.user_id == user.id)
        .order_by(ChatLog.created_at.asc())
        .all()
    )
    return logs
