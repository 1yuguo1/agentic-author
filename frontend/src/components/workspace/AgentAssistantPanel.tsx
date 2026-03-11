"use client";

/**
 * 智能体助手面板：展示当前文档/选区上下文、快捷能力按钮、对话列表、结果插入编辑器。
 * 对话区固定高度内滚动，流式输出不撑高页面；助手回复使用 Markdown 渲染；输入区为富文本。
 */
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Checkbox, Empty, Typography } from "antd";
import {
  CheckCircleOutlined,
  CopyOutlined,
  EditOutlined,
  EnterOutlined,
  HighlightOutlined,
  ReloadOutlined,
  StopOutlined,
  ThunderboltOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth, API_BASE } from "@/contexts/AuthContext";
import { isBackendDocId, fetchChatLogs } from "@/lib/documentsApi";
import type { ChatLogOut } from "@/lib/documentsApi";
import { RichTextInput, type RichTextInputRef } from "./RichTextInput";

const { Text } = Typography;

type MessageRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  ability?: string;
}

const ABILITIES = [
  { key: "outline", label: "列大纲", icon: <UnorderedListOutlined /> },
  { key: "expand", label: "扩写", icon: <ThunderboltOutlined /> },
  { key: "polish", label: "润色", icon: <HighlightOutlined /> },
  { key: "proofread", label: "纠错", icon: <CheckCircleOutlined /> },
  { key: "style", label: "改风格", icon: <EditOutlined /> },
] as const;

const STYLE_PRESETS = ["正式", "学术", "口语", "简洁"] as const;

type AbilityKey = (typeof ABILITIES)[number]["key"];

function chatLogsToMessages(logs: ChatLogOut[]): ChatMessage[] {
  return logs.map((log) => ({
    id: `log-${log.id}`,
    role: log.role as MessageRole,
    content: log.content,
    ability: log.role === "user" ? (ABILITIES.find((a) => a.key === log.ability)?.label ?? log.ability) : undefined,
  }));
}

const isErrorContent = (c: string) =>
  c.startsWith("错误：") || c.startsWith("请求异常：") || c.startsWith("[错误]");

