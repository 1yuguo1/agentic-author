import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from db import get_db
from dependencies import get_current_user
from models.user import User
from models.chat_log import ChatLog
from models.document import Document
from schemas.agent import AgentStreamRequest
from services.agent_chain import run_agent_stream
from services.llm import LLMNotConfiguredError

router = APIRouter(prefix="/agents", tags=["agents"])


def sse_event(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/stream")
async def agent_stream(
    req: AgentStreamRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # 取输入文本：优先 req.input_text，其次 doc.content/标题
    input_text = req.input_text

    doc: Document | None = None
    if req.doc_id is not None:
        doc = db.query(Document).filter(Document.id == req.doc_id, Document.user_id == user.id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

    if not input_text:
        if req.ability == "outline":
            input_text = (doc.title if doc else "").strip()
        else:
            input_text = (doc.content if doc and doc.content else "").strip()

    if not input_text:
        raise HTTPException(status_code=400, detail="Missing input_text (and document has no usable content)")

    # 先写一条 user 请求记录（可选）
    if doc:
        db.add(ChatLog(
            doc_id=doc.id,
            user_id=user.id,
            role="user",
            ability=req.ability,
            agent_role=None,
            content=req.user_instruction or "",
            request_meta={"input_len": len(input_text)},
        ))
        db.commit()

    async def generator():
        collected = []
        try:
            async for delta in run_agent_stream(req.ability, input_text=input_text, user_instruction=req.user_instruction):
                collected.append(delta)
                yield sse_event({"delta": delta})
        except LLMNotConfiguredError as e:
            yield sse_event({"error": str(e)})
        except Exception as e:
            yield sse_event({"error": f"LLM error: {e!s}"})
        yield sse_event({"done": True})

        # 把 assistant 完整输出落库（方便“历史记录管理”）
        if doc and collected:
            full = "".join(collected)
            db.add(ChatLog(
                doc_id=doc.id,
                user_id=user.id,
                role="assistant",
                ability=req.ability,
                agent_role="writer" if req.ability in ("expand", "polish", "style") else ("planner" if req.ability == "outline" else "reviewer"),
                content=full,
                request_meta={"stream": True, "output_len": len(full)},
            ))
            db.commit()

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
