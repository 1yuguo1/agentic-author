from pydantic import BaseModel, Field
from typing import Literal


Ability = Literal["outline", "expand", "polish", "proofread", "style"]


class AgentStreamRequest(BaseModel):
    ability: Ability
    doc_id: int | None = None

    input_text: str | None = None
    user_instruction: str | None = None

    # 可选：前端可传“是否需要审校”
    review_pass: bool = Field(default=True)
