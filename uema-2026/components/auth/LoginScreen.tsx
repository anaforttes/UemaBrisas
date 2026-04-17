import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { authService } from '../../services/authService';
import { Logo } from '../common/Logo';

export const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: (user: any) => void }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const uidFromUrl = (searchParams.get('uid') || '')
    .replace(/^3D/gi, '')
    .replace(/=3D/gi, '=')
    .replace(/\s/g, '');

  const tokenFromUrl = (searchParams.get('token') || '')
    .replace(/^3D/gi, '')
    .replace(/=3D/gi, '=')
    .replace(/\s/g, '');

  const [view, setView] = useState<'login' | 'forgot_password' | 'reset_password'>(
    uidFromUrl && tokenFromUrl ? 'reset_password' : 'login'
  );

  const [email, setEmail] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    setError('');
    setSuccessMsg('');
  }, [view]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authService.login(email, passwordInput);
      const user = {
        id: data.email,
        name: data.name,
        email: data.email,
        role: 'Técnico' as const,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email}`,
        status: 'Online' as const,
        lastLogin: new Date().toISOString(),
        flags: {
          superusuario: false,
          adminMunicipio: false,
          profissionalInterno: true,
          usuarioExterno: false,
        },
        etapasPermitidas: [],
      };
      onLoginSuccess(user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Credenciais inválidas ou usuário não encontrado.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const response = await authService.requestPasswordReset(email);
      setSuccessMsg(response.message || 'E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      setError(err.message || 'Erro ao processar a solicitação.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const response = await authService.confirmPasswordReset(uidFromUrl, tokenFromUrl, newPassword);
      setSuccessMsg(response.message || 'Senha atualizada com sucesso!');
      setTimeout(() => {
        setSearchParams({});
        setView('login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 md:p-12 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] bg-blue-100/50 rounded-full blur-[140px] -z-10 animate-pulse" />
      <div
        className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] bg-indigo-100/50 rounded-full blur-[140px] -z-10 animate-pulse"
        style={{ animationDelay: '2s' }}
      />

      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-[48px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] overflow-hidden z-10 p-10 md:p-20 transition-all duration-500 relative">
        {view !== 'login' && (
          <button
            onClick={() => {
              setSearchParams({});
              setView('login');
            }}
            className="absolute top-8 left-8 p-3 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors"
            title="Voltar"
          >
            <ArrowLeft size={24} />
          </button>
        )}

        <div className="flex justify-center mb-16">
          <Logo size="lg" />
        </div>

        {view === 'login' && (
          <>
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-3">Bem-vindo de volta</h2>
              <p className="text-slate-400 text-base font-medium">Acesse o sistema de gestão de regularização fundiária</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase ml-3 tracking-[0.2em]">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-200 focus:outline-none text-base font-bold transition-all text-slate-700"
                    placeholder="nome.sobrenome@prefeitura.gov.br"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Senha</label>
                  <button
                    type="button"
                    onClick={() => setView('forgot_password')}
                    className="text-[11px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-all"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full pl-16 pr-16 py-5 bg-slate-50 border border-slate-100 rounded-3xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-200 focus:outline-none text-base font-bold transition-all text-slate-700"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-5 bg-red-50 text-red-600 rounded-3xl text-sm font-bold border border-red-100 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={20} className="shrink-0" /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-6 bg-blue-600 text-white rounded-[32px] font-black text-sm uppercase tracking-[0.25em] shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Entrar no Painel'}
              </button>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">ou</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    try {
                      setLoading(true);
                      setError('');
                      const data = await authService.googleLogin(credentialResponse.credential!);
                      const googleUser = {
                        id: `google-${Date.now()}`,
                        name: data.name,
                        email: data.email,
                        role: 'Técnico' as const,
                        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email}`,
                        status: 'Online' as const,
                        lastLogin: new Date().toISOString(),
                        flags: {
                          superusuario: false,
                          adminMunicipio: false,
                          profissionalInterno: true,
                          usuarioExterno: false,
                        },
                        etapasPermitidas: [],
                      };
                      onLoginSuccess(googleUser);
                      navigate('/');
                    } catch (err: any) {
                      setError(err.message || 'Erro ao entrar com Google.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  onError={() => setError('Login com Google cancelado ou falhou.')}
                  text="continue_with"
                  shape="pill"
                  useOneTap
                />
              </div>
            </form>

            <p className="mt-16 text-center text-sm text-slate-500 font-medium">
              Ainda não possui credenciais?{' '}
              <Link
                to="/signup"
                className="text-blue-600 font-black hover:underline decoration-2 underline-offset-8 ml-1"
              >
                Solicitar acesso institucional
              </Link>
            </p>
          </>
        )}

        {view === 'forgot_password' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-300">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-3">Recuperar Senha</h2>
              <p className="text-slate-400 text-base font-medium">
                Digite seu e-mail cadastrado para receber um link de recuperação.
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase ml-3 tracking-[0.2em]">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-200 focus:outline-none text-base font-bold transition-all text-slate-700"
                    placeholder="nome.sobrenome@prefeitura.gov.br"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-5 bg-red-50 text-red-600 rounded-3xl text-sm font-bold border border-red-100 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={20} className="shrink-0" /> {error}
                </div>
              )}

              {successMsg && (
                <div className="flex items-center gap-3 p-5 bg-emerald-50 text-emerald-700 rounded-3xl text-sm font-bold border border-emerald-100 animate-in fade-in slide-in-from-top-1">
                  <CheckCircle2 size={20} className="shrink-0" /> {successMsg}
                </div>
              )}

              {!successMsg && (
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-6 bg-blue-600 text-white rounded-[32px] font-black text-sm uppercase tracking-[0.25em] shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Pedir Link Mágico'}
                </button>
              )}
            </form>
          </div>
        )}

        {view === 'reset_password' && (
          <div className="animate-in fade-in duration-500">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-3">Nova Senha</h2>
              <p className="text-slate-400 text-base font-medium">Crie uma nova senha segura para sua conta.</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-3">
                  Nova Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-16 pr-16 py-5 bg-slate-50 border border-slate-100 rounded-3xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-200 focus:outline-none text-base font-bold transition-all text-slate-700"
                    placeholder="No mínimo 8 caracteres..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-5 bg-red-50 text-red-600 rounded-3xl text-sm font-bold border border-red-100 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={20} className="shrink-0" /> {error}
                </div>
              )}

              {successMsg && (
                <div className="flex items-center gap-3 p-5 bg-emerald-50 text-emerald-700 rounded-3xl text-sm font-bold border border-emerald-100 animate-in fade-in slide-in-from-top-1">
                  <CheckCircle2 size={20} className="shrink-0" /> {successMsg}
                </div>
              )}

              {!successMsg && (
                <button
                  type="submit"
                  disabled={loading || !newPassword}
                  className="w-full py-6 bg-blue-600 text-white rounded-[32px] font-black text-sm uppercase tracking-[0.25em] shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar Nova Senha'}
                </button>
              )}
            </form>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 text-center w-full text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
        © 2026 REURB-DOC • Plataforma Oficial de Regularização Fundiária
      </div>
    </div>
  );
};
