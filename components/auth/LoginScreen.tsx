import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Loader2, Search } from 'lucide-react';
import { Logo } from '../common/Logo';
import { API_BASE } from '../../shared/services/apiClient';
import type { User } from '../../types/index';

const parseJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

type LoginSuccessCallback = (user: User, tokens?: { access: string; refresh: string }) => void;

let googleGsiInitialized = false;

export const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: LoginSuccessCallback }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleButtonRenderedRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelado = false;
    let tentativas = 0;

    const renderizarBotaoGoogle = () => {
      if (cancelado || googleButtonRenderedRef.current || !googleButtonRef.current) return true;
      // @ts-expect-error google GSI not typed
      if (!window.google?.accounts?.id) return false;

      try {
        if (!googleGsiInitialized) {
          const googleClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ?? '';
          if (!googleClientId) {
            setError('Client ID do Google não configurado no frontend.');
            return true;
          }

          googleGsiInitialized = true;
          // @ts-expect-error google GSI not typed
          google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleResponse,
          });
        }

        const buttonWidth = Math.min(googleButtonRef.current.offsetWidth || 320, 400);
        googleButtonRef.current.replaceChildren();
        // @ts-expect-error google GSI not typed
        google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          width: buttonWidth,
          text: 'signin_with',
          shape: 'pill',
        });
        googleButtonRenderedRef.current = true;
        return true;
      } catch (e) {
        console.error('Erro Google GSI:', e);
        return true;
      }
    };

    if (renderizarBotaoGoogle()) return;

    const intervalo = window.setInterval(() => {
      tentativas += 1;
      if (renderizarBotaoGoogle() || tentativas >= 50) {
        window.clearInterval(intervalo);
      }
    }, 100);

    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
      googleButtonRef.current?.replaceChildren();
      googleButtonRenderedRef.current = false;
    };
  }, []);

  const handleGoogleResponse = async (response: any) => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/autenticacao/login-google/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const textoResposta = await res.text();
      let data: any = {};
      try {
        data = textoResposta ? JSON.parse(textoResposta) : {};
      } catch {
        data = { erro: textoResposta };
      }

      if (!res.ok) {
        setError(
          data.detail ??
            data.detalhe ??
            data.erro ??
            data.message ??
            `Erro ${res.status} ao entrar com Google.`
        );
        return;
      }

      const userPayload = parseJwt(data.access);
      const googlePayload = parseJwt(response.credential);
      const googleUser: User = {
        id: String(userPayload?.user_id ?? userPayload?.sub ?? googlePayload?.sub ?? ''),
        name: data.name ?? googlePayload?.name ?? data.email,
        email: data.email ?? googlePayload?.email ?? '',
        role: data.papel ?? data.role ?? 'Técnico',
        avatar: data.avatar ?? googlePayload?.picture ?? '',
      };

      onLoginSuccess(googleUser, { access: data.access, refresh: data.refresh });
      navigate('/');
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

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
          id: String(userPayload?.user_id ?? userPayload?.sub ?? ''),
          name: data.nome ?? data.name ?? email.split('@')[0],
          email: data.email ?? email,
          role: data.papel ?? data.role ?? 'Técnico',
          avatar: data.avatar ?? '',
        };
        onLoginSuccess(apiUser, { access: data.access, refresh: data.refresh });
        navigate('/');
        return;
      }

      setError(data.detail ?? data.message ?? 'Credenciais inválidas.');
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
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
        <p className="text-slate-400 text-sm text-center mb-8 font-medium">
          Plataforma Municipal de Regularização
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition-all"
              placeholder="E-mail profissional"
            />
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition-all"
                placeholder="Senha"
              />
            </div>
            <div className="flex justify-end px-2">
              <Link
                to="/forgot-password"
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all"
              >
                Esqueci minha senha
              </Link>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar no Sistema'
            )}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
            <span className="bg-white px-4 text-slate-400">Ou continue com</span>
          </div>
        </div>

        <div ref={googleButtonRef} id="googleBtn" className="w-full flex justify-center"></div>

        <p className="mt-10 text-center text-sm text-slate-500 font-medium">
          Ainda não tem acesso?{' '}
          <Link to="/signup" className="text-blue-600 font-bold hover:underline">
            Solicitar cadastro
          </Link>
        </p>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <Link
            to="/consulta"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 text-slate-600 text-sm font-semibold hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
          >
            <Search size={15} />
            Consultar andamento de processo
          </Link>
        </div>
      </div>
    </div>
  );
};
