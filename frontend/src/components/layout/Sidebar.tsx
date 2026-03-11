"use client";

import { Layout, Menu } from "antd";
import {
  FileTextOutlined,
  EditOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";

const { Sider } = Layout;

const items = [
  { key: "/workspace", icon: <EditOutlined />, label: "写作工作台" },
  { key: "/docs", icon: <FileTextOutlined />, label: "文档管理" },
  { key: "/settings", icon: <SettingOutlined />, label: "设置" },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Sider width={220} className="!bg-[var(--sidebar-bg)] border-r border-[var(--border-color)] flex flex-col">
      {/* 品牌区 */}
      <div className="shrink-0 h-14 flex items-center px-5 border-b border-[var(--border-color)]">
        <span className="text-base font-semibold text-[#1a1a1a] dark:text-neutral-100">
          写作助手
        </span>
      </div>
      {/* 导航菜单 - 占据剩余空间 */}
      <div className="flex-1 py-3 px-3 overflow-auto">
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          items={items}
          onClick={(info) => router.push(info.key)}
          className="!border-0 !bg-transparent workspace-sidebar-menu"
        />
      </div>
      {/* 底部用户区 */}
      <div className="shrink-0 p-3 border-t border-[var(--border-color)]">
        <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--border-radius)] text-sm text-neutral-500">
          <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-600 flex items-center justify-center shrink-0">
            <UserOutlined className="text-neutral-500" />
          </div>
          <span className="truncate">测试用户</span>
        </div>
      </div>
    </Sider>
  );
}
