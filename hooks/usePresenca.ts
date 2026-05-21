import { useEffect, useRef, useState } from 'react';
import { auditoriaService, UsuarioPresenca, RegistroAuditoria } from '../services/auditoriaService';

export const usePresenca = (docId: string | null, enabled = true) => {
  const [usuariosOnline, setUsuariosOnline] = useState<UsuarioPresenca[]>([]);
  const [auditoria, setAuditoria] = useState<RegistroAuditoria[]>([]);
  const [carregando, setCarregando] = useState(false);
  const intervaloRef = useRef<NodeJS.Timeout | null>(null);
  const cursorPosRef = useRef<number | null>(null);

  const setCursorPos = (pos: number | null) => {
    cursorPosRef.current = pos;
  };

  useEffect(() => {
    if (!docId || !enabled) return;

    const atualizar = async () => {
      try {
        setCarregando(true);
        await auditoriaService.atualizarPresenca(docId, cursorPosRef.current);
        const presencas = await auditoriaService.obterPresenca(docId);
        setUsuariosOnline(presencas);
        const registros = await auditoriaService.listar(docId);
        setAuditoria(registros);
      } catch (err) {
        console.error('Erro ao atualizar presença:', err);
      } finally {
        setCarregando(false);
      }
    };

    atualizar();
    intervaloRef.current = setInterval(atualizar, 10000);

    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, [docId, enabled]);

  return { usuariosOnline, auditoria, carregando, setCursorPos };
};
