
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, FolderKanban, Users, Settings, LogOut, BarChart3
} from 'lucide-react';
import { User } from '../../types';
import { Logo } from '../common/Logo';

interface SidebarProps {
  user: User;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Painel',        path: '/'          },
    { icon: FolderKanban,    label: 'Processos',     path: '/processes' },
    { icon: FileText,        label: 'Modelos',       path: '/templates' },
    { icon: BarChart3,       label: 'Relatórios',    path: '/reports'   },
    { icon: Users,           label: 'Equipe',        path: '/team'      },
    { icon: Settings,        label: 'Configurações', path: '/settings'  },
  ];

  return (
    <aside className="w-72 bg-white border-r border-slate-200 h-screen flex flex-col sticky top-0 z-20">
      <div className="p-8">
        <div className="mb-12">
          <Logo size="md" />
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 translate-x-1' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon size={22} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
                <span className="text-sm font-bold">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-8 border-t border-slate-50 space-y-6">
        <div className="bg-slate-50/50 p-5 rounded-[24px] border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Operador</p>
          <div className="flex items-center gap-4">
            <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-lg" />
            <div className="overflow-hidden">
              <p className="text-sm font-black text-slate-800 truncate">{user.name}</p>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-1">
          <button onClick={onLogout} className="flex items-center gap-3 px-5 py-3 text-red-500 hover:bg-red-50 hover:text-red-700 transition-all rounded-xl w-full text-left font-bold text-sm">
            <LogOut size={20} />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
