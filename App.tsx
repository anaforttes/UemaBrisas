import React, { useState, useEffect } from 'react';
import {
  HashRouter as Router, Routes, Route, Navigate, useParams,
} from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { User, REURBDocument } from './types/index';
import { dbService } from './services/databaseService';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { Templates } from './components/dashboard/Templates';
import { Reports } from './components/dashboard/Reports';
import { Team } from './components/dashboard/Team';
import { Configuracoes } from './components/dashboard/Configuracoes';
import { ProcessManagement } from './components/dashboard/ProcessManagement';
import Editor from './components/editor/Editor';
import { LoginScreen } from './components/auth/LoginScreen';
import { SignupScreen } from './components/auth/SignupScreen';
import { ForgotPasswordScreen } from './components/auth/ForgotPasswordScreen';
import { useHeartbeat } from './hooks/useHeartbeat';

type DocumentStatus = 'Draft' | 'Review' | 'Approved' | 'Signed';

// ─── EditorPage ───────────────────────────────────────────────────────────────

interface EditorPageProps {
  currentUser: User;
}

const EditorPage: React.FC<EditorPageProps> = ({ currentUser }) => {
  const { docId } = useParams<{ docId: string }>();

  const doc = docId ? (dbService.documents.findById(docId) ?? null) : null;

  const titulo = doc?.title ?? 'Documento de Instauração';
  const conteudo =
    doc?.content ??
    '<h1 style="text-align:center">PORTARIA DE INSTAURAÇÃO REURB</h1><p>Considerando a Lei Federal 13.465/2017...</p>';
  const status = doc?.status ?? 'Draft';

  const handleSave = (c: string, t: string, s?: string) => {
    dbService.documents.upsert({
      id: docId,
      title: t,
      content: c,
      processId: doc?.processId ?? '',
      status: (s || status) as DocumentStatus,
    });
  };

  return (
    <div className="h-full bg-slate-100 p-6">
      <Editor
        title={titulo}
        status={status}
        initialContent={conteudo}
        onSave={handleSave}
      />
    </div>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────

const AppInner: React.FC<{ user: User | null; onLogin: (u: User) => void; onLogout: () => void }> = ({ user, onLogin, onLogout }) => {
  useHeartbeat(!!user);
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginScreen onLoginSuccess={onLogin} />} />
      <Route path="/signup" element={user ? <Navigate to="/" /> : <SignupScreen />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPasswordScreen />} />
      <Route path="/*" element={
        !user ? <Navigate to="/login" /> : (
          <div className="flex min-h-screen bg-slate-50 font-sans">
            <Sidebar user={user} onLogout={onLogout} />
            <main className="flex-1 h-screen overflow-y-auto relative scroll-smooth">
              <Routes>
                <Route path="/" element={<Dashboard user={user} />} />
                <Route path="/processes" element={<ProcessManagement />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/team" element={<Team />} />
                <Route path="/settings" element={<Configuracoes />} />
                <Route path="/edit/:docId" element={<EditorPage currentUser={user} />} />
              </Routes>
            </main>
          </div>
        )
      } />
    </Routes>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('reurb_current_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    setLoading(false);
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('reurb_current_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('reurb_current_user');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 size={40} className="text-blue-600 animate-spin" />
    </div>
  );

  return (
    <Router>
      <AppInner user={user} onLogin={handleLogin} onLogout={handleLogout} />
    </Router>
  );
};

export default App;
