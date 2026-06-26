import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { REURBDocument } from './types/index';
import { dbService } from './services/databaseService';
import { AuthProvider, useAuth } from './shared/contexts/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { Templates } from './components/dashboard/Templates';
import { Reports } from './components/dashboard/Reports';
import { Team } from './components/dashboard/Team';
import { Configuracoes } from './components/dashboard/Configuracoes';
import { ControleAdmin } from './components/dashboard/ControleAdmin';
import { ProcessManagement } from './components/dashboard/ProcessManagement';
import { PendingSignatures } from './components/dashboard/PendingSignatures';
import Editor from './components/editor/Editor';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { LoginScreen } from './components/auth/LoginScreen';
import { SignupScreen } from './components/auth/SignupScreen';
import { ForgotPasswordScreen } from './components/auth/ForgotPasswordScreen';
import { ConsultaProcesso } from './components/auth/ConsultaProcesso';
import { SignatureVerifyScreen } from './components/auth/SignatureVerifyScreen';
import ConviteAcceptPage from './components/editor/ConviteAcceptPage';
import { useHeartbeat } from './hooks/useHeartbeat';

type DocumentStatus = 'Draft' | 'Review' | 'Approved' | 'Signed';

// ─── EditorPage ───────────────────────────────────────────────────────────────

const EditorPage: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const { user } = useAuth();

  const doc: REURBDocument | null = docId ? (dbService.documents.findById(docId) ?? null) : null;

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

  if (!user) return null;

  return (
    <div className="h-full bg-slate-100 p-6">
      <ErrorBoundary>
        <Editor
          title={titulo}
          status={status}
          initialContent={conteudo}
          onSave={handleSave}
          currentUser={user}
          docLocalId={docId}
        />
      </ErrorBoundary>
    </div>
  );
};

// ─── AppInner ─────────────────────────────────────────────────────────────────

const AppInner: React.FC = () => {
  const { user, loading, login, logout } = useAuth();
  useHeartbeat(!!user);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={40} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" /> : <LoginScreen onLoginSuccess={login} />}
      />
      <Route path="/signup" element={user ? <Navigate to="/" /> : <SignupScreen />} />
      <Route
        path="/forgot-password"
        element={user ? <Navigate to="/" /> : <ForgotPasswordScreen />}
      />
      <Route path="/consulta" element={<ConsultaProcesso />} />
      <Route path="/signature-verify/:protocol" element={<SignatureVerifyScreen />} />
      <Route path="/convite/:code" element={<ConviteAcceptPage currentUser={user} />} />
      <Route
        path="/*"
        element={
          !user ? (
            <Navigate to="/login" />
          ) : (
            <div className="flex min-h-screen bg-slate-50 font-sans">
              <Sidebar user={user} onLogout={logout} />
              <main className="flex-1 h-screen overflow-y-auto relative scroll-smooth">
                <Routes>
                  <Route path="/" element={<Dashboard user={user} />} />
                  <Route path="/processes" element={<ProcessManagement />} />
                  <Route path="/pending-signatures" element={<PendingSignatures />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/settings" element={<Configuracoes />} />
                  <Route path="/admin-control" element={<ControleAdmin />} />
                  <Route path="/edit/:docId" element={<EditorPage />} />
                </Routes>
              </main>
            </div>
          )
        }
      />
    </Routes>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────

const App: React.FC = () => (
  <AuthProvider>
    <Router>
      <AppInner />
    </Router>
  </AuthProvider>
);

export default App;
