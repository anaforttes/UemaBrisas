-- ============================================================================
-- REURB-Doc Flow — Seeds PostgreSQL
-- Dados iniciais realistas para o sistema
-- ============================================================================
-- NOTA: Execute este arquivo APÓS o schema.sql
-- As senhas usam crypt() + gen_salt() do pgcrypto (bcrypt)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. ROLES — Papéis do sistema
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO roles (id, name, description) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Admin',     'Administrador do sistema — acesso total'),
  ('a0000000-0000-0000-0000-000000000002', 'Técnico',   'Engenheiro / Agrimensura — levantamento técnico'),
  ('a0000000-0000-0000-0000-000000000003', 'Jurídico',  'Procuradoria — análise jurídica e pareceres'),
  ('a0000000-0000-0000-0000-000000000004', 'Atendente', 'Assistente Social — atendimento ao cidadão'),
  ('a0000000-0000-0000-0000-000000000005', 'Gestor',    'Gestor Municipal — supervisão e aprovação'),
  ('a0000000-0000-0000-0000-000000000006', 'Auditor',   'Auditor — leitura e auditoria de processos')
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. USERS — Operadores do sistema
-- ────────────────────────────────────────────────────────────────────────────
-- Senha padrão para todos os seeds: "Admin123!"
-- Em produção, usar hashes reais via crypt('senha', gen_salt('bf'))

