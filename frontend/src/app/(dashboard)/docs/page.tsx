"use client";

import { Typography } from "antd";

const { Title, Paragraph } = Typography;

/**
 * 文档管理页面
 * 展示所有文档列表，支持搜索和筛选
 */
export default function DocsPage() {
  return (
    <div className="p-6">
      <Title level={3}>文档管理</Title>
      <Paragraph type="secondary">
        这里将展示你的所有文档列表，支持搜索和筛选。
      </Paragraph>
      {/* TODO: 文档列表组件 */}
    </div>
  );
}
