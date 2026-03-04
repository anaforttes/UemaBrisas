import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const iconMap: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 size={16} className="text-green-500" />,
    error:   <AlertCircle  size={16} className="text-red-500"   />,
    info:    <Info         size={16} className="text-blue-500"  />,
  };
  const bgMap: Record<ToastType, string> = {
    success: 'bg-green-50 border-green-200',
    error:   'bg-red-50   border-red-200',
    info:    'bg-blue-50  border-blue-200',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl text-sm font-medium text-slate-700 pointer-events-auto animate-in slide-in-from-right-5 fade-in duration-300 max-w-xs ${bgMap[t.type]}`}
          >
            {iconMap[t.type]}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600 ml-1">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
