from sqlalchemy import String, DateTime, BigInteger, ForeignKey, func, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.mysql import JSON
from db import Base


class ChatLog(Base):
    __tablename__ = "chat_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    doc_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

    role: Mapped[str] = mapped_column(String(16), nullable=False)          # user/assistant/system
    ability: Mapped[str] = mapped_column(String(32), nullable=False)       # outline/expand/polish/proofread/style
    agent_role: Mapped[str | None] = mapped_column(String(32), nullable=True)  # planner/writer/reviewer

    content: Mapped[str] = mapped_column(Text, nullable=False)
    request_meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    document = relationship("Document", back_populates="chat_logs")
