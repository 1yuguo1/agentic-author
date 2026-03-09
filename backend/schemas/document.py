from pydantic import BaseModel
from datetime import datetime


class DocumentCreateRequest(BaseModel):
    title: str | None = None


class DocumentUpdateRequest(BaseModel):
    title: str | None = None
    content: str | None = None
    content_format: str | None = None
    status: str | None = None


class DocumentOut(BaseModel):
    id: int
    title: str
    content: str | None
    content_format: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
