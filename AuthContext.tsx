import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

import { api, User, setToken, clearToken } from "@/src/api/client";
import { storage } from "@/src/utils/storage";

type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

const USER_CACHE_KEY = "jsai_user_cache";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const cached = await storage.getItem<string>(USER_CACHE_KEY, "");
        // Try to validate token with the server
        try {
          const me = await api.me();
          setUser(me);
          await storage.setItem(USER_CACHE_KEY, JSON.stringify(me));
        } catch {
          // Token invalid or absent
          if (cached) {
            try {
              setUser(JSON.parse(cached));
            } catch {}
          }
          await clearToken();
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { token, user: u } = await api.login(email, password);
    await setToken(token);
    await storage.setItem(USER_CACHE_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { token, user: u } = await api.register(email, password, name);
    await setToken(token);
    await storage.setItem(USER_CACHE_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    await clearToken();
    await storage.removeItem(USER_CACHE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
