import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../../types/index';
import { clearAuthStorage } from '../services/apiClient';

interface AuthTokens {
  access: string;
  refresh: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (user: User, tokens?: AuthTokens) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('reurb_current_user');
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { /* ignore corrupt data */ }
    }
    setLoading(false);

    const onExpired = () => setUser(null);
    window.addEventListener('reurb:auth-expired', onExpired);
    return () => window.removeEventListener('reurb:auth-expired', onExpired);
  }, []);

  const login = useCallback((u: User, tokens?: AuthTokens) => {
    localStorage.setItem('reurb_current_user', JSON.stringify(u));
    if (tokens?.access) localStorage.setItem('reurb_access_token', tokens.access);
    if (tokens?.refresh) localStorage.setItem('reurb_refresh_token', tokens.refresh);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
