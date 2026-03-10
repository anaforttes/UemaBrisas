
import React, { useState, useEffect } from 'react';
import {
  HashRouter as Router, Routes, Route, Navigate, useSearchParams, useParams
} from 'react-router-dom';
import { Loader2, FolderKanban, X } from 'lucide-react';
import { User, REURBProcess } from './types/index';
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
import { AuthProvider, useAuth } from './components/auth/AuthContext';
import { ToastProvider, useToast } from './components/common/Toast';

// ─── Modal para vincular documento a um processo ─────────────────────
const LinkProcessModal: React.FC<{
  onLink: (processId: string) => void;
  onSkip: () => void;
}> = ({ onLink, onSkip }) => {
  const [processes, setProcesses] = useState<REURBProcess[]>([]);
  const [search, setSearch] = useState('');
  useEffect(() => { dbService.processes.selectAll().then(setProcesses).catch(() => {}); }, []);
  const filtered = processes.filter(p =>
    p.applicant.toLowerCase().includes(search.toLowerCase()) ||
    p.protocol.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-800">Vincular a um Processo</h3>
            <p className="text-xs text-slate-400 mt-0.5">Escolha o processo ao qual este documento pertence</p>
          </div>
          <button onClick={onSkip} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={18} /></button>
        </div>
        <div className="p-4">
          <input
            type="text"
            placeholder="Buscar por requerente ou protocolo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-200 outline-none mb-3"
          />
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filtered.slice(0, 10).map(p => (
              <button
                key={p.id}
                onClick={() => onLink(p.id)}
                className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-transparent rounded-xl transition-all text-left"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FolderKanban size={15} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{p.applicant}</p>
                  <p className="text-[10px] text-slate-400">{p.protocol} · {p.status}</p>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">Nenhum processo encontrado.</p>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={onSkip}
            className="w-full py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
          >
            Salvar sem vincular a processo
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Wrapper do Editor ────────────────────────────────────────────────
const EditorWrapper: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const [searchParams] = useSearchParams();
  const { docId } = useParams<{ docId: string }>();
  const { showToast } = useToast();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [pendingSave, setPendingSave] = useState<{ content: string; title: string; status?: string } | null>(null);
  const [savedDocId, setSavedDocId] = useState<string | undefined>(docId !== 'new' ? docId : undefined);
  const [linkedProcessId, setLinkedProcessId] = useState<string>('');

  const templateName = searchParams.get('template') || 'Documento de Instauração';
  const urlProcessId = searchParams.get('processId') || '';
  const templateContent = searchParams.get('content') || "<h1 style='text-align:center'>PORTARIA DE INSTAURAÇÃO REURB</h1><p>Considerando a Lei Federal 13.465/2017...</p>";

  // Usa processId da URL ou o que foi vinculado manualmente
  const effectiveProcessId = linkedProcessId || urlProcessId;

  const doSave = async (content: string, title: string, processId: string | undefined, status?: string) => {
    const result = await dbService.documents.upsert({
      id: savedDocId,
      processId: processId || undefined,
      title,
      content,
      status: (status || 'Draft') as any,
      authorId: currentUser.id,
    });
    // Guardar o ID retornado para que o próximo save atualize em vez de criar
    if (result?.id) {
      setSavedDocId(result.id);
    }
    showToast(
      status === 'Signed'
        ? 'Documento assinado e vinculado ao processo!'
        : processId
          ? 'Documento salvo e vinculado ao processo!'
          : 'Documento salvo como rascunho.',
      'success',
    );
  };

  const handleSave = async (content: string, title: string, status?: string) => {
    // Se é um documento novo e ainda não tem processo vinculado, perguntar
    if (docId === 'new' && !effectiveProcessId) {
      setPendingSave({ content, title, status });
      setShowLinkModal(true);
      return;
    }
    try {
      await doSave(content, title, effectiveProcessId || undefined, status);
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar documento.', 'error');
    }
  };

  const handleLink = async (processId: string) => {
    setLinkedProcessId(processId);
    setShowLinkModal(false);
    if (pendingSave) {
      try {
        await doSave(pendingSave.content, pendingSave.title, processId, pendingSave.status);
      } catch (err: any) {
        showToast(err.message || 'Erro ao salvar documento.', 'error');
      }
      setPendingSave(null);
    }
  };

  const handleSkipLink = async () => {
    setShowLinkModal(false);
    if (pendingSave) {
      try {
        await doSave(pendingSave.content, pendingSave.title, undefined, pendingSave.status);
      } catch (err: any) {
        showToast(err.message || 'Erro ao salvar documento.', 'error');
      }
      setPendingSave(null);
    }
  };

  return (
    <>
      {showLinkModal && <LinkProcessModal onLink={handleLink} onSkip={handleSkipLink} />}
      <div className="h-full bg-slate-100 p-2 sm:p-4 lg:p-6">
        {linkedProcessId && (
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
            <FolderKanban size={13} />
            Vinculado ao processo selecionado
            <button onClick={() => setLinkedProcessId('')} className="ml-auto text-slate-400 hover:text-slate-600"><X size={13} /></button>
          </div>
        )}
        <Editor
          currentUser={currentUser}
          title={templateName}
          status="Draft"
          initialContent={templateContent}
          onSave={handleSave}
          onNotify={showToast}
        />
      </div>
    </>
  );
};

const AppRoutes: React.FC = () => {
  const { user, loading, login, logout } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 size={40} className="text-blue-600 animate-spin" />
    </div>
  );

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginScreen onLoginSuccess={login} />} />
        <Route path="/signup" element={user ? <Navigate to="/" /> : <SignupScreen />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPasswordScreen />} />

        <Route path="/*" element={
          !user ? <Navigate to="/login" /> : (
            <div className="flex min-h-screen bg-slate-50 font-sans">
              <Sidebar user={user} onLogout={logout} />
              <main className="flex-1 min-h-screen lg:h-screen overflow-y-auto relative scroll-smooth pt-16 lg:pt-0">
                <Routes>
                  <Route path="/" element={<Dashboard user={user} />} />
                  <Route path="/processes" element={<ProcessManagement />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/settings" element={<div className="p-10"><h2 className="text-2xl font-black text-slate-800">Configurações</h2></div>} />
                  <Route path="/edit/:docId" element={
                    <EditorWrapper currentUser={user} />
                  } />
                </Routes>
              </main>
            </div>
          )
        } />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  </AuthProvider>
);

export default App;
