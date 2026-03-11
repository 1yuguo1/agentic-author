import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ConfigProvider } from "antd";

import { AuthProvider } from "@/contexts/AuthContext";
import "antd/dist/reset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "智能体写作助手",
  description: "基于智能体的写作助手",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <ConfigProvider theme={{ token: { colorPrimary: "#1677ff" } }}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}