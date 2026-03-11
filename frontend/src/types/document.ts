/**
 * 文档数据结构：与文档列表、编辑器、智能体助手共用。
 * 持久化在 WorkspaceContext 的 localStorage 中。
 */
export interface DocumentItem {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}
