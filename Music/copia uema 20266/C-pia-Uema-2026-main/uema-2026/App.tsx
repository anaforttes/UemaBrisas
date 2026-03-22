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
import { Team } from './components/dashboard/Team';
import { ProcessManagement } from './components/dashboard/ProcessManagement';
import Editor from './components/editor/Editor';
import { LoginScreen } from './components/auth/LoginScreen';
import { SignupScreen } from './components/auth/SignupScreen';
import { ForgotPasswordScreen } from './components/auth/ForgotPasswordScreen';
import { NewProcessWizard } from './components/dashboard/NewProcessWizard';

type DocumentStatus = 'Draft' | 'Review' | 'Approved' | 'Signed';

// ─── EditorPage ───────────────────────────────────────────────────────────────
// Carrega o documento pelo ID da URL, mantém estado reativo e salva corretamente
// TODO (Backend): substituir dbService por chamadas à API REST

interface EditorPageProps {
  currentUser: User;
}

const EditorPage: React.FC<EditorPageProps> = ({ currentUser }) => {
  const { docId } = useParams<{ docId: string }>();

  // Estado reativo — garante que o componente re-renderiza após salvar
  // TODO (Backend): GET /api/documentos/:id
  const [doc, setDoc] = useState<REURBDocument | null | undefined>(() =>
    docId ? dbService.documents.findById(docId) : null
  );

  // Valores derivados do documento — com fallback caso ainda não exista
  const titulo   = doc?.title   ?? 'Documento de Instauração';
  const conteudo = doc?.content ?? '<h1 style="text-align:center">PORTARIA DE INSTAURAÇÃO REURB</h1><p>Considerando a Lei Federal 13.465/2017...</p>';
  const status   = doc?.status  ?? 'Draft';

  // Salva e atualiza o estado local para manter sincronia com o banco
  // TODO (Backend): PATCH /api/documentos/:id → { title, content, status }
  const handleSave = (c: string, t: string, s?: string) => {
    const novoStatus = (s || status) as DocumentStatus;

    const docAtualizado = dbService.documents.upsert({
      id:        docId,           // passa o id para UPDATE ao invés de INSERT
      title:     t,
      content:   c,
      processId: doc?.processId ?? '',
      status:    novoStatus,
    });

    // Atualiza o estado para que o próximo save use os dados corretos
    setDoc(docAtualizado);
  };

  return (
    <div className="h-full bg-slate-100 p-6">
      <Editor
        currentUser={currentUser}
        title={titulo}
        status={status}
        initialContent={conteudo}
        onSave={handleSave}
      />
    </div>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [user, setUser]       = useState<User | null>(null);
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
      <Routes>

        {/* ── Rotas públicas ─────────────────────────────────────────────── */}
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <LoginScreen onLoginSuccess={handleLogin} />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/" /> : <SignupScreen />}
        />
        <Route
          path="/forgot-password"
          element={user ? <Navigate to="/" /> : <ForgotPasswordScreen />}
        />

        {/* ── Rotas protegidas ───────────────────────────────────────────── */}
        <Route
          path="/*"
          element={
            !user ? (
              <Navigate to="/login" />
            ) : (
              <div className="flex min-h-screen bg-slate-50 font-sans">
                <Sidebar user={user} onLogout={handleLogout} />
                <main className="flex-1 h-screen overflow-y-auto relative scroll-smooth">
                  <Routes>

                    {/* Dashboard */}
                    <Route path="/" element={<Dashboard user={user} />} />

                    {/* Processos */}
                    <Route path="/processes" element={<ProcessManagement />} />

                    {/* Equipe */}
                    <Route path="/team" element={<Team />} />

                    {/* Biblioteca de modelos */}
                    <Route path="/templates" element={<Templates />} />

                    {/* Configurações */}
                    <Route
                      path="/settings"
                      element={
                        <div className="p-10">
                          <h2 className="text-2xl font-black text-slate-800">Configurações</h2>
                        </div>
                      }
                    />

                    {/* Wizard de novo processo */}
                    <Route
                      path="/new-process"
                      element={<NewProcessWizard currentUser={user} />}
                    />

                    {/* Editor — carrega documento real pelo ID */}
                    <Route
                      path="/edit/:docId"
                      element={<EditorPage currentUser={user} />}
                    />

                  </Routes>
                </main>
              </div>
            )
          }
        />
      </Routes>
    </Router>
  );
};

export default App;