"use client";

import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { DocumentListPanel } from "@/components/workspace/DocumentListPanel";
import { EditorPanel } from "@/components/workspace/EditorPanel";
import { AgentAssistantPanel } from "@/components/workspace/AgentAssistantPanel";

/**
 * 写作工作台主页面
 * 三栏布局：左侧文档列表 | 中间编辑器 | 右侧智能体助手
 */
export default function WorkspacePage() {
  return (
    <WorkspaceProvider>
      <div className="flex flex-1 min-h-0">
        <DocumentListPanel />
        <EditorPanel />
        <AgentAssistantPanel />
      </div>
    </WorkspaceProvider>
  );
}
