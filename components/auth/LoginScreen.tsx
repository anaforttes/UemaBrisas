
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { Logo } from '../common/Logo';
import { API_BASE } from '../../shared/services/apiClient';
import type { User } from '../../types/index';

const parseJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

type LoginSuccessCallback = (user: User, tokens?: { access: string; refresh: string }) => void;

export const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: LoginSuccessCallback }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // @ts-ignore
    if (window.google) {
      try {
        // @ts-ignore
        google.accounts.id.initialize({
          client_id: (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ?? '',
          callback: handleGoogleResponse,
        });
        // @ts-ignore
        google.accounts.id.renderButton(
          document.getElementById("googleBtn"),
          { theme: "outline", size: "large", width: "100%", text: "signin_with", shape: "pill" }
        );
      } catch (e) {
        console.error("Erro Google GSI:", e);
      }
    }
  }, []);

  const handleGoogleResponse = (response: any) => {
    const userData = parseJwt(response.credential);
    if (userData) {
      const googleUser: User = {
        id:     userData.sub ?? '',
        name:   userData.name,
        email:  userData.email,
        role:   'Técnico',
        avatar: userData.picture,
      };
      onLoginSuccess(googleUser);
      navigate('/');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/autenticacao/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        const userPayload = parseJwt(data.access);
        const apiUser: User = {
          id:     String(userPayload?.user_id ?? userPayload?.sub ?? ''),
          name:   data.nome   ?? data.name   ?? email.split('@')[0],
          email:  data.email  ?? email,
          role:   data.papel  ?? data.role   ?? 'Técnico',
          avatar: data.avatar ?? '',
        };
        onLoginSuccess(apiUser, { access: data.access, refresh: data.refresh });
        navigate('/');
        return;
      }

      setError(data.detail ?? data.message ?? 'Credenciais inválidas.');
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-40" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] opacity-40" />

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-[32px] shadow-2xl overflow-hidden z-10 p-10">
        <div className="flex justify-center mb-10">
          <Logo size="lg" />
        </div>

        <h2 className="text-xl font-bold text-slate-800 text-center mb-1">Acesso ao Painel</h2>
        <p className="text-slate-400 text-sm text-center mb-8 font-medium">Plataforma Municipal de Regularização</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition-all" 
              placeholder="E-mail profissional"
            />
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition-all" 
                placeholder="Senha"
              />
            </div>
            <div className="flex justify-end px-2">
              <Link to="/forgot-password" className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all">
                Esqueci minha senha
              </Link>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
            Entrar no Sistema
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="bg-white px-4 text-slate-400">Ou continue com</span></div>
        </div>

        <div id="googleBtn" className="w-full flex justify-center"></div>

        <p className="mt-10 text-center text-sm text-slate-500 font-medium">
          Ainda não tem acesso? <Link to="/signup" className="text-blue-600 font-bold hover:underline">Solicitar cadastro</Link>
        </p>
      </div>
    </div>
  );
};
