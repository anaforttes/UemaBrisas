
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { dbService } from '../../services/databaseService';
import { Logo } from '../common/Logo';

export const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: (user: any) => void }) => {
  const [email, setEmail] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await dbService.users.login(email, passwordInput);
      const safeUser = { ...result.user };
      onLoginSuccess(safeUser);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Credenciais inválidas ou usuário não encontrado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8 sm:p-12 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] bg-blue-100/50 rounded-full blur-[140px] -z-10 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] bg-indigo-100/50 rounded-full blur-[140px] -z-10 animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md sm:max-w-xl bg-white border border-slate-200 rounded-[32px] sm:rounded-[48px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] overflow-hidden z-10 p-6 sm:p-10 md:p-16 transition-all duration-500">
        <div className="flex justify-center mb-8 sm:mb-12">
          <Logo size="lg" />
        </div>

        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 tracking-tight mb-2">Bem-vindo de volta</h2>
          <p className="text-slate-400 text-sm font-medium">Acesse o sistema de gestão de regularização fundiária</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-400 uppercase ml-2 tracking-[0.2em]">E-mail Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 sm:pl-16 pr-4 sm:pr-6 py-4 sm:py-5 bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-3xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-200 focus:outline-none text-sm sm:text-base font-bold transition-all text-slate-700"
                placeholder="nome@prefeitura.gov.br"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Senha</label>
              <Link to="/forgot-password" className="text-[11px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-all">
                Esqueceu?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full pl-12 sm:pl-16 pr-12 sm:pr-16 py-4 sm:py-5 bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-3xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-200 focus:outline-none text-sm sm:text-base font-bold transition-all text-slate-700"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={18} className="shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 sm:py-5 bg-blue-600 text-white rounded-[24px] sm:rounded-[32px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar no Painel'}
          </button>
        </form>

        <p className="mt-8 sm:mt-12 text-center text-sm text-slate-500 font-medium">
          Sem credenciais? <Link to="/signup" className="text-blue-600 font-black hover:underline decoration-2 underline-offset-4 ml-1">Solicitar acesso</Link>
        </p>
      </div>

      <div className="absolute bottom-4 sm:bottom-8 text-center w-full text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
        © 2024 REURB-Doc • Plataforma Oficial de Regularização Fundiária
      </div>
    </div>
  );
};
