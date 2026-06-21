import { createContext, useContext, useState, type ReactNode } from "react";
import { API_URL } from "./api";
import { getToken, setToken } from "./session";
import type { Role, User } from "./mock-data";

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, orgName: string) => Promise<void>;
  logout: () => void;
  setRole: (role: Role) => void;
};

type BackendUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  org_name: string;
};

type TokenResponse = {
  access_token: string;
  user: BackendUser;
};

const AuthContext = createContext<AuthContextType | null>(null);
const STORAGE_KEY = "docpilot_user";

function toUser(backendUser: BackendUser): User {
  return {
    id: backendUser.id,
    name: backendUser.name,
    email: backendUser.email,
    role: backendUser.role,
    orgName: backendUser.org_name,
  };
}

async function authRequest(path: string, body: Record<string, unknown>): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail ?? "Something went wrong. Please try again.");
  }
  return data as TokenResponse;
}

function restoreUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && getToken()) return JSON.parse(raw);
  } catch {
    // Corrupted localStorage — ignore and stay logged out.
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(restoreUser);

  const persist = (backendUser: BackendUser | null, token: string | null) => {
    const u = backendUser ? toUser(backendUser) : null;
    setUser(u);
    setToken(token);
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  };

  const login = async (email: string, password: string) => {
    const data = await authRequest("/auth/login", { email, password });
    persist(data.user, data.access_token);
  };

  const signup = async (name: string, email: string, password: string, orgName: string) => {
    const data = await authRequest("/auth/signup", { name, email, password, org_name: orgName });
    persist(data.user, data.access_token);
  };

  const logout = () => persist(null, null);

  const setRole = (role: Role) => {
    if (user) {
      const updated = { ...user, role };
      setUser(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, setRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
