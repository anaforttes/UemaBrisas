
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Check, ArrowRight } from 'lucide-react';
import { dbService } from '../../services/databaseService';

export const SignupScreen = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Técnico' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const checks = {
    length: form.password.length >= 8,
    upper: /[A-Z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(form.password)
  };

  const isPasswordValid = Object.values(checks).every(Boolean);
  const passwordsMatch = form.password === confirmPassword && confirmPassword.length > 0;

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const existingUser = dbService.users.findByEmail(form.email);
    if (existingUser) {
      setError('Usuário já cadastrado em nosso sistema.');
      return;
    }

    if (!isPasswordValid) {
      setError('A senha não atende aos requisitos de segurança.');
      return;
    }

    if (!passwordsMatch) {
      setError('As senhas digitadas não conferem.');
      return;
    }

    dbService.users.insert(form);
    setSuccess(true);
    setTimeout(() => navigate('/login'), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-40" />
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-[32px] shadow-2xl overflow-hidden z-10 p-10 text-center">
        {success ? (
          <div className="py-10 animate-in zoom-in-95">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Solicitação Enviada!</h2>
            <p className="text-slate-500 font-medium">Sua conta foi criada com sucesso. Redirecionando para o login...</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Solicitar Acesso</h2>
            <p className="text-slate-400 text-sm mb-8 font-medium">Preencha seus dados institucionais</p>

            <form onSubmit={handleSignup} className="space-y-5 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Nome Completo</label>
                <input 
                  type="text" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" 
                  placeholder="Seu nome"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">E-mail Corporativo</label>
                <input 
                  type="email" required value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" 
                  placeholder="exemplo@prefeitura.gov.br"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Perfil de Acesso</label>
                <select 
                  value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all appearance-none"
                >
                  <option value="Técnico">Técnico / Agrimensura</option>
                  <option value="Jurídico">Jurídico / Procuradoria</option>
                  <option value="Gestor">Gestor Municipal</option>
                  <option value="Atendente">Assistente Social</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Senha</label>
                <input 
                  type="password" required value={form.password} onChange={(e) => setForm({...form, password: e.target.value})}
                  className={`w-full px-4 py-3 bg-slate-50 border ${form.password && !isPasswordValid ? 'border-red-200' : 'border-slate-100'} rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all`} 
                  placeholder="Crie sua senha"
                />
                <div className="grid grid-cols-2 gap-2 mt-2 px-2">
                  <div className={`flex items-center gap-2 text-[10px] font-bold ${checks.length ? 'text-green-600' : 'text-slate-400'}`}>
                    {checks.length ? <Check size={12} /> : <div className="w-3 h-3 border border-slate-300 rounded-full" />} 8+ caracteres
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] font-bold ${checks.upper ? 'text-green-600' : 'text-slate-400'}`}>
                    {checks.upper ? <Check size={12} /> : <div className="w-3 h-3 border border-slate-300 rounded-full" />} Letra Maiúscula
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] font-bold ${checks.number ? 'text-green-600' : 'text-slate-400'}`}>
                    {checks.number ? <Check size={12} /> : <div className="w-3 h-3 border border-slate-300 rounded-full" />} Número
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] font-bold ${checks.special ? 'text-green-600' : 'text-slate-400'}`}>
                    {checks.special ? <Check size={12} /> : <div className="w-3 h-3 border border-slate-300 rounded-full" />} Símbolo (@#$...)
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Confirme sua senha</label>
                <div className="relative">
                  <input 
                    type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-50 border ${confirmPassword && !passwordsMatch ? 'border-red-200' : 'border-slate-100'} rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all`} 
                    placeholder="Repita sua senha"
                  />
                  {confirmPassword && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {passwordsMatch ? <Check size={16} className="text-green-500" /> : <AlertCircle size={16} className="text-red-500" />}
                    </div>
                  )}
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-[10px] text-red-500 font-bold ml-2">As senhas não conferem</p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold flex items-center gap-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={(!isPasswordValid || !passwordsMatch) && (form.password.length > 0 || confirmPassword.length > 0)}
                className={`w-full mt-4 py-4 ${isPasswordValid && passwordsMatch ? 'bg-slate-800 hover:bg-slate-900' : 'bg-slate-300 cursor-not-allowed'} text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-100`}
              >
                Concluir Cadastro <ArrowRight size={18} />
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-500 font-medium">
              Já possui conta? <Link to="/login" className="text-blue-600 font-bold hover:underline">Voltar ao Login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};
