from pydantic import BaseModel
from datetime import datetime


class ChatLogOut(BaseModel):
    id: int
    doc_id: int
    user_id: int
    role: str
    ability: str
    agent_role: str | None
    content: str
    request_meta: dict | None
    created_at: datetime

    class Config:
        from_attributes = True
