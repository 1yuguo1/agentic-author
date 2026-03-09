from typing import AsyncGenerator

from langchain_core.messages import HumanMessage

from schemas.agent import Ability
from services.llm import LLMNotConfiguredError, get_llm


def build_prompt(ability: Ability, input_text: str, user_instruction: str | None) -> str:
    instruction = user_instruction or ""
    if ability == "outline":
        return f"请为主题生成多级论文/文章大纲：\n主题：{input_text}\n补充要求：{instruction}\n"
    if ability == "expand":
        return f"请对以下内容进行扩写，逻辑清晰，分段输出：\n{input_text}\n补充要求：{instruction}\n"
    if ability == "polish":
        return f"请润色以下文本，使其更学术/更通顺：\n{input_text}\n补充要求：{instruction}\n"
    if ability == "proofread":
        return f"请纠错（错别字、语病、标点、逻辑不通），给出修改后文本：\n{input_text}\n"
    if ability == "style":
        return f"请将下文改写为指定风格（如正式/幽默/学术）：\n{input_text}\n风格要求：{instruction}\n"
    return input_text


def _chunk_content(chunk) -> str:
    """Extract string content from a LangChain stream chunk (AIMessageChunk or similar)."""
    content = getattr(chunk, "content", chunk)
    if isinstance(content, str):
        return content
    return str(content) if content is not None else ""


async def run_agent_stream(
    ability: Ability,
    input_text: str,
    user_instruction: str | None,
) -> AsyncGenerator[str, None]:
    try:
        llm = get_llm()
    except LLMNotConfiguredError:
        raise

    prompt = build_prompt(ability, input_text=input_text, user_instruction=user_instruction)
    messages = [HumanMessage(content=prompt)]

    async for chunk in llm.astream(messages):
        delta = _chunk_content(chunk)
        if delta:
            yield delta
