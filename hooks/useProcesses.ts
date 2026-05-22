import { useState, useCallback } from 'react';
import { dbService } from '../services/databaseService';
import {
  listarProcessos,
  meusProcessos,
  deletarProcesso,
  ProcessoMeu,
} from '../services/painelService';
import { etapasService } from '../services/etapasService';
import { REURBProcess } from '../types/index';

export function useProcesses() {
  const [processes, setProcesses] = useState<REURBProcess[]>([]);
  const [meusProcs, setMeusProcs] = useState<ProcessoMeu[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [data, meus] = await Promise.all([listarProcessos(), meusProcessos().catch(() => [])]);
      setProcesses(data.results);
      setMeusProcs(meus);
    } catch {
      setProcesses([]);
    }
  }, []);

  const handleProtocolar = useCallback(
    async (proc: REURBProcess) => {
      try {
        await etapasService.protocolar(proc.id);
        window.dispatchEvent(new CustomEvent('reurb:processos-alterados'));
      } catch {
        /* ignora */
      }
      fetchData();
    },
    [fetchData]
  );

  const handleDownloadZip = useCallback(async (proc: REURBProcess) => {
    if (!(window as any).JSZip) {
      await new Promise<void>((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    }

    const JSZip = (window as any).JSZip;
    const zip = new JSZip();
    const pasta = zip.folder(`processo_${proc.protocol || proc.id}`);

    const meta = [
      `PROCESSO: ${proc.protocol || proc.id}`,
      `REQUERENTE: ${proc.applicant}`,
      `NÚCLEO: ${proc.title}`,
      `MODALIDADE: ${proc.modality}`,
      `STATUS: ${proc.status}`,
      `LOCALIZAÇÃO: ${proc.location || '—'}`,
      `RESPONSÁVEL: ${proc.responsibleName || '—'}`,
      `ÁREA: ${proc.area || '—'}`,
      `PROGRESSO: ${proc.progress}%`,
      `CRIADO EM: ${proc.createdAt}`,
      `ATUALIZADO EM: ${proc.updatedAt}`,
    ].join('\n');
    pasta!.file('metadados.txt', meta);

    const documentos = dbService.documents.findByProcessId(proc.id);
    if (documentos.length > 0) {
      const pastaDocumentos = pasta!.folder('documentos');
      documentos.forEach((doc, i) => {
        const nomeArquivo = `${String(i + 1).padStart(2, '0')}_${doc.title.replace(/[^a-zA-Z0-9À-ú\s]/g, '').trim()}.html`;
        pastaDocumentos!.file(nomeArquivo, doc.content || '');
      });
    }

    const anexosSalvos = localStorage.getItem(`anexos_${proc.id}`);
    if (anexosSalvos) {
      const anexos = JSON.parse(anexosSalvos);
      if (anexos.length > 0) {
        const pastaAnexos = pasta!.folder('anexos');
        anexos.forEach((anexo: any) => {
          const base64Data = anexo.base64.split(',')[1] || anexo.base64;
          pastaAnexos!.file(anexo.nome, base64Data, { base64: true });
        });
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processo_${proc.protocol || proc.id}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const deleteProcess = useCallback(async (proc: REURBProcess): Promise<void> => {
    const idNumerico = /^\d+$/.test(proc.id);
    if (idNumerico) {
      await deletarProcesso(proc.id);
    }
    setProcesses((prev) => prev.filter((p) => p.id !== proc.id));
    window.dispatchEvent(new CustomEvent('reurb:processos-alterados'));
  }, []);

  return { processes, meusProcs, fetchData, handleProtocolar, handleDownloadZip, deleteProcess };
}
