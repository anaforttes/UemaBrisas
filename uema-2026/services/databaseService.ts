import {
  User,
  REURBProcess,
  REURBEtapa,
  REURBDocument,
  EtapaStatus,
  LogAuditoria,
  ProcessStatus,
  ETAPAS_PADRAO,
} from '../types/index';
import { MOCK_PROCESSES } from '../constants';

export { ProcessStatus, MOCK_PROCESSES };

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('reurb_access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ─── Classe principal ─────────────────────────────────────────────────────────

class SQLDatabase {
  private getStorage<T>(key: string): T[] {
    try {
      const raw = localStorage.getItem(`reurb_db_${key}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private setStorage<T>(key: string, data: T[]): void {
    localStorage.setItem(`reurb_db_${key}`, JSON.stringify(data));
  }

  // ─── Usuários ───────────────────────────────────────────────────────────────

  users = {
    selectAll: async (): Promise<User[]> => {
      try {
        const response = await fetch(`${API_URL}/api/equipe/membros/`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error('Erro ao buscar membros');
        }
        const data = await response.json();
        return data.map((m: any) => ({
          id: m.id.toString(),
          name: m.name,
          email: m.email,
          avatar: m.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.name)}`,
          role: m.role,
          status: m.status,
          lastLogin: m.last_login,
          quota: m.quota,
          flags: m.flags,
          permissions: m.permissions,
        }));
      } catch (error) {
        console.error('Erro ao buscar usuários da API, usando dados locais:', error);
        return this.getStorage<User>('users');
      }
    },

    insert: async (data: { name: string; email: string; role: string; flags?: any; permissions?: any }): Promise<User> => {
      try {
        const payload = {
          name: data.name,
          email: data.email,
          role: data.role,
          flags: data.flags || {},
          permissions: data.permissions || {},
        };
        const response = await fetch(`${API_URL}/api/equipe/membros/`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || 'Erro ao criar membro');
        }
        const m = await response.json();
        return {
          id: m.id.toString(),
          name: m.name,
          email: m.email,
          avatar: m.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.name)}`,
          role: m.role,
          status: m.status,
          lastLogin: m.last_login,
          quota: m.quota,
          flags: m.flags,
          permissions: m.permissions,
        };
      } catch (error) {
        console.error('Erro ao criar usuário na API:', error);
        throw error;
      }
    },

    update: async (id: string, data: Partial<User>): Promise<User> => {
      try {
        const payload = {
          name: data.name,
          email: data.email,
          role: data.role,
          status: data.status,
          flags: data.flags,
          permissions: data.permissions,
          quota_used: data.quota?.used,
          quota_limit: data.quota?.limit,
        };
        const response = await fetch(`${API_URL}/api/equipe/membros/${id}/`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || 'Erro ao atualizar membro');
        }
        const m = await response.json();
        return {
          id: m.id.toString(),
          name: m.name,
          email: m.email,
          avatar: m.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.name)}`,
          role: m.role,
          status: m.status,
          lastLogin: m.last_login,
          quota: m.quota,
          flags: m.flags,
          permissions: m.permissions,
        };
      } catch (error) {
        console.error('Erro ao atualizar usuário na API:', error);
        throw error;
      }
    },

    delete: async (id: string): Promise<void> => {
      try {
        const response = await fetch(`${API_URL}/api/equipe/membros/${id}/`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error('Erro ao deletar membro');
        }
      } catch (error) {
        console.error('Erro ao deletar usuário na API:', error);
        throw error;
      }
    },

    findByEmail: (email: string): User | undefined => {
      // For compatibility, but since it's async now, this is synchronous fallback
      const users = this.getStorage<User>('users');
      return users.find((u) => u.email === email);
    },

    findById: (id: string): User | undefined => {
      const users = this.getStorage<User>('users');
      return users.find((u) => u.id === id);
    },
  };

  // ─── Processos ─────────────────────────────────────────────────────────────

  processes = {
    selectAll: (): REURBProcess[] => {
      const doDb = this.getStorage<REURBProcess>('processes');
      return doDb.length > 0 ? doDb : MOCK_PROCESSES;
    },

    findById: (id: string): REURBProcess | undefined => {
      const doDb = this.getStorage<REURBProcess>('processes');
      const fonte = doDb.length > 0 ? doDb : MOCK_PROCESSES;
      return fonte.find((p) => p.id === id);
    },

    insert: (process: Partial<REURBProcess>): REURBProcess => {
      const processes = this.getStorage<REURBProcess>('processes');
      const year = new Date().getFullYear();
      const count =
        processes.filter((p) => p.protocol?.endsWith(`-${year}`)).length + 1;
      const protocol = `${String(count).padStart(4, '0')}-${year}`;

      const newProcess: REURBProcess = {
        id: `PR-${year}-${Math.floor(1000 + Math.random() * 9000)}`,
        protocol,
        title: process.title ?? 'Sem título',
        applicant: process.applicant ?? 'Não informado',
        modality: process.modality ?? 'REURB-S',
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        status: ProcessStatus.PENDENTE,
        protocolado: false,
        progress: 0,
        area: '0 m²',
        responsibleName: 'Não atribuído',
        technicianId: '',
        legalId: '',
        ...process,
      };
      processes.unshift(newProcess);
      this.setStorage('processes', processes);
      return newProcess;
    },

    updateStatus: (id: string, status: ProcessStatus) => {
      const processes = this.getStorage<REURBProcess>('processes');
      const idx = processes.findIndex((p) => p.id === id);
      if (idx !== -1) {
        processes[idx].status = status;
        processes[idx].updatedAt = new Date().toISOString().split('T')[0];
        this.setStorage('processes', processes);
      }
    },

    update: (id: string, data: Partial<REURBProcess>): REURBProcess | null => {
      const processes = this.getStorage<REURBProcess>('processes');
      const idx = processes.findIndex((p) => p.id === id);
      if (idx !== -1) {
        processes[idx] = {
          ...processes[idx],
          ...data,
          updatedAt: new Date().toISOString().split('T')[0],
        };
        this.setStorage('processes', processes);
        return processes[idx];
      }
      return null;
    },

    protocolar: (id: string, usuarioId: string, usuarioNome: string): REURBEtapa[] => {
      const processes = this.getStorage<REURBProcess>('processes');
      const idx = processes.findIndex((p) => p.id === id);
      if (idx === -1) return [];
      if (processes[idx].protocolado) return dbService.etapas.findByProcessId(id);

      processes[idx].protocolado = true;
      processes[idx].status = ProcessStatus.EM_ANDAMENTO;
      processes[idx].updatedAt = new Date().toISOString().split('T')[0];
      this.setStorage('processes', processes);

      const etapas = dbService.etapas.criarEtapasPadrao(id);

      dbService.auditoria.registrar({
        usuarioId,
        usuarioNome,
        acao: 'protocolo',
        entidade: 'processo',
        entidadeId: id,
        descricao: `Processo ${processes[idx].protocol} protocolado. 14 etapas criadas.`,
      });

      return etapas;
    },
  };

  // ─── Etapas ────────────────────────────────────────────────────────────────

  etapas = {
    findByProcessId: (processId: string): REURBEtapa[] => {
      const etapas = this.getStorage<REURBEtapa>('etapas');
      return etapas
        .filter((e) => e.processId === processId)
        .sort((a, b) => a.numero - b.numero);
    },

    criarEtapasPadrao: (processId: string): REURBEtapa[] => {
      const etapas = this.getStorage<REURBEtapa>('etapas');
      const novas: REURBEtapa[] = ETAPAS_PADRAO.map((etapa) => ({
        ...etapa,
        id: `etapa-${processId}-${etapa.numero}`,
        processId,
        status: (etapa.numero === 1 ? 'em_andamento' : 'pendente') as EtapaStatus,
        dataInicio: etapa.numero === 1 ? new Date().toISOString().split('T')[0] : undefined,
        subTarefas: [],
      }));
      etapas.push(...novas);
      this.setStorage('etapas', etapas);
      return novas;
    },

    updateStatus: (
      etapaId: string,
      status: EtapaStatus,
      usuarioId: string,
      usuarioNome: string
    ): REURBEtapa | null => {
      const etapas = this.getStorage<REURBEtapa>('etapas');
      const idx = etapas.findIndex((e) => e.id === etapaId);
      if (idx === -1) return null;

      etapas[idx].status = status;
      if (status === 'em_andamento' && !etapas[idx].dataInicio) {
        etapas[idx].dataInicio = new Date().toISOString().split('T')[0];
      }
      if (status === 'concluida') {
        etapas[idx].dataConclusao = new Date().toISOString().split('T')[0];
      }
      this.setStorage('etapas', etapas);

      dbService.auditoria.registrar({
        usuarioId,
        usuarioNome,
        acao: 'mudanca_status',
        entidade: 'etapa',
        entidadeId: etapaId,
        descricao: `Etapa "${etapas[idx].nome}" alterada para "${status}".`,
      });

      const etapasDoProcesso = etapas.filter((e) => e.processId === etapas[idx].processId);
      const concluidas = etapasDoProcesso.filter((e) => e.status === 'concluida').length;
      const progresso = Math.round((concluidas / 14) * 100);
      dbService.processes.update(etapas[idx].processId, { progress: progresso });

      return etapas[idx];
    },

    atribuirResponsavel: (
      etapaId: string,
      responsavelId: string,
      responsavelNome: string
    ): REURBEtapa | null => {
      const etapas = this.getStorage<REURBEtapa>('etapas');
      const idx = etapas.findIndex((e) => e.id === etapaId);
      if (idx === -1) return null;
      etapas[idx].responsavelId = responsavelId;
      etapas[idx].responsavelNome = responsavelNome;
      this.setStorage('etapas', etapas);
      return etapas[idx];
    },

    atualizarObservacoes: (etapaId: string, observacoes: string): REURBEtapa | null => {
      const etapas = this.getStorage<REURBEtapa>('etapas');
      const idx = etapas.findIndex((e) => e.id === etapaId);
      if (idx === -1) return null;
      etapas[idx].observacoes = observacoes;
      this.setStorage('etapas', etapas);
      return etapas[idx];
    },

    podeiniciar: (etapaId: string): boolean => {
      const etapas = this.getStorage<REURBEtapa>('etapas');
      const etapa = etapas.find((e) => e.id === etapaId);
      if (!etapa || !etapa.dependeDe || etapa.dependeDe.length === 0) return true;
      const etapasDoProcesso = etapas.filter((e) => e.processId === etapa.processId);
      return etapa.dependeDe.every((num) => {
        const dep = etapasDoProcesso.find((e) => e.numero === num);
        return dep?.status === 'concluida';
      });
    },
  };

  // ─── Documentos ────────────────────────────────────────────────────────────

  documents = {
    findByProcessId: (processId: string): REURBDocument[] => {
      const docs = this.getStorage<REURBDocument>('documents');
      return docs.filter((d) => d.processId === processId);
    },

    findById: (id: string): REURBDocument | undefined => {
      const docs = this.getStorage<REURBDocument>('documents');
      return docs.find((d) => d.id === id);
    },

    upsert: (doc: Partial<REURBDocument>): REURBDocument => {
      const docs = this.getStorage<REURBDocument>('documents');
      const existingIdx = docs.findIndex((d) => d.id === doc.id);
      const now = new Date().toISOString();

      if (existingIdx !== -1) {
        const updatedDoc = { ...docs[existingIdx], ...doc, updatedAt: now };
        docs[existingIdx] = updatedDoc;
        this.setStorage('documents', docs);
        return updatedDoc;
      } else {
        const newDoc: REURBDocument = {
          id: `doc-${Date.now()}`,
          version: 1,
          updatedAt: now,
          status: 'Draft',
          content: '',
          title: '',
          processId: '',
          authorId: '',
          ...doc,
        };
        docs.push(newDoc);
        this.setStorage('documents', docs);
        return newDoc;
      }
    },
  };

  // ─── Auditoria ─────────────────────────────────────────────────────────────

  auditoria = {
    registrar: (log: Omit<LogAuditoria, 'id' | 'criadoEm' | 'ip'>): LogAuditoria => {
      const logs = this.getStorage<LogAuditoria>('auditoria');
      const novoLog: LogAuditoria = {
        ...log,
        id: `log-${Date.now()}`,
        criadoEm: new Date().toISOString(),
        ip: 'local',
      };
      logs.unshift(novoLog);
      if (logs.length > 500) logs.splice(500);
      this.setStorage('auditoria', logs);
      return novoLog;
    },

    selectAll: (): LogAuditoria[] => {
      return this.getStorage<LogAuditoria>('auditoria');
    },

    findByEntidade: (entidadeId: string): LogAuditoria[] => {
      const logs = this.getStorage<LogAuditoria>('auditoria');
      return logs.filter((l) => l.entidadeId === entidadeId);
    },
  };
}

export const dbService = new SQLDatabase();

// ─── Inicialização ────────────────────────────────────────────────────────────

const initDB = () => {
  const usersData = localStorage.getItem('reurb_db_users');
  if (!usersData || JSON.parse(usersData).length === 0) {
    const defaultUsers = [
      {
        id: 'u-admin',
        name: 'Administrador do Sistema',
        email: 'admin@reurb.gov.br',
        password: 'Admin123!',
        role: 'Admin' as const,
        tipoProfissional: 'Advogado',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        status: 'Offline' as const,
        lastLogin: new Date().toISOString(),
        quota: { limit: 50000, used: 0, resetAt: new Date(Date.now() + 86400000).toISOString() },
        flags: {
          superusuario:        true,
          adminMunicipio:      true,
          profissionalInterno: true,
          usuarioExterno:      false,
        },
        etapasPermitidas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      },
    ];
    localStorage.setItem('reurb_db_users', JSON.stringify(defaultUsers));
  }
};

initDB();