// Re-exporta todos os tipos e constantes de constants para compatibilidade com imports existentes
export type {
  User,
  UserRole,
  TipoProfissional,
  FlagsAcesso,
  REURBProcess,
  REURBEtapa,
  REURBDocument,
  EtapaStatus,
  EixoEtapa,
  SubTarefa,
  LogAuditoria,
  AcaoAuditoria,
  DocumentModel,
  Comment,
} from '../constants';

export { ProcessStatus, ETAPAS_PADRAO, MOCK_PROCESSES } from '../constants';