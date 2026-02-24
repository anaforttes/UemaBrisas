-- ============================================================================
-- REURB-Doc Flow — Schema PostgreSQL
-- Sistema de Gestão de Regularização Fundiária Urbana (Lei 13.465/2017)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 0. Extensões
-- ────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────────────────────
-- 1. ENUMs
-- ────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('Online', 'Offline');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE process_status AS ENUM (
    'Inicial',
    'Iniciado',
    'Levantamento Técnico',
    'Em Análise',
    'Análise Jurídica',
    'Diligência',
    'Em Edital',
    'Aprovado',
    'Concluído',
    'Finalizado',
    'Arquivado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE process_modality AS ENUM ('REURB-S', 'REURB-E');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_status AS ENUM ('Draft', 'Review', 'Approved', 'Signed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE signature_status AS ENUM ('pending', 'signed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Função de trigger para updated_at automático
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. TABELAS
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 3.1 roles — Papéis do sistema (RBAC)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50)  NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- 3.2 users — Operadores / Usuários do sistema
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200)  NOT NULL,
  email           VARCHAR(255)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255)  NOT NULL,
  avatar_url      TEXT,
  status          user_status   NOT NULL DEFAULT 'Offline',
  last_login_at   TIMESTAMPTZ,
  -- Quota de IA
  quota_limit     INTEGER       NOT NULL DEFAULT 10000   CHECK (quota_limit >= 0),
  quota_used      INTEGER       NOT NULL DEFAULT 0       CHECK (quota_used >= 0),
  quota_reset_at  TIMESTAMPTZ,
  -- Auditoria
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ   -- soft delete
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_email       ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_status      ON users (status);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at  ON users (deleted_at) WHERE deleted_at IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 3.3 user_roles — Junção N–N entre users e roles
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);

-- Índices para FKs
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles (role_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 3.4 processes — Processos de REURB
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS processes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol         VARCHAR(20)      NOT NULL UNIQUE,
  title            VARCHAR(300)     NOT NULL,
  applicant        VARCHAR(300)     NOT NULL,
  location         TEXT,
  modality         process_modality NOT NULL,
  status           process_status   NOT NULL DEFAULT 'Inicial',
  area             VARCHAR(50),
  progress         SMALLINT         NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  responsible_name VARCHAR(200),
  technician_id    UUID             REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
  legal_id         UUID             REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
  -- Auditoria
  created_at       TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ      NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ      -- soft delete
);

CREATE TRIGGER trg_processes_updated_at
  BEFORE UPDATE ON processes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_processes_protocol       ON processes (protocol);
CREATE INDEX IF NOT EXISTS idx_processes_status         ON processes (status);
CREATE INDEX IF NOT EXISTS idx_processes_modality       ON processes (modality);
CREATE INDEX IF NOT EXISTS idx_processes_applicant      ON processes (applicant);
CREATE INDEX IF NOT EXISTS idx_processes_technician_id  ON processes (technician_id);
CREATE INDEX IF NOT EXISTS idx_processes_legal_id       ON processes (legal_id);
CREATE INDEX IF NOT EXISTS idx_processes_created_at     ON processes (created_at);
CREATE INDEX IF NOT EXISTS idx_processes_deleted_at     ON processes (deleted_at) WHERE deleted_at IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 3.5 process_history — Audit trail de mudanças de status
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS process_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id      UUID           NOT NULL REFERENCES processes (id) ON DELETE CASCADE ON UPDATE CASCADE,
  changed_by_id   UUID           REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
  from_status     process_status,
  to_status       process_status NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_process_history_process_id    ON process_history (process_id);
CREATE INDEX IF NOT EXISTS idx_process_history_changed_by    ON process_history (changed_by_id);
CREATE INDEX IF NOT EXISTS idx_process_history_created_at    ON process_history (created_at);

