"use client";

/**
 * 工作台全局状态：文档列表（与后端同步）、当前文档、编辑器选区，以及「插入到编辑器」的桥接。
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DocumentItem } from "@/types/document";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  isBackendDocId,
} from "@/lib/documentsApi";

export type InsertMode = "append" | "replace";
export type InsertIntoEditorHandler = (text: string, mode: InsertMode) => void;

const CONTENT_DEBOUNCE_MS = 600;

export interface WorkspaceContextValue {
  docList: DocumentItem[];
  currentDocId: string | null;
  currentDoc: DocumentItem | null;
  selection: string;
  docsLoading: boolean;
  docsError: string | null;
  createDoc: () => Promise<string>;
  selectDoc: (id: string | null) => void;
  updateDoc: (id: string, patch: Partial<Pick<DocumentItem, "title" | "content">>) => void;
  deleteDoc: (id: string) => void;
  setSelection: (text: string) => void;
  registerInsertIntoEditor: (handler: InsertIntoEditorHandler | null) => void;
  insertIntoEditor: (text: string, mode: InsertMode) => void;
  refreshDocList: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { getAuthHeaders } = useAuth();
  const [docList, setDocList] = useState<DocumentItem[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [selection, setSelectionState] = useState("");
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState<string | null>(null);
  const insertHandlerRef = useRef<InsertIntoEditorHandler | null>(null);
  const contentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = useRef<Record<string, string>>({});

  const currentDoc = useMemo(
    () => docList.find((d) => d.id === currentDocId) ?? null,
    [docList, currentDocId]
  );

  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    setDocsError(null);
    try {
      const list = await fetchDocuments(getAuthHeaders);
      setDocList(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "加载失败";
      setDocsError(msg === "UNAUTHORIZED" ? null : msg);
      setDocList([]);
    } finally {
      setDocsLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  /** 新建文档（后端），设为当前，返回新文档 id */
  const createDoc = useCallback(async (): Promise<string> => {
    const item = await createDocument(getAuthHeaders, "未命名文档");
    setDocList((prev) => [item, ...prev]);
    setCurrentDocId(item.id);
    return item.id;
  }, [getAuthHeaders]);

  const selectDoc = useCallback((id: string | null) => {
    setCurrentDocId(id);
  }, []);

  /** 更新文档：先乐观更新本地，后端文档则发起 PATCH（content 防抖） */
  const updateDoc = useCallback(
    (id: string, patch: Partial<Pick<DocumentItem, "title" | "content">>) => {
      setDocList((prev) => {
        const next = prev.map((d) =>
          d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d
        );
        return next;
      });

      if (!isBackendDocId(id)) return;
      const docIdNum = parseInt(id, 10);

      if (patch.title !== undefined) {
        updateDocument(getAuthHeaders, docIdNum, { title: patch.title }).catch(() => {});
      }
      if (patch.content !== undefined) {
        pendingContentRef.current[id] = patch.content;
        if (contentDebounceRef.current) clearTimeout(contentDebounceRef.current);
        contentDebounceRef.current = setTimeout(() => {
          contentDebounceRef.current = null;
          const content = pendingContentRef.current[id];
          delete pendingContentRef.current[id];
          if (content !== undefined) {
            updateDocument(getAuthHeaders, docIdNum, { content }).catch(() => {});
          }
        }, CONTENT_DEBOUNCE_MS);
      }
    },
    [getAuthHeaders]
  );

  const deleteDoc = useCallback(
    (id: string) => {
      if (isBackendDocId(id)) {
        deleteDocument(getAuthHeaders, parseInt(id, 10)).catch(() => {});
      }
      setDocList((prev) => prev.filter((d) => d.id !== id));
      if (currentDocId === id) setCurrentDocId(null);
    },
    [getAuthHeaders, currentDocId]
  );

  const setSelection = useCallback((text: string) => {
    setSelectionState(text);
  }, []);

  /** 由 EditorPanel 挂载时注册，用于智能体「插入文末/替换选中」时写回编辑器 */
  const registerInsertIntoEditor = useCallback((handler: InsertIntoEditorHandler | null) => {
    insertHandlerRef.current = handler;
  }, []);

  /** 智能体调用：将文本插入当前编辑器（append 或 replace 选区），并清空选区状态 */
  const insertIntoEditor = useCallback((text: string, mode: InsertMode) => {
    insertHandlerRef.current?.(text, mode);
    setSelectionState("");
  }, []);

  useEffect(() => {
    return () => {
      if (contentDebounceRef.current) clearTimeout(contentDebounceRef.current);
    };
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      docList,
      currentDocId,
      currentDoc,
      selection,
      docsLoading,
      docsError,
      createDoc,
      selectDoc,
      updateDoc,
      deleteDoc,
      setSelection,
      registerInsertIntoEditor,
      insertIntoEditor,
      refreshDocList: loadDocs,
    }),
    [
      docList,
      currentDocId,
      currentDoc,
      selection,
      docsLoading,
      docsError,
      createDoc,
      selectDoc,
      updateDoc,
      deleteDoc,
      setSelection,
      registerInsertIntoEditor,
      insertIntoEditor,
      loadDocs,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
