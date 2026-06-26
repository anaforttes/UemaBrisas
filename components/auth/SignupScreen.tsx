import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Check,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { API_BASE } from '../../shared/services/apiClient';

export const SignupScreen = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const checks = {
    length: form.password.length >= 8,
    upper: /[A-Z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(form.password),
  };

  const isPasswordValid = Object.values(checks).every(Boolean);
  const passwordsMatch = form.password === form.confirm && form.confirm.length > 0;
  const canSubmit = form.name.trim() && form.email && isPasswordValid && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/autenticacao/cadastro/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.email?.[0] ?? data?.detail ?? data?.erro ?? 'Erro ao criar conta.');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-[32px] shadow-2xl p-10 text-center">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={48} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Solicitação Enviada!</h2>
          <p className="text-slate-500 font-medium text-sm leading-relaxed">
            Sua solicitação foi recebida com sucesso.
            <br />O administrador irá aprovar o acesso e definir seu cargo em breve.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-block text-blue-600 font-bold hover:underline text-sm"
          >
            Voltar para o Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-40" />

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-[32px] shadow-2xl z-10 p-10">
        <h2 className="text-2xl font-black text-slate-800 mb-1 tracking-tight text-center">
          Solicitar Acesso
        </h2>
        <p className="text-slate-400 text-sm mb-6 font-medium text-center">
          Credenciamento de operadores do fluxo REURB-Doc
        </p>

        {/* Aviso de aprovação pendente */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <Clock size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            Após o cadastro, sua conta ficará <strong>pendente de aprovação</strong>. O
            administrador definirá seu cargo e nível de acesso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Nome Completo
            </label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                placeholder="Nome do Operador"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              E-mail Institucional
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                placeholder="exemplo@prefeitura.gov.br"
              />
            </div>
          </div>

          {/* Senha + Confirmar lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                Crie uma senha
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-9 pr-9 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                Confirme a senha
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  className="w-full pl-9 pr-9 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          {/* Checklist de senha */}
          {form.password.length > 0 && (
            <div className="grid grid-cols-2 gap-2 px-1">
              {[
                { ok: checks.length, label: '8+ Caracteres' },
                { ok: checks.upper, label: 'Letra Maiúscula' },
                { ok: checks.number, label: 'Número' },
                { ok: checks.special, label: 'Símbolo (@#$)' },
              ].map(({ ok, label }) => (
                <div
                  key={label}
                  className={`flex items-center gap-1.5 text-[10px] font-bold ${ok ? 'text-green-600' : 'text-slate-400'}`}
                >
                  {ok ? (
                    <Check size={11} />
                  ) : (
                    <div className="w-2.5 h-2.5 border border-slate-300 rounded-full" />
                  )}
                  {label}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className={`w-full mt-2 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-xl ${
              canSubmit && !loading
                ? 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-100'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {loading ? (
              'Enviando...'
            ) : (
              <>
                <span>Solicitar Cadastro</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500 font-medium">
          <Link to="/login" className="text-blue-600 font-bold hover:underline">
            ← Voltar para o Login
          </Link>
        </p>
      </div>
    </div>
  );
};
