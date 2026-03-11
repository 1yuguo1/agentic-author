"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Form, Input, Button, Card, Typography } from "antd";
import { useAuth } from "@/contexts/AuthContext";

const { Title, Paragraph } = Typography;

/**
 * 注册页面
 * 访问路径：/register
 */
export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: { username: string; password: string; email?: string }) => {
    setError(null);
    setLoading(true);
    try {
      await register(values.username, values.password, values.email?.trim() || undefined);
      router.push("/workspace");
    } catch (e) {
      setError(e instanceof Error ? e.message : "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--content-bg)]">
      <Card className="w-[400px] shadow-[var(--shadow-md)] rounded-[var(--border-radius)] border border-[var(--border-color)]">
        <Title level={3} className="text-center !mb-1">
          创建账号
        </Title>
        <Paragraph type="secondary" className="text-center block mb-6">
          注册后即可使用智能体写作助手
        </Paragraph>
        {error && (
          <div className="mb-3 px-3 py-2 rounded bg-red-50 text-red-600 text-sm border border-red-200">
            {error}
          </div>
        )}
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: "请输入用户名" },
              { min: 3, message: "用户名至少 3 个字符" },
              { max: 50, message: "用户名最多 50 个字符" },
            ]}
          >
            <Input placeholder="3–50 个字符" autoComplete="username" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: "请输入密码" },
              { min: 6, message: "密码至少 6 个字符" },
            ]}
          >
            <Input.Password placeholder="至少 6 个字符" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            label="确认密码"
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: "请确认密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) return Promise.resolve();
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="再次输入密码" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            label="邮箱（选填）"
            name="email"
            rules={[{ type: "email", message: "请输入有效的邮箱地址" }]}
          >
            <Input placeholder="用于找回密码等" autoComplete="email" />
          </Form.Item>
          <Form.Item className="mb-4">
            <Button type="primary" htmlType="submit" block loading={loading} size="large">
              注册
            </Button>
          </Form.Item>
          <div className="text-center text-sm text-neutral-500">
            已有账号？{" "}
            <Link href="/login" className="text-[var(--sidebar-active-color)] hover:underline">
              去登录
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
