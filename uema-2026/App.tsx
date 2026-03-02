
import React, { useState, useEffect } from 'react';
import {
  HashRouter as Router, Routes, Route, Navigate, useSearchParams
} from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { User } from './types/index';
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

const EditorWrapper: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const [searchParams] = useSearchParams();
  const templateName = searchParams.get('template') || 'Documento de Instauração';
  const templateContent = searchParams.get('content') || "<h1 style='text-align:center'>PORTARIA DE INSTAURAÇÃO REURB</h1><p>Considerando a Lei Federal 13.465/2017...</p>";

  return (
    <div className="h-full bg-slate-100 p-6">
      <Editor
        currentUser={currentUser}
        title={templateName}
        status="Draft"
        initialContent={templateContent}
        onSave={async (c, t, s) => {
          alert(s === 'Signed' ? 'Documento assinado digitalmente e salvo com sucesso!' : 'Documento salvo com sucesso!');
        }}
      />
    </div>
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
    localStorage.removeItem('reurb_token');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 size={40} className="text-blue-600 animate-spin" />
    </div>
  );

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginScreen onLoginSuccess={handleLogin} />} />
        <Route path="/signup" element={user ? <Navigate to="/" /> : <SignupScreen />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPasswordScreen />} />

        <Route path="/*" element={
          !user ? <Navigate to="/login" /> : (
            <div className="flex min-h-screen bg-slate-50 font-sans">
              <Sidebar user={user} onLogout={handleLogout} />
              <main className="flex-1 h-screen overflow-y-auto relative scroll-smooth">
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

export default App;
