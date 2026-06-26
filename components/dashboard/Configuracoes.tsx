import React, { useState, useRef } from 'react';
import { Palette, Save, CheckCircle2, Sun, Moon, User, Camera } from 'lucide-react';
import { configuracoesService, ConfiguracoesPlatforma } from '../../services/configuracoesService';
import { useAuth } from '../../shared/contexts/AuthContext';
import { request } from '../../shared/services/apiClient';

const Secao: React.FC<{ titulo: string; icone: React.ReactNode; children: React.ReactNode }> = ({
  titulo,
  icone,
  children,
}) => (
  <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
        {icone}
      </div>
      <h3 className="text-base font-black text-slate-800">{titulo}</h3>
    </div>
    <div className="space-y-5">{children}</div>
  </div>
);

const COOLDOWN_DAYS = 30;

function calcularCooldown(nameChangedAt?: string | null): {
  bloqueado: boolean;
  diasRestantes: number;
  proxima: Date | null;
} {
  if (!nameChangedAt) return { bloqueado: false, diasRestantes: 0, proxima: null };
  const ultima = new Date(nameChangedAt);
  const proxima = new Date(ultima.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const agora = new Date();
  if (agora < proxima) {
    const diasRestantes = Math.ceil((proxima.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
    return { bloqueado: true, diasRestantes, proxima };
  }
  return { bloqueado: false, diasRestantes: 0, proxima: null };
}

export const Configuracoes: React.FC = () => {
  const { user, login } = useAuth();

  const nameChangedAt =
    (user as { name_changed_at?: string | null } | null)?.name_changed_at ?? null;
  const { bloqueado, diasRestantes, proxima } = calcularCooldown(nameChangedAt);

  const [config, setConfig] = useState<ConfiguracoesPlatforma>(() =>
    configuracoesService.carregar()
  );
  const [nome, setNome] = useState(user?.name ?? '');
  const [email] = useState(user?.email ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState('');

  const handleSalvar = async () => {
    setErro('');
    configuracoesService.salvar(config);

    if (user) {
      try {
        const atualizado = await request<{ name?: string; name_changed_at?: string | null }>(
          `/api/autenticacao/usuarios/${user.id}/`,
          {
            method: 'PATCH',
            body: JSON.stringify({ name: nome, avatar }),
          }
        );
        const userAtualizado = {
          ...user,
          name: atualizado.name ?? nome,
          avatar,
          name_changed_at: atualizado.name_changed_at ?? nameChangedAt,
        };
        localStorage.setItem('reurb_current_user', JSON.stringify(userAtualizado));
        login(userAtualizado);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '';
        setErro(msg || 'Não foi possível salvar no servidor.');
        setSalvo(true);
        setTimeout(() => setSalvo(false), 4000);
        return;
      }
    }

    setSalvo(true);
    setTimeout(() => setSalvo(false), 3000);
  };

  const iniciais = nome
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="p-10 max-w-3xl mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Configurações</h2>
          <p className="text-slate-500 mt-2 font-medium">
            Personalize sua experiência na plataforma.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {salvo && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-2xl animate-in fade-in duration-300">
              <CheckCircle2 size={14} className="text-green-600" />
              <span className="text-xs font-bold text-green-700">{erro || 'Salvo!'}</span>
            </div>
          )}
          <button
            onClick={handleSalvar}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <Save size={16} /> Salvar alterações
          </button>
        </div>
      </header>

      <div className="space-y-6">
        {/* ── Perfil ──────────────────────────────────────────────────────── */}
        <Secao titulo="Perfil" icone={<User size={20} />}>
          {/* Avatar */}
          <div className="flex items-center gap-5 pb-5 border-b border-slate-50">
            <div
              className="relative cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatar ? (
                <img src={avatar} alt={nome} className="w-16 h-16 rounded-2xl object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-black">
                  {iniciais || <Camera size={22} />}
                </div>
              )}
              <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={18} className="text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Foto de perfil</p>
              <p className="text-xs text-slate-400 mt-0.5 mb-3">JPG ou PNG, até 2 MB</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Escolher imagem
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => setAvatar(ev.target?.result as string);
                reader.readAsDataURL(file);
              }}
            />
          </div>

          {/* Nome */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">Nome completo</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => !bloqueado && setNome(e.target.value)}
              readOnly={bloqueado}
              className={`w-full px-4 py-3 border rounded-xl text-sm font-medium focus:outline-none transition-all ${
                bloqueado
                  ? 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-50 border-slate-100 text-slate-800 focus:ring-2 focus:ring-blue-500'
              }`}
            />
            {bloqueado ? (
              <p className="text-[11px] text-amber-500 font-semibold mt-1.5 px-1">
                Nome bloqueado por {diasRestantes} dia{diasRestantes !== 1 ? 's' : ''}. Próxima
                alteração em {proxima?.toLocaleDateString('pt-BR')}.
              </p>
            ) : nameChangedAt ? (
              <p className="text-[11px] text-slate-400 mt-1.5 px-1">
                Você pode alterar o nome uma vez a cada {COOLDOWN_DAYS} dias.
              </p>
            ) : null}
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">E-mail</label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full px-4 py-3 bg-slate-100 border border-slate-100 rounded-xl text-sm text-slate-400 font-medium cursor-not-allowed select-none"
            />
            <p className="text-[11px] text-slate-400 mt-1.5 px-1">
              O e-mail não pode ser alterado após o cadastro.
            </p>
          </div>
        </Secao>

        {/* ── Aparência ───────────────────────────────────────────────────── */}
        <Secao titulo="Aparência" icone={<Palette size={20} />}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-700">Tema</p>
              <p className="text-xs text-slate-400 mt-0.5">Escolha o tema visual da plataforma</p>
            </div>
            <div className="flex items-center gap-2">
              {[
                { value: 'claro', label: 'Claro', icon: <Sun size={14} /> },
                { value: 'escuro', label: 'Escuro', icon: <Moon size={14} /> },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      tema: t.value as ConfiguracoesPlatforma['tema'],
                    }))
                  }
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    config.tema === t.value
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>
        </Secao>
      </div>
    </div>
  );
};
