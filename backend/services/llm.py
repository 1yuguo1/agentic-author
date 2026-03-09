"""
LLM 封装：千问（DashScope OpenAI 兼容接口） via LangChain ChatOpenAI.
"""
from langchain_openai import ChatOpenAI

from config import settings


class LLMNotConfiguredError(Exception):
    """Raised when OPENAI_API_KEY is missing or LLM cannot be created."""


def get_llm() -> ChatOpenAI:
    """Build ChatOpenAI instance for Qwen (DashScope compatible endpoint)."""
    if not settings.openai_api_key or not settings.openai_api_key.strip():
        raise LLMNotConfiguredError("LLM not configured: OPENAI_API_KEY is missing or empty")
    return ChatOpenAI(
        base_url=settings.openai_api_base,
        api_key=settings.openai_api_key,
        model=settings.openai_model,
        max_tokens=settings.openai_max_tokens,
        timeout=settings.openai_timeout,
        temperature=0.7,
    )