INSERT INTO users (id, name, email, password_hash, avatar_url, status, quota_limit, quota_used, last_login_at) VALUES
  (
    'u0000000-0000-0000-0000-000000000001',
    'Administrador do Sistema',
    'admin@reurb.gov.br',
    crypt('Admin123!', gen_salt('bf')),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    'Offline',
    50000, 0, now()
  ),
  (
    'u0000000-0000-0000-0000-000000000002',
    'Dr. Ricardo Silva',
    'ricardo.juridico@prefeitura.gov.br',
    crypt('Admin123!', gen_salt('bf')),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=ricardo',
    'Offline',
    10000, 500, now() - INTERVAL '2 hours'
  ),
  (
    'u0000000-0000-0000-0000-000000000003',
    'Eng. Ana Paula Torres',
    'ana.tecnico@prefeitura.gov.br',
    crypt('Admin123!', gen_salt('bf')),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=ana',
    'Offline',
    10000, 1200, now() - INTERVAL '1 day'
  ),
  (
    'u0000000-0000-0000-0000-000000000004',
    'Carlos Eduardo Mendes',
    'carlos.gestor@prefeitura.gov.br',
    crypt('Admin123!', gen_salt('bf')),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos',
    'Offline',
    10000, 0, NULL
  )
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. USER_ROLES — Atribuição de papéis
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO user_roles (user_id, role_id) VALUES
  -- Admin recebe role Admin
  ('u0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  -- Ricardo recebe role Jurídico
  ('u0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003'),
  -- Ana recebe role Técnico
  ('u0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002'),
  -- Carlos recebe role Gestor
  ('u0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. PROCESSES — Processos REURB
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO processes (id, protocol, title, applicant, location, modality, status, area, progress, responsible_name, technician_id, legal_id, created_at, updated_at) VALUES
  (
    'p0000000-0000-0000-0000-000000000001',
    '2024.0001',
    'Núcleo Habitacional Esperança',
    'Associação de Moradores Vila Verde',
    'Rua das Palmeiras, 100 - Bairro Esperança, São Luís/MA',
    'REURB-S',
    'Levantamento Técnico',
    '15.400 m²',
    35,
    'Eng. Ana Paula Torres',
    'u0000000-0000-0000-0000-000000000003',
    'u0000000-0000-0000-0000-000000000002',
    '2024-01-15', '2024-05-10'
  ),
  (
    'p0000000-0000-0000-0000-000000000002',
    '2024.0002',
    'Loteamento Jardim Aurora',
    'Imobiliária Horizonte Ltda',
    'Av. Brasil, 2500 - Jardim Aurora, São Luís/MA',
    'REURB-E',
    'Análise Jurídica',
    '8.200 m²',
    60,
    'Dr. Ricardo Silva',
    'u0000000-0000-0000-0000-000000000003',
    'u0000000-0000-0000-0000-000000000002',
    '2024-02-20', '2024-05-12'
  ),
  (
    'p0000000-0000-0000-0000-000000000003',
    '2023.0089',
    'Comunidade Santa Luzia',
    'Secretaria de Habitação',
    'Travessa Santa Luzia, s/n - Centro, Paço do Lumiar/MA',
    'REURB-S',
    'Finalizado',
    '42.000 m²',
    100,
    'Carlos Eduardo Mendes',
    'u0000000-0000-0000-0000-000000000003',
    'u0000000-0000-0000-0000-000000000002',
    '2023-08-05', '2024-04-30'
  )
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. PROCESS_HISTORY — Histórico de status
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO process_history (process_id, changed_by_id, from_status, to_status, notes) VALUES
  -- Esperança
  ('p0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', NULL,                      'Inicial',               'Protocolo aberto'),
  ('p0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000003', 'Inicial',                 'Levantamento Técnico',  'Equipe técnica designada para vistoria'),
  -- Jardim Aurora
  ('p0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000001', NULL,                      'Inicial',               'Protocolo aberto'),
  ('p0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000003', 'Inicial',                 'Levantamento Técnico',  'Levantamento topográfico concluído'),
  ('p0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000002', 'Levantamento Técnico',    'Análise Jurídica',      'Documentação encaminhada à Procuradoria'),
  -- Santa Luzia (fluxo completo)
  ('p0000000-0000-0000-0000-000000000003', 'u0000000-0000-0000-0000-000000000001', NULL,                      'Inicial',               'Protocolo aberto'),
  ('p0000000-0000-0000-0000-000000000003', 'u0000000-0000-0000-0000-000000000003', 'Inicial',                 'Levantamento Técnico',  'Levantamento técnico-social iniciado'),
  ('p0000000-0000-0000-0000-000000000003', 'u0000000-0000-0000-0000-000000000002', 'Levantamento Técnico',    'Análise Jurídica',      'Parecer jurídico favorável'),
  ('p0000000-0000-0000-0000-000000000003', 'u0000000-0000-0000-0000-000000000004', 'Análise Jurídica',        'Aprovado',              'Aprovação do Gestor Municipal'),
  ('p0000000-0000-0000-0000-000000000003', 'u0000000-0000-0000-0000-000000000001', 'Aprovado',                'Finalizado',            'Títulos emitidos e registrados em cartório');

-- ────────────────────────────────────────────────────────────────────────────
-- 6. DOCUMENT_TEMPLATES — Modelos oficiais
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO document_templates (id, name, type, version, content_html) VALUES
  ('t0000000-0000-0000-0000-000000000001', 'Portaria de Instauração',           'Administrativo', '2.1', '<h1>PORTARIA DE INSTAURAÇÃO REURB</h1><p>Considerando a Lei Federal 13.465/2017...</p>'),
  ('t0000000-0000-0000-0000-000000000002', 'Notificação de Confrontantes',      'Notificação',    '1.5', '<h1>NOTIFICAÇÃO DE CONFRONTANTES</h1><p>Ficam notificados os proprietários confrontantes...</p>'),
  ('t0000000-0000-0000-0000-000000000003', 'Relatório Técnico Social',          'Técnico',        '3.0', '<h1>RELATÓRIO TÉCNICO SOCIAL</h1><p>Conforme levantamento realizado em campo...</p>'),
  ('t0000000-0000-0000-0000-000000000004', 'Auto de Demarcação Urbanística',    'Técnico',        '1.2', '<h1>AUTO DE DEMARCAÇÃO URBANÍSTICA</h1><p>Em conformidade com o Art. 19 da Lei 13.465/2017...</p>'),
  ('t0000000-0000-0000-0000-000000000005', 'Título de Legitimação Fundiária',   'Titularidade',   '4.2', '<h1>TÍTULO DE LEGITIMAÇÃO FUNDIÁRIA</h1><p>Nos termos do Art. 23 da Lei 13.465/2017...</p>')
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. DOCUMENTS — Documentos vinculados a processos
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO documents (id, process_id, template_id, author_id, title, content, status, current_version) VALUES
  (
    'd0000000-0000-0000-0000-000000000001',
    'p0000000-0000-0000-0000-000000000001',
    't0000000-0000-0000-0000-000000000001',
    'u0000000-0000-0000-0000-000000000002',
    'Portaria de Instauração — Núcleo Esperança',
    '<h1 style="text-align:center">PORTARIA DE INSTAURAÇÃO REURB</h1><p>Considerando a Lei Federal 13.465/2017 e a necessidade de regularização do Núcleo Habitacional Esperança...</p>',
    'Draft',
    1
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'p0000000-0000-0000-0000-000000000002',
    't0000000-0000-0000-0000-000000000003',
    'u0000000-0000-0000-0000-000000000003',
    'Relatório Técnico Social — Jardim Aurora',
    '<h1>RELATÓRIO TÉCNICO SOCIAL</h1><p>Conforme levantamento realizado no Loteamento Jardim Aurora em 15/03/2024, a área total compreende 8.200 m², com 42 famílias residentes.</p>',
    'Review',
    2
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    'p0000000-0000-0000-0000-000000000003',
    't0000000-0000-0000-0000-000000000005',
    'u0000000-0000-0000-0000-000000000002',
    'Título de Legitimação Fundiária — Santa Luzia',
    '<h1>TÍTULO DE LEGITIMAÇÃO FUNDIÁRIA</h1><p>O presente título confere legitimação fundiária aos beneficiários da Comunidade Santa Luzia, nos termos do Art. 23 da Lei 13.465/2017.</p>',
    'Signed',
    3
  )
ON CONFLICT (id) DO NOTHING;

-- Corrigir o documento assinado com protocolo e hash (campos extras)
UPDATE documents 
SET signature_protocol = 'REURB-2024-5482901', 
    document_hash = 'A1B2C3D4E5F6A7B8'
WHERE id = 'd0000000-0000-0000-0000-000000000003';

-- ────────────────────────────────────────────────────────────────────────────
-- 8. DOCUMENT_VERSIONS — Histórico de versões
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO document_versions (document_id, version, content, edited_by_id) VALUES
  ('d0000000-0000-0000-0000-000000000001', 1, '<h1>PORTARIA DE INSTAURAÇÃO REURB</h1><p>Rascunho inicial.</p>', 'u0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000002', 1, '<h1>RELATÓRIO TÉCNICO SOCIAL</h1><p>Versão preliminar.</p>', 'u0000000-0000-0000-0000-000000000003'),
  ('d0000000-0000-0000-0000-000000000002', 2, '<h1>RELATÓRIO TÉCNICO SOCIAL</h1><p>Conforme levantamento realizado no Loteamento Jardim Aurora...</p>', 'u0000000-0000-0000-0000-000000000003'),
  ('d0000000-0000-0000-0000-000000000003', 1, '<h1>TÍTULO DE LEGITIMAÇÃO FUNDIÁRIA</h1><p>Versão inicial.</p>', 'u0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000003', 2, '<h1>TÍTULO DE LEGITIMAÇÃO FUNDIÁRIA</h1><p>Revisão jurídica realizada.</p>', 'u0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000003', 3, '<h1>TÍTULO DE LEGITIMAÇÃO FUNDIÁRIA</h1><p>O presente título confere legitimação fundiária...</p>', 'u0000000-0000-0000-0000-000000000002');

-- ────────────────────────────────────────────────────────────────────────────
-- 9. DOCUMENT_SIGNATURES — Assinaturas do documento Santa Luzia
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO document_signatures (document_id, signer_id, signer_name, signer_role, signer_email, sign_order, status, signature_hash, signed_at, ip_address) VALUES
  (
    'd0000000-0000-0000-0000-000000000003',
    'u0000000-0000-0000-0000-000000000003',
    'Eng. Ana Paula Torres',
    'Engenheiro/Urbanista',
    'ana.tecnico@prefeitura.gov.br',
    1,
    'signed',
    'F8A3C2D1E0B9F7A6',
    '2024-04-28 10:30:00-03',
    '187.45.120.33'
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    'u0000000-0000-0000-0000-000000000002',
    'Dr. Ricardo Silva',
    'Procurador Jurídico',
    'ricardo.juridico@prefeitura.gov.br',
    2,
    'signed',
    'D4E5F6A7B8C9D0E1',
    '2024-04-29 14:15:00-03',
    '187.45.120.45'
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    'u0000000-0000-0000-0000-000000000004',
    'Carlos Eduardo Mendes',
    'Gestor Municipal',
    'carlos.gestor@prefeitura.gov.br',
    3,
    'signed',
    'B2C3D4E5F6A7B8C9',
    '2024-04-30 09:00:00-03',
    '187.45.120.50'
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 10. DOCUMENT_COMMENTS — Comentários de exemplo
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO document_comments (document_id, author_id, author_name, text, resolved) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', 'Dr. Ricardo Silva', 'Verificar se a fundamentação cita corretamente o Art. 12 da Lei 13.465/2017.', false),
  ('d0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000002', 'Dr. Ricardo Silva', 'Relatório precisa incluir a qualificação completa dos beneficiários.', false),
  ('d0000000-0000-0000-0000-000000000003', 'u0000000-0000-0000-0000-000000000004', 'Carlos Eduardo Mendes', 'Documento aprovado e assinado. Encaminhar para registro em cartório.', true);

-- ════════════════════════════════════════════════════════════════════════════
-- FIM DOS SEEDS
-- ════════════════════════════════════════════════════════════════════════════
