"use client";

import { Empty, Input, Typography } from "antd";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useEffect, useRef } from "react";

const { Text } = Typography;
const { TextArea } = Input;

/**
 * 编辑器面板：展示当前文档标题与正文，同步选区供智能体使用，并响应「插入文末/替换选中」。
 */
export function EditorPanel() {
  const {
    currentDoc,
    currentDocId,
    updateDoc,
    setSelection,
    registerInsertIntoEditor,
  } = useWorkspace();
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // 向工作台注册「插入到编辑器」的实现：智能体结果可插入文末或替换当前选区
  useEffect(() => {
    const handler = (text: string, mode: "append" | "replace") => {
      const textarea = contentRef.current;
      if (!textarea || !currentDocId) return;
      const before = textarea.value;
      if (mode === "replace" && textarea.selectionStart !== textarea.selectionEnd) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = before.slice(0, start) + text + before.slice(end);
        updateDoc(currentDocId, { content: newContent });
        setTimeout(() => {
          textarea.focus();
          const pos = start + text.length;
          textarea.setSelectionRange(pos, pos);
        }, 0);
      } else {
        const newContent = before + (before.endsWith("\n") ? "" : "\n\n") + text;
        updateDoc(currentDocId, { content: newContent });
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(newContent.length, newContent.length);
        }, 0);
      }
    };
    registerInsertIntoEditor(handler);
    return () => registerInsertIntoEditor(null);
  }, [currentDocId, updateDoc, registerInsertIntoEditor]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (!currentDocId) return;
    updateDoc(currentDocId, { title: v });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    if (!currentDocId) return;
    updateDoc(currentDocId, { content: v });
  };

  // 选区变化时同步到 context，供智能体助手作为「基于选中 N 字」的上下文
  const handleContentSelect = () => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setSelection(textarea.value.slice(start, end));
  };

  const wordCount = currentDoc
    ? currentDoc.content.replace(/\s/g, "").length
    : 0;

  if (!currentDocId || !currentDoc) {
    return (
      <main className="flex-1 min-w-0 min-h-0 flex flex-col border-r border-[var(--border-color)] bg-[var(--panel-bg)]">
        <div className="px-4 py-3 border-b border-[var(--border-color)]">
          <Text strong className="text-[15px]">
            编辑器
          </Text>
        </div>
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-neutral-500 text-sm">
                选择或创建文档开始写作
              </span>
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 min-w-0 min-h-0 flex flex-col border-r border-[var(--border-color)] bg-[var(--panel-bg)]">
      <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
        <Text strong className="text-[15px]">
          编辑器
        </Text>
        <Text type="secondary" className="text-xs">
          {wordCount} 字
        </Text>
      </div>
      <div className="flex-1 flex flex-col min-h-0 p-4 overflow-hidden">
        <Input
          value={currentDoc.title}
          onChange={handleTitleChange}
          placeholder="文档标题"
          className="text-lg font-medium mb-3 rounded shrink-0"
          variant="borderless"
        />
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <TextArea
            ref={contentRef}
            value={currentDoc.content}
            onChange={handleContentChange}
            onSelect={handleContentSelect}
            placeholder="开始写作…"
            className="flex-1 min-h-[120px] resize-none rounded overflow-auto"
            styles={{ textarea: { height: "100%", minHeight: "120px", resize: "none" } }}
          />
        </div>
        <div className="mt-2 flex justify-end">
          <Text type="secondary" className="text-xs">
            {wordCount} 字
          </Text>
        </div>
      </div>
    </main>
  );
}
