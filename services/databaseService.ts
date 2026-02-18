
import { User, REURBProcess, REURBDocument, ProcessStatus } from '../types';

class SQLDatabase {
  private getStorage(table: string) {
    return JSON.parse(localStorage.getItem(`reurb_db_${table}`) || '[]');
  }

  private setStorage(table: string, data: any) {
    localStorage.setItem(`reurb_db_${table}`, JSON.stringify(data));
  }

  users = {
    insert: (user: any) => {
      const users = this.getStorage('users');
      const newUser = {
        id: `u-${Date.now()}`,
        avatar: user.avatar || `https://picsum.photos/seed/${user.name}/200`,
        quota: { limit: 10000, used: 0, resetAt: new Date(Date.now() + 3600000).toISOString() },
        ...user
      };
      users.push(newUser);
      this.setStorage('users', users);
      return newUser;
    },
    findByEmail: (email: string) => {
      const users = this.getStorage('users');
      return users.find((u: any) => u.email === email);
    },
    updateQuota: (userId: string, tokensUsed: number) => {
      const users = this.getStorage('users');
      const idx = users.findIndex((u: any) => u.id === userId);
      if (idx !== -1) {
        users[idx].quota.used += tokensUsed;
        this.setStorage('users', users);
        // Atualiza o localStorage do usuário logado também para refletir na UI
        const currentUser = JSON.parse(localStorage.getItem('reurb_current_user') || '{}');
        if (currentUser.id === userId) {
          currentUser.quota = users[idx].quota;
          localStorage.setItem('reurb_current_user', JSON.stringify(currentUser));
        }
        return users[idx];
      }
      return null;
    }
  };

  processes = {
    selectAll: (): REURBProcess[] => {
      return this.getStorage('processes');
    },
    insert: (process: Partial<REURBProcess>) => {
      const processes = this.getStorage('processes');
      const newProcess = {
        id: `PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        progress: 10,
        ...process
      };
      processes.push(newProcess);
      this.setStorage('processes', processes);
      return newProcess;
    },
    updateStatus: (id: string, status: ProcessStatus) => {
      const processes = this.getStorage('processes');
      const idx = processes.findIndex((p: any) => p.id === id);
      if (idx !== -1) {
        processes[idx].status = status;
        processes[idx].updatedAt = new Date().toISOString().split('T')[0];
        this.setStorage('processes', processes);
      }
    }
  };

  documents = {
    findByProcessId: (processId: string): REURBDocument[] => {
      const docs = this.getStorage('documents');
      return docs.filter((d: any) => d.processId === processId);
    },
    upsert: (doc: Partial<REURBDocument>) => {
      const docs = this.getStorage('documents');
      const existingIdx = docs.findIndex((d: any) => d.id === doc.id);
      const now = new Date().toISOString();
      
      if (existingIdx !== -1) {
        docs[existingIdx] = { ...docs[existingIdx], ...doc, updatedAt: now };
        this.setStorage('documents', docs);
        return docs[existingIdx];
      } else {
        const newDoc = {
          id: `doc-${Date.now()}`,
          version: 1,
          updatedAt: now,
          status: 'Draft',
          ...doc
        };
        docs.push(newDoc);
        this.setStorage('documents', docs);
        return newDoc;
      }
    }
  };
}

export const dbService = new SQLDatabase();

const initDB = () => {
  const existingUsers = JSON.parse(localStorage.getItem('reurb_db_users') || '[]');
  if (existingUsers.length === 0) {
    const defaultAdmin = {
      id: 'u-admin',
      name: 'Administrador Sistema',
      email: 'admin@reurb.gov.br',
      password: 'Admin123!',
      role: 'Admin',
      avatar: 'https://picsum.photos/seed/admin/200',
      quota: { limit: 50000, used: 0, resetAt: new Date(Date.now() + 86400000).toISOString() }
    };
    localStorage.setItem('reurb_db_users', JSON.stringify([defaultAdmin]));
  }

  const existingProcesses = JSON.parse(localStorage.getItem('reurb_db_processes') || '[]');
  if (existingProcesses.length === 0) {
    const initialProcesses = [
      {
        id: 'PR-2024-001',
        title: 'Núcleo Habitacional Esperança',
        applicant: 'Associação Vila Verde',
        modality: 'REURB-S',
        status: ProcessStatus.LEVANTAMENTO,
        createdAt: '2024-01-15',
        updatedAt: '2024-05-10',
        technicianId: 'u-2',
        legalId: 'u-admin',
        area: '15.400 m²',
        progress: 35
      }
    ];
    localStorage.setItem('reurb_db_processes', JSON.stringify(initialProcesses));
  }
};

initDB();
