"use client";

/**
 * 文档列表面板：新建、列表（按最近编辑排序）、搜索、选中、重命名、删除。
 * 选中项与 WorkspaceContext.currentDocId 同步，驱动编辑器和智能体上下文。
 */
import { Button, Empty, Input, Dropdown, Typography } from "antd";
import { PlusOutlined, SearchOutlined, MoreOutlined } from "@ant-design/icons";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { DocumentItem } from "@/types/document";
import { useMemo, useState } from "react";

const { Text } = Typography;

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function wordCount(content: string): number {
  return content.replace(/\s/g, "").length;
}

export function DocumentListPanel() {
  const { docList, currentDocId, createDoc, selectDoc, updateDoc, deleteDoc, docsLoading, docsError, refreshDocList } =
    useWorkspace();
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [creating, setCreating] = useState(false);

  // 列表按最近编辑时间倒序；有搜索词时按标题过滤
  const filteredList = useMemo(() => {
    const sorted = [...docList].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!search.trim()) return sorted;
    const q = search.trim().toLowerCase();
    return sorted.filter((d) => d.title.toLowerCase().includes(q));
  }, [docList, search]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createDoc();
    } finally {
      setCreating(false);
    }
  };

  const startRename = (doc: DocumentItem) => {
    setRenamingId(d.id);
    setRenameValue(d.title);
  };

  const submitRename = (id: string) => {
    const v = renameValue.trim();
    if (v) updateDoc(id, { title: v });
    setRenamingId(null);
    setRenameValue("");
  };

  // 每项下拉：重命名（内联编辑）、删除

  const itemMenu = (doc: DocumentItem) => ({
    items: [
      { key: "rename", label: "重命名", onClick: () => startRename(doc) },
      {
        key: "delete",
        label: "删除",
        danger: true,
        onClick: () => deleteDoc(doc.id),
      },
    ],
  });

  return (
    <aside className="w-[240px] shrink-0 min-h-0 border-r border-[var(--border-color)] flex flex-col bg-[var(--panel-bg)]">
      <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between gap-2">
        <Text strong className="text-[15px]">
          文档列表
        </Text>
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          loading={creating}
          disabled={docsLoading}
        >
          新建
        </Button>
      </div>
      {docList.length > 3 && (
        <div className="p-2 border-b border-[var(--border-color)]">
          <Input
            placeholder="搜索文档"
            prefix={<SearchOutlined className="text-neutral-400" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            size="small"
            className="rounded"
          />
        </div>
      )}
      <div className="flex-1 overflow-auto p-2">
        {docsError && (
          <div className="px-2 py-1 text-xs text-red-500 mb-2 flex items-center justify-between gap-2">
            <span>{docsError}</span>
            <Button type="link" size="small" onClick={() => refreshDocList()}>
              重试
            </Button>
          </div>
        )}
        {docsLoading && docList.length === 0 ? (
          <div className="py-8 text-center text-neutral-500 text-sm">
            加载中…
          </div>
        ) : filteredList.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-neutral-500 text-sm">
                {docList.length === 0 ? "暂无文档" : "无匹配文档"}
              </span>
            }
            className="py-8"
          >
            {docList.length === 0 && (
              <Button type="primary" size="small" onClick={handleCreate} loading={creating}>
                新建文档
              </Button>
            )}
          </Empty>
        ) : (
          <div className="space-y-1" role="list">
            {filteredList.map((doc) => {
              const isSelected = currentDocId === doc.id;
              const isRenaming = renamingId === doc.id;
              return (
                <div
                  key={doc.id}
                  role="listitem"
                  className="px-2 py-1.5 rounded-[var(--border-radius)] cursor-pointer group"
                  style={{
                    background: isSelected ? "var(--sidebar-active-bg)" : undefined,
                  }}
                  onClick={() => !isRenaming && selectDoc(doc.id)}
                >
                  <div className="w-full min-w-0 flex items-center gap-1">
                    {isRenaming ? (
                      <Input
                        size="small"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onPressEnter={() => submitRename(doc.id)}
                        onBlur={() => submitRename(doc.id)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="rounded flex-1 min-w-0"
                      />
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate text-sm">
                            {doc.title || "未命名文档"}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {formatTime(doc.updatedAt)} · {wordCount(doc.content)} 字
                          </div>
                        </div>
                        <Dropdown
                          menu={itemMenu(doc)}
                          trigger={["click"]}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<MoreOutlined />}
                            className="opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Dropdown>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
