"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Form, Input, Button, Card, Typography } from "antd";
import { useAuth } from "@/contexts/AuthContext";

const { Title, Paragraph } = Typography;

/**
 * 登录页面（独立布局，无 Sidebar/Header）
 * 访问路径：/login
 */
export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: { username: string; password: string }) => {
    setError(null);
    setLoading(true);
    try {
      await login(values.username, values.password);
      router.push("/workspace");
    } catch (e) {
      setError(e instanceof Error ? e.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--content-bg)]">
      <Card className="w-[360px] shadow-[var(--shadow-md)] rounded-[var(--border-radius)] border border-[var(--border-color)]">
        <Title level={3} className="text-center !mb-1">
          智能体写作助手
        </Title>
        <Paragraph type="secondary" className="text-center block mb-6">
          请输入账号密码登录
        </Paragraph>
        {error && (
          <div className="mb-3 px-3 py-2 rounded bg-red-50 text-red-600 text-sm border border-red-200">
            {error}
          </div>
        )}
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="账号"
            name="username"
            rules={[{ required: true, message: "请输入账号" }]}
          >
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} size="large">
              登录
            </Button>
          </Form.Item>
        </Form>
        <div className="text-center text-sm text-neutral-500 mt-2">
          还没有账号？{" "}
          <Link href="/register" className="text-[var(--sidebar-active-color)] hover:underline">
            立即注册
          </Link>
        </div>
      </Card>
    </div>
  );
}
