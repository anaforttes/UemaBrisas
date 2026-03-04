
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, FolderKanban, Users,
  LogOut, BarChart3, Menu, X as CloseIcon
} from 'lucide-react';
import { User } from '../../types';
import { Logo } from '../common/Logo';

interface SidebarProps {
  user: User;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const [quota, setQuota] = useState(user.quota);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const updatedUser = JSON.parse(localStorage.getItem('reurb_current_user') || '{}');
      if (updatedUser.quota) setQuota(updatedUser.quota);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fecha o menu mobile ao navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Painel',    path: '/' },
    { icon: FolderKanban,  label: 'Processos',  path: '/processes' },
    { icon: FileText,      label: 'Modelos',    path: '/templates' },
    { icon: Users,         label: 'Equipe',     path: '/team' },
  ];

  const quotaPercent = quota ? Math.min((quota.used / quota.limit) * 100, 100) : 0;

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 lg:p-8">
        <div className="mb-8 lg:mb-12 flex items-center justify-between">
          <Logo size="md" />
          {/* Botão fechar no mobile */}
          <button
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            <CloseIcon size={22} />
          </button>
        </div>

        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon
                  size={20}
                  className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}
                />
                <span className="text-sm font-bold">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Rodapé da sidebar */}
      <div className="mt-auto p-6 lg:p-8 border-t border-slate-50 space-y-4">
        {/* Quota */}
        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={13} className="text-blue-600" />
            <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Minha Quota</span>
          </div>
          <div className="w-full bg-blue-100 h-1.5 rounded-full overflow-hidden mb-1">
            <div
              className={`h-full transition-all duration-500 ${
                quotaPercent > 90 ? 'bg-red-500' : quotaPercent > 70 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
          <div className="flex justify-between">
            <p className="text-[9px] text-blue-400 font-bold">{Math.round(quota?.used || 0)} / {quota?.limit} tokens</p>
            <p className="text-[9px] text-blue-300 font-medium">{Math.round(quotaPercent)}%</p>
          </div>
        </div>

        {/* Usuário */}
        <div className="bg-slate-50/50 p-4 rounded-[20px] border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Operador</p>
          <div className="flex items-center gap-3">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-md flex-shrink-0"
            />
            <div className="overflow-hidden">
              <p className="text-sm font-black text-slate-800 truncate">{user.name}</p>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 hover:text-red-700 transition-all rounded-xl w-full text-left font-bold text-sm"
        >
          <LogOut size={18} />
          <span>Encerrar Sessão</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Botão hambúrguer fixo no mobile */}
      <button
        className="lg:hidden fixed top-4 left-4 z-[150] p-2.5 bg-white border border-slate-200 rounded-2xl shadow-lg text-slate-600 hover:bg-slate-50 transition-all"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[140]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar mobile (drawer) */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 flex flex-col z-[145] transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <NavContent />
      </aside>

      {/* Sidebar desktop (sempre visível) */}
      <aside className="hidden lg:flex w-64 xl:w-72 bg-white border-r border-slate-200 h-screen flex-col sticky top-0 z-20 flex-shrink-0">
        <NavContent />
      </aside>
    </>
  );
};