-- ────────────────────────────────────────────────────────────────────────────
-- 3.6 document_templates — Modelos de documentos oficiais
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(300) NOT NULL,
  type         VARCHAR(100) NOT NULL,
  version      VARCHAR(20)  NOT NULL DEFAULT '1.0',
  content_html TEXT,
  -- Auditoria
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_document_templates_name ON document_templates (name);
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates (type);

-- ────────────────────────────────────────────────────────────────────────────
-- 3.7 documents — Documentos dos processos
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id      UUID            NOT NULL REFERENCES processes (id) ON DELETE CASCADE ON UPDATE CASCADE,
  template_id     UUID            REFERENCES document_templates (id) ON DELETE SET NULL ON UPDATE CASCADE,
  author_id       UUID            REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
  title           VARCHAR(500)    NOT NULL,
  content         TEXT            NOT NULL DEFAULT '',
  status          document_status NOT NULL DEFAULT 'Draft',
  current_version INTEGER         NOT NULL DEFAULT 1 CHECK (current_version >= 1),
  -- Protocolo de assinatura (preenchido quando assinado)
  signature_protocol VARCHAR(50),
  document_hash      VARCHAR(100),
  -- Auditoria
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ     -- soft delete
);

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_documents_process_id   ON documents (process_id);
CREATE INDEX IF NOT EXISTS idx_documents_template_id  ON documents (template_id);
CREATE INDEX IF NOT EXISTS idx_documents_author_id    ON documents (author_id);
CREATE INDEX IF NOT EXISTS idx_documents_status       ON documents (status);
CREATE INDEX IF NOT EXISTS idx_documents_title        ON documents (title);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at   ON documents (deleted_at) WHERE deleted_at IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 3.8 document_versions — Histórico de versões do conteúdo
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID        NOT NULL REFERENCES documents (id) ON DELETE CASCADE ON UPDATE CASCADE,
  version      INTEGER     NOT NULL CHECK (version >= 1),
  content      TEXT        NOT NULL,
  edited_by_id UUID        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, version)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions (document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_edited_by   ON document_versions (edited_by_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 3.9 document_signatures — Assinaturas digitais
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_signatures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID             NOT NULL REFERENCES documents (id) ON DELETE CASCADE ON UPDATE CASCADE,
  signer_id       UUID             REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
  signer_name     VARCHAR(200)     NOT NULL,
  signer_role     VARCHAR(100)     NOT NULL,
  signer_email    VARCHAR(255)     NOT NULL,
  sign_order      SMALLINT         NOT NULL CHECK (sign_order >= 1),
  status          signature_status NOT NULL DEFAULT 'pending',
  signature_hash  VARCHAR(100),
  signed_at       TIMESTAMPTZ,
  ip_address      INET,
  -- Auditoria
  created_at      TIMESTAMPTZ      NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_doc_signatures_document_id ON document_signatures (document_id);
CREATE INDEX IF NOT EXISTS idx_doc_signatures_signer_id   ON document_signatures (signer_id);
CREATE INDEX IF NOT EXISTS idx_doc_signatures_status      ON document_signatures (status);

-- ────────────────────────────────────────────────────────────────────────────
-- 3.10 document_comments — Comentários / Notas nos documentos
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID        NOT NULL REFERENCES documents (id) ON DELETE CASCADE ON UPDATE CASCADE,
  author_id   UUID        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
  author_name VARCHAR(200) NOT NULL,
  text        TEXT         NOT NULL,
  resolved    BOOLEAN      NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_document_comments_updated_at
  BEFORE UPDATE ON document_comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_doc_comments_document_id ON document_comments (document_id);
CREATE INDEX IF NOT EXISTS idx_doc_comments_author_id   ON document_comments (author_id);
CREATE INDEX IF NOT EXISTS idx_doc_comments_resolved    ON document_comments (resolved);

-- ════════════════════════════════════════════════════════════════════════════
-- FIM DO SCHEMA
-- ════════════════════════════════════════════════════════════════════════════
