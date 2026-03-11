"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const TOKEN_KEY = "writing-assistant-token";

function loadToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export interface AuthContextValue {
  token: string | null;
  isHydrated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => void;
  getAuthHeaders: () => HeadersInit;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setTokenState(loadToken());
    setIsHydrated(true);
  }, []);

  const setToken = useCallback((value: string | null) => {
    setTokenState(value);
    if (typeof window === "undefined") return;
    if (value === null) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, value);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.detail ?? (typeof data.detail === "string" ? data.detail : "登录失败");
        throw new Error(Array.isArray(msg) ? msg[0]?.msg ?? "登录失败" : msg);
      }
      const accessToken = data.access_token;
      if (!accessToken) throw new Error("登录失败：未返回 token");
      setToken(accessToken);
    },
    [setToken]
  );

  const register = useCallback(
    async (username: string, password: string, email?: string) => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email: email || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.detail ?? (typeof data.detail === "string" ? data.detail : "注册失败");
        throw new Error(Array.isArray(msg) ? msg[0]?.msg ?? msg : msg);
      }
      // 注册成功后自动登录
      await login(username, password);
    },
    [login]
  );

  const logout = useCallback(() => {
    setToken(null);
  }, [setToken]);

  const getAuthHeaders = useCallback((): HeadersInit => {
    const t = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : token;
    if (!t) return {};
    return { Authorization: `Bearer ${t}` };
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({ token: token ?? loadToken(), isHydrated, login, register, logout, getAuthHeaders }),
    [token, isHydrated, login, register, logout, getAuthHeaders]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { API_BASE };
