from sqlalchemy import String, DateTime, BigInteger, ForeignKey, func, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

    title: Mapped[str] = mapped_column(String(200), default="未命名文档", nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_format: Mapped[str] = mapped_column(String(32), default="plain", nullable=False)  # plain/html/prosemirror_json/markdown
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)          # draft/archived

    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="documents")
    chat_logs = relationship("ChatLog", back_populates="document", cascade="all, delete-orphan")
