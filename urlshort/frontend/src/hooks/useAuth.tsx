/* eslint-disable react-refresh/only-export-components */
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import * as api from '../lib/api';

const STORAGE_KEY = 'gbus-auth';

type AuthContextValue = {
  token: string | null;
  refresh: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { token: string };
      return parsed.token;
    } catch (err) {
      return null;
    }
  });
  const [refresh, setRefresh] = useState<string | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { refresh: string };
      return parsed.refresh ?? null;
    } catch (err) {
      return null;
    }
  });

  const persist = useCallback((nextToken: string | null, nextRefresh: string | null) => {
    if (nextToken) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: nextToken, refresh: nextRefresh }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await api.login(username, password);
    setToken(response.access);
    setRefresh(response.refresh);
    persist(response.access, response.refresh);
  }, [persist]);

  const logout = useCallback(() => {
    setToken(null);
    setRefresh(null);
    persist(null, null);
  }, [persist]);

  const value = useMemo(
    () => ({
      token,
      refresh,
      isAuthenticated: Boolean(token),
      login,
      logout
    }),
    [token, refresh, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
