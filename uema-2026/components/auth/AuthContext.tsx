import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../../types/index';
import { dbService } from '../../services/databaseService';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restaura sessão do localStorage se o token existir
    const token     = localStorage.getItem('reurb_token');
    const savedUser = localStorage.getItem('reurb_user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('reurb_user');
      }
    }
    setLoading(false);
  }, []);

  // Ouve evento de sessão expirada disparado pelo databaseService
  useEffect(() => {
    const handleExpiry = () => {
      setUser(null);
      localStorage.removeItem('reurb_user');
    };
    window.addEventListener('reurb:session-expired', handleExpiry);
    return () => window.removeEventListener('reurb:session-expired', handleExpiry);
  }, []);

  const login = useCallback((userData: User) => {
    setUser(userData);
    localStorage.setItem('reurb_user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(async () => {
    try { await dbService.users.logout(); } catch { /* ignora erros de rede */ }
    setUser(null);
    localStorage.removeItem('reurb_user');
    localStorage.removeItem('reurb_token');
    localStorage.removeItem('reurb_refresh_token');
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
