/**
 * 文档与对话历史 API：与后端 /documents、/documents/:id/chat_logs 对接。
 */
import { API_BASE } from "@/contexts/AuthContext";
import type { DocumentItem } from "@/types/document";

export interface DocumentOut {
  id: number;
  title: string;
  content: string | null;
  content_format: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ChatLogOut {
  id: number;
  doc_id: number;
  user_id: number;
  role: string;
  ability: string;
  agent_role: string | null;
  content: string;
  request_meta: Record<string, unknown> | null;
  created_at: string;
}

function docOutToItem(doc: DocumentOut): DocumentItem {
  return {
    id: String(doc.id),
    title: doc.title,
    content: doc.content ?? "",
    updatedAt: new Date(doc.updated_at).getTime(),
  };
}

export async function fetchDocuments(
  getAuthHeaders: () => HeadersInit
): Promise<DocumentItem[]> {
  const res = await fetch(`${API_BASE}/documents`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("UNAUTHORIZED");
    throw new Error(`加载文档列表失败: ${res.status}`);
  }
  const list = (await res.json()) as DocumentOut[];
  return list.map(docOutToItem);
}

export async function createDocument(
  getAuthHeaders: () => HeadersInit,
  title?: string
): Promise<DocumentItem> {
  const res = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ title: title ?? "未命名文档" }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("UNAUTHORIZED");
    throw new Error(`创建文档失败: ${res.status}`);
  }
  const doc = (await res.json()) as DocumentOut;
  return docOutToItem(doc);
}

export async function updateDocument(
  getAuthHeaders: () => HeadersInit,
  docId: number,
  patch: { title?: string; content?: string | null }
): Promise<void> {
  const body: Record<string, string | null> = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.content !== undefined) body.content = patch.content;
  const res = await fetch(`${API_BASE}/documents/${docId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("UNAUTHORIZED");
    if (res.status === 404) throw new Error("DOC_NOT_FOUND");
    throw new Error(`更新文档失败: ${res.status}`);
  }
}

export async function deleteDocument(
  getAuthHeaders: () => HeadersInit,
  docId: number
): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${docId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("UNAUTHORIZED");
    if (res.status === 404) throw new Error("DOC_NOT_FOUND");
    throw new Error(`删除文档失败: ${res.status}`);
  }
}

export async function fetchChatLogs(
  getAuthHeaders: () => HeadersInit,
  docId: number
): Promise<ChatLogOut[]> {
  const res = await fetch(`${API_BASE}/documents/${docId}/chat_logs`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("UNAUTHORIZED");
    if (res.status === 404) throw new Error("DOC_NOT_FOUND");
    throw new Error(`加载对话历史失败: ${res.status}`);
  }
  return (await res.json()) as ChatLogOut[];
}

/** 判断文档 id 是否为后端 id（数字字符串） */
export function isBackendDocId(id: string): boolean {
  return /^\d+$/.test(id);
}
