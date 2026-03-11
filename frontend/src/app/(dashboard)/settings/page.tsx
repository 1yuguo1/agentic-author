"use client";

import { Typography, Form, Select, InputNumber, Card } from "antd";

const { Title } = Typography;

/**
 * 设置页面
 * 智能体参数、UI 偏好等
 */
export default function SettingsPage() {
  return (
    <div className="p-6">
    <Card>
      <Title level={3}>设置</Title>
      <Form layout="vertical" className="max-w-[480px]">
        <Form.Item
          label="智能体写作风格"
          name="style"
          initialValue="academic"
        >
          <Select
            options={[
              { label: "学术严谨", value: "academic" },
              { label: "创意自由", value: "creative" },
              { label: "中性平衡", value: "neutral" },
            ]}
          />
        </Form.Item>
        <Form.Item
          label="最大回复长度"
          name="maxTokens"
          initialValue={512}
        >
          <InputNumber min={64} max={2048} className="w-full" />
        </Form.Item>
        {/* TODO: 主题、语言等设置 */}
      </Form>
    </Card>
    </div>
  );
}
