"use client";

import { type ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layout } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "../../components/layout/Header";
import { Sidebar } from "../../components/layout/Sidebar";

const { Content } = Layout;

/**
 * (dashboard) 路由分组下的公共布局
 * 所有 /workspace、/docs、/settings 页面都会套用此布局
 * 未登录时重定向到 /login
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { token, isHydrated } = useAuth();

  useEffect(() => {
    if (isHydrated && !token) router.push("/login");
  }, [isHydrated, token, router]);

  if (!isHydrated || !token) {
    return null;
  }

  return (
    <Layout className="h-screen max-h-screen overflow-hidden">
      <Sidebar />
      <Layout className="flex flex-col h-screen max-h-screen overflow-hidden min-h-0">
        <Header />
        <Content className="flex-1 min-h-0 p-4 !bg-[var(--content-bg)] flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 bg-[var(--panel-bg)] rounded-[var(--border-radius)] shadow-[var(--shadow-sm)] border border-[var(--border-color)] overflow-hidden flex flex-col">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