/** 渲染单条助手消息（Markdown + 操作按钮） */
function AssistantMessageContent({
  content,
  loading,
  onCopy,
  onInsertAppend,
  onInsertReplace,
  onRetry,
  hasSelection,
}: {
  content: string;
  loading: boolean;
  onCopy: (c: string) => void;
  onInsertAppend: (c: string) => void;
  onInsertReplace: (c: string) => void;
  onRetry?: () => void;
  hasSelection: boolean;
}) {
  const showRetry = onRetry && content && isErrorContent(content);
  return (
    <div className="space-y-2">
      <div className="text-sm text-[var(--foreground)] chat-markdown">
        {content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        ) : loading ? (
          <span className="text-neutral-500 inline-flex items-center gap-1">
            思考中
            <span className="inline-block w-2 h-4 ml-0.5 bg-[var(--sidebar-active-color)] animate-pulse" aria-hidden />
          </span>
        ) : null}
      </div>
      {content && (
        <div className="flex gap-2 flex-wrap pt-1">
          {showRetry && (
            <Button size="small" icon={<ReloadOutlined />} onClick={onRetry}>
              重试
            </Button>
          )}
          <Button size="small" icon={<CopyOutlined />} onClick={() => onCopy(content)}>
            复制
          </Button>
          <Button size="small" icon={<EnterOutlined />} onClick={() => onInsertAppend(content)}>
            插入文末
          </Button>
          {hasSelection && (
            <Button size="small" onClick={() => onInsertReplace(content)}>
              替换选中
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function AgentAssistantPanel() {
  const router = useRouter();
  const {
    currentDoc,
    currentDocId,
    selection,
    insertIntoEditor,
  } = useWorkspace();
  const { getAuthHeaders, logout } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAbility, setSelectedAbility] = useState<string | null>(null);
  const [reviewPass, setReviewPass] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const richInputRef = useRef<RichTextInputRef>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const contextLabel = !currentDocId
    ? null
    : selection.trim()
      ? `基于选中 ${selection.replace(/\s/g, "").length} 字`
      : currentDoc
        ? `基于《${currentDoc.title || "未命名"}》全文`
        : null;

  /** 切换文档时加载该文档的对话历史（仅后端文档） */
  useEffect(() => {
    if (!currentDocId || !isBackendDocId(currentDocId)) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    fetchChatLogs(getAuthHeaders, parseInt(currentDocId, 10))
      .then((logs) => {
        if (cancelled) return;
        const msgs = chatLogsToMessages(logs);
        setMessages(msgs);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentDocId, getAuthHeaders]);

  /** 流式或消息变化时滚动到底部 */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /** 调用后端 /agents/stream，SSE 流式追加到 assistant 消息 */
  const sendRequest = async (abilityKey: AbilityKey, abilityLabel: string, userInstruction: string) => {
    let inputText = selection.trim() || (currentDoc?.content ?? "").trim();
    if (!inputText && abilityKey === "outline" && currentDoc?.title?.trim()) {
      inputText = currentDoc.title.trim();
    }
    const ts = Date.now();
    const assistantId = `assistant-${ts}`;
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${ts}`,
        role: "user",
        content: userInstruction || abilityLabel,
        ability: abilityLabel,
      },
      {
        id: assistantId,
        role: "assistant",
        content: "",
      },
    ]);
    richInputRef.current?.clear();
    setLoading(true);
    abortRef.current = new AbortController();
    let accumulated = "";

    if (!inputText) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "请先在编辑器中输入内容或选中文本后再使用此功能。" }
            : m
        )
      );
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/agents/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          ability: abilityKey,
          doc_id: currentDocId && isBackendDocId(currentDocId) ? parseInt(currentDocId, 10) : null,
          input_text: inputText,
          user_instruction: userInstruction || undefined,
          review_pass: reviewPass,
        }),
        signal: abortRef.current.signal,
      });

      if (res.status === 401) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: "请先登录后再使用智能体。" } : m
          )
        );
        logout();
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.detail ?? `请求失败 (${res.status})`;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: `错误：${JSON.stringify(msg)}` } : m
          )
        );
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: "无法读取响应流" } : m))
        );
        return;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          try {
            const payload = JSON.parse(trimmed.slice(5).trim()) as {
              delta?: string;
              error?: string;
              done?: boolean;
            };
            if (payload.error) {
              accumulated += `\n[错误] ${payload.error}`;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
              );
              break;
            }
            if (payload.delta) {
              accumulated += payload.delta;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
              );
            }
            if (payload.done) break;
          } catch {
            // ignore
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `请求异常：${(e as Error).message}` }
            : m
        )
      );
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleAbilityClick = (key: string) => {
    setSelectedAbility((prev) => (prev === key ? null : key));
    richInputRef.current?.focus();
  };

  const handleStylePreset = (preset: string) => {
    sendRequest("style", "改风格", preset);
    setSelectedAbility(null);
  };

  const handleSubmit = () => {
    const text = richInputRef.current?.getText().trim() ?? "";
    if (!selectedAbility && !text) return;
    const abilityKey = selectedAbility ?? "expand";
    const abilityLabel = ABILITIES.find((a) => a.key === abilityKey)?.label ?? "扩写";
    sendRequest(abilityKey as AbilityKey, abilityLabel, text);
    setSelectedAbility(null);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleInsert = (content: string, mode: "append" | "replace") => {
    insertIntoEditor(content, mode);
  };

  const noContext = !currentDocId;
  const emptyState = !currentDocId
    ? "请先选择或创建文档"
    : "在编辑器中输入内容后，AI 将为您提供写作建议";

  return (
    <aside className="w-[360px] shrink-0 flex flex-col min-h-0 bg-[var(--sidebar-bg)] border-l border-[var(--border-color)]">
      <div className="shrink-0 px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-2">
        <ThunderboltOutlined className="text-[var(--sidebar-active-color)]" />
        <Text strong className="text-[15px]">
          写作助手
        </Text>
      </div>
      {contextLabel && (
        <div className="shrink-0 px-4 py-2 border-b border-[var(--border-color)] bg-[var(--panel-bg)]">
          <Text type="secondary" className="text-xs">
            {contextLabel}
          </Text>
        </div>
      )}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4">
          {messages.length === 0 && !loading ? (
            <div className="flex-1 min-h-full flex flex-col items-center justify-center">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span className="text-neutral-500 text-sm max-w-[240px] text-center block">
                    {emptyState}
                  </span>
                }
                className="py-8"
              />
              <Text type="secondary" className="text-xs mt-2 text-center block">
                选择下方能力或输入说明后发送
              </Text>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => {
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const isFailedAssistant =
                  msg.role === "assistant" &&
                  msg.content &&
                  isErrorContent(msg.content) &&
                  prevMsg?.role === "user";
                const onRetry =
                  isFailedAssistant && prevMsg
                    ? () => {
                        setMessages((m) => m.slice(0, index - 1));
                        const abilityKey =
                          (ABILITIES.find((a) => a.label === prevMsg.ability)?.key as AbilityKey) ?? "expand";
                        const abilityLabel = prevMsg.ability ?? "扩写";
                        sendRequest(abilityKey, abilityLabel, prevMsg.content);
                      }
                    : undefined;
                return (
                  <div
                    key={msg.id}
                    className={
                      msg.role === "user"
                        ? "flex justify-end"
                        : "flex gap-2 text-left"
                    }
                  >
                    {msg.role === "assistant" && (
                      <span
                        className="shrink-0 w-6 h-6 rounded-full bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-color)] flex items-center justify-center text-xs"
                        aria-hidden
                      >
                        <ThunderboltOutlined />
                      </span>
                    )}
                    <div
                      className={
                        msg.role === "user"
                          ? "max-w-[85%] rounded-[var(--border-radius)] px-3 py-2 bg-[var(--sidebar-active-bg)] text-right"
                          : "flex-1 min-w-0 bg-[var(--panel-bg)] rounded-[var(--border-radius)] p-3 border border-[var(--border-color)]"
                      }
                    >
                      {msg.role === "user" && msg.ability && (
                        <Text type="secondary" className="text-xs block mb-1">
                          {msg.ability}
                        </Text>
                      )}
                      {msg.role === "user" ? (
                        <Text className="text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </Text>
                      ) : (
                      <AssistantMessageContent
                        content={msg.content}
                        loading={loading && msg.content === ""}
                        onCopy={handleCopy}
                        onInsertAppend={(c) => handleInsert(c, "append")}
                        onInsertReplace={(c) => handleInsert(c, "replace")}
                        onRetry={onRetry}
                        hasSelection={!!selection?.trim()}
                      />
                    )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div ref={messagesEndRef} aria-hidden />
        </div>
        <div className="shrink-0 p-3 border-t border-[var(--border-color)] bg-[var(--sidebar-bg)]">
          <Text type="secondary" className="text-xs block mb-2">
            快捷能力
          </Text>
          <div className="flex flex-wrap gap-2 mb-2">
            {ABILITIES.map(({ key, label, icon }) => (
              <Button
                key={key}
                size="small"
                icon={icon}
                type={selectedAbility === key ? "primary" : "default"}
                onClick={() => handleAbilityClick(key)}
                disabled={noContext}
              >
                {label}
              </Button>
            ))}
          </div>
          {selectedAbility === "style" && (
            <div className="mb-2">
              <Text type="secondary" className="text-xs block mb-1">
                风格预设
              </Text>
              <div className="flex flex-wrap gap-1">
                {STYLE_PRESETS.map((preset) => (
                  <Button
                    key={preset}
                    size="small"
                    onClick={() => handleStylePreset(preset)}
                    disabled={noContext || loading}
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="shrink-0 p-3 border-t border-[var(--border-color)] bg-[var(--panel-bg)]">
          <Checkbox
            checked={reviewPass}
            onChange={(e) => setReviewPass(e.target.checked)}
            className="mb-2 text-xs text-neutral-500"
          >
            完成后审校
          </Checkbox>
          <RichTextInput
            ref={richInputRef}
            placeholder="先选能力（如扩写），可输入补充说明，Enter 或点击发送"
            minHeight={72}
            maxHeight={160}
            disabled={noContext}
            onSubmit={handleSubmit}
          />
          <div className="flex gap-2 mt-2">
            {loading ? (
              <Button
                size="small"
                icon={<StopOutlined />}
                block
                onClick={() => abortRef.current?.abort()}
              >
                停止生成
              </Button>
            ) : (
              <Button
                type="primary"
                size="small"
                block
                onClick={handleSubmit}
                disabled={noContext}
              >
                发送
              </Button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
