import { SignatureRecord } from '../components/editor/SignatureModal';

const STORAGE_KEY = 'reurb_signatures';

/**
 * Serviço de persistência de assinaturas digitais.
 * Armazena os registros de assinatura em localStorage indexados pelo título do documento.
 */
class SignatureStore {
    private getAll(): Record<string, SignatureRecord> {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    private saveAll(records: Record<string, SignatureRecord>) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }

    /** Busca uma assinatura pelo título do documento */
    getByDocumentTitle(title: string): SignatureRecord | null {
        const all = this.getAll();
        return all[title] || null;
    }

    /** Salva ou atualiza um registro de assinatura */
    save(record: SignatureRecord): void {
        const all = this.getAll();
        all[record.documentTitle] = record;
        this.saveAll(all);
    }

    /** Remove uma assinatura (revogar) */
    remove(documentTitle: string): void {
        const all = this.getAll();
        delete all[documentTitle];
        this.saveAll(all);
    }

    /** Lista todos os registros de assinatura */
    listAll(): SignatureRecord[] {
        return Object.values(this.getAll());
    }
}

export const signatureStore = new SignatureStore();
