import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role, User } from "./mock-data";

type AuthContextType = {
  user: User | null;
  login: (email: string, _password: string) => void;
  signup: (name: string, email: string, _password: string, orgName: string) => void;
  logout: () => void;
  setRole: (role: Role) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);
const STORAGE_KEY = "docpilot_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (u: User | null) => {
    setUser(u);
    if (typeof window !== "undefined") {
      if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else localStorage.removeItem(STORAGE_KEY);
    }
  };

  const login = (email: string) => {
    persist({
      id: "me",
      name: email.split("@")[0] || "User",
      email,
      role: "Admin",
      orgName: "Acme Inc",
    });
  };

  const signup = (name: string, email: string, _pw: string, orgName: string) => {
    persist({ id: "me", name, email, role: "Admin", orgName });
  };

  const logout = () => persist(null);

  const setRole = (role: Role) => {
    if (user) persist({ ...user, role });
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
