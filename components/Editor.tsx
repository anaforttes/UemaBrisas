
import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, List, AlignLeft, AlignCenter, AlignRight, 
  Save, FileCheck, MessageSquare, History, Wand2, Download,
  CheckCircle2, AlertCircle, X, Send, Sparkles, RefreshCw
} from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface EditorProps {
  initialContent: string;
  title: string;
  onSave: (content: string, title: string) => void;
  status: string;
}

const Editor: React.FC<EditorProps> = ({ initialContent, title, onSave, status }) => {
  const [content, setContent] = useState(initialContent);
  const [localTitle, setLocalTitle] = useState(title);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const [activeUsers] = useState([
    { name: 'Ana Silva', color: 'bg-blue-500' },
    { name: 'Carlos Tech', color: 'bg-green-500' }
  ]);

  // Sincroniza o conteúdo inicial quando ele muda via props (autopreenchimento)
  useEffect(() => {
    setContent(initialContent);
    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent;
    }
  }, [initialContent]);

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const analysis = await geminiService.analyzeDocument(content);
      setAiAnalysis(analysis || "Nenhuma análise disponível.");
    } catch (error) {
      console.error(error);
      alert("Falha ao consultar a IA.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSmartEdit = async () => {
    if (!aiInstruction.trim()) return;
    
    setIsEditing(true);
    try {
      const newHtml = await geminiService.applySmartEdit(content, aiInstruction);
      if (newHtml) {
        setContent(newHtml);
        if (editorRef.current) {
          editorRef.current.innerHTML = newHtml;
        }
        setAiInstruction(""); // Limpa o comando após aplicar
        setAiAnalysis("Mudanças aplicadas com sucesso pela IA conforme sua instrução!");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao aplicar edições inteligentes.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleSave = () => {
    onSave(content, localTitle);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
        <div className="flex flex-col flex-1 mr-4">
          <input 
            type="text" 
            value={localTitle} 
            onChange={(e) => setLocalTitle(e.target.value)}
            className="text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 rounded px-1 -ml-1 transition-all border-none bg-transparent hover:bg-slate-50"
            placeholder="Digite o título do documento..."
          />
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              status === 'Review' ? 'bg-amber-100 text-amber-700' : 
              status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {status}
            </span>
            <span className="text-xs text-slate-400">Edição Ativa • IA Conectada</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 mr-4">
            {activeUsers.map((u, i) => (
              <div key={i} title={u.name} className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white ${u.color}`}>
                {u.name.charAt(0)}
              </div>
            ))}
          </div>
          <button 
            onClick={handleAiAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
          >
            <Wand2 size={16} className={isAnalyzing ? 'animate-pulse' : ''} />
            {isAnalyzing ? 'Analisando...' : 'Consultar IA'}
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Save size={18} />
            Salvar
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto p-12 bg-slate-100 flex justify-center">
          <div 
            ref={editorRef}
            className="w-full max-w-[816px] min-h-[1056px] bg-white shadow-xl p-[2cm] border border-slate-200 outline-none" 
            contentEditable 
            onInput={(e) => setContent(e.currentTarget.innerHTML)}
            suppressContentEditableWarning={true}
          />
        </div>

        {/* AI Sidebar */}
        <div className="w-80 border-l border-slate-200 bg-white flex flex-col">
          <div className="flex border-b border-slate-200">
            <button 
              onClick={() => setShowComments(false)}
              className={`flex-1 py-3 text-xs font-semibold ${!showComments ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
            >
              Comandos de IA
            </button>
            <button 
              onClick={() => setShowComments(true)}
              className={`flex-1 py-3 text-xs font-semibold ${showComments ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
            >
              Comentários
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {!showComments ? (
              <>
                {/* Smart Edit Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                    <Sparkles size={14} className="text-indigo-600" />
                    Edição Automática
                  </h4>
                  <div className="relative">
                    <textarea 
                      value={aiInstruction}
                      onChange={(e) => setAiInstruction(e.target.value)}
                      placeholder="Ex: 'Mude o beneficiário para Ricardo Silva', 'Atualize a área para 200m²', 'Reescreva o parágrafo de fundamentação'..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[120px] resize-none"
                    />
                    <button 
                      onClick={handleSmartEdit}
                      disabled={isEditing || !aiInstruction.trim()}
                      className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isEditing ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
                      Executar Alteração
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Analysis Result */}
                {aiAnalysis && (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative animate-in fade-in slide-in-from-top-2">
                    <button onClick={() => setAiAnalysis(null)} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Feedback do Sistema</h4>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {aiAnalysis}
                    </p>
                  </div>
                )}

                {/* Legal Checklist */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-700 uppercase mb-3 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-green-600" /> 
                    Checklist de REURB
                  </h4>
                  <ul className="space-y-2">
                    {[
                      { label: 'Qualificação Completa', ok: true },
                      { label: 'Fundamentação Art. 12', ok: true },
                      { label: 'Indicação de Beneficiários', ok: true }
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">{item.label}</span>
                        <CheckCircle2 size={14} className="text-green-500" />
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-10 opacity-40">
                <MessageSquare size={32} className="mx-auto mb-2" />
                <p className="text-xs font-medium">Nenhum comentário pendente.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="h-14 bg-slate-900 text-white flex items-center justify-center gap-6 px-6">
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-slate-800 rounded transition-colors"><Bold size={18} /></button>
          <button className="p-2 hover:bg-slate-800 rounded transition-colors"><Italic size={18} /></button>
          <div className="w-px h-6 bg-slate-700 mx-2" />
          <button className="p-2 hover:bg-slate-800 rounded transition-colors"><AlignLeft size={18} /></button>
          <button className="p-2 hover:bg-slate-800 rounded transition-colors"><AlignCenter size={18} /></button>
          <button className="p-2 hover:bg-slate-800 rounded transition-colors"><AlignRight size={18} /></button>
          <div className="w-px h-6 bg-slate-700 mx-2" />
          <button className="p-2 hover:bg-slate-800 rounded transition-colors"><List size={18} /></button>
        </div>
        <div className="w-px h-6 bg-slate-700 mx-4" />
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs font-bold uppercase tracking-wider">
          <FileCheck size={18} />
          Finalizar Documento
        </button>
      </div>
    </div>
  );
};

export default Editor;
