"use client";

import { Layout, Typography, Space, Badge } from "antd";

const { Header: AntHeader } = Layout;
const { Text } = Typography;

export function Header() {
  return (
    <AntHeader className="flex items-center justify-between px-6 h-14 !bg-[var(--header-bg)] border-b border-[var(--border-color)]">
      <Text strong className="text-base">智能体写作助手 · 工作台</Text>
      <Space size="middle">
        <Badge status="success" text={<span className="text-sm text-neutral-600">已连接</span>} />
        <Text type="secondary" className="text-sm">测试用户</Text>
      </Space>
    </AntHeader>
  );
}
