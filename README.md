# RegularizaAI — Gestão de Regularização Fundiária (REURB)

Plataforma para equipes municipais conduzirem processos de Regularização Fundiária Urbana (REURB)
do protocolo à titulação, com editor de documentos colaborativo, assinatura digital, trilha de
auditoria e consulta pública para o cidadão.

> Conformidade: Lei Federal nº 13.465/2017 e Decreto nº 9.310/2018.

---

## Índice

- [Visão geral](#visão-geral)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts disponíveis](#scripts-disponíveis)
- [Modelo de dados físico](#modelo-de-dados-físico)
- [API — endpoints principais](#api--endpoints-principais)
- [Perfis de acesso](#perfis-de-acesso)
- [Estrutura de diretórios](#estrutura-de-diretórios)
- [Testes](#testes)
- [Equipe](#equipe)

---

## Visão geral

- **Processos REURB** — protocolo automático (`NNNN-AAAA`), 14 etapas padrão por eixo, atribuição de
  equipe técnica e jurídica com convites.
- **Editor de documentos** — TipTap 3 com auto-save, controle de versões, presença em tempo real,
  comentários/sugestões, templates e exportação PDF/DOCX.
- **Assinatura digital** — fluxo de assinatura interna com protocolo, hash e verificação por QR Code.
- **Controle de acesso** — níveis de acesso e permissões granulares por módulo, com escopo
  (global/município/setor) e auditoria administrativa.
- **Trilha de auditoria** — cada ação registrada com usuário, tipo e timestamp.
- **Consulta pública** — cidadão acompanha o andamento pelo número de protocolo, sem login.
- **Dashboard e chat** — indicadores por modalidade/status/município e chat da equipe.

---

## Stack

| Camada     | Tecnologia                                         |
| ---------- | -------------------------------------------------- |
| Frontend   | React 18 + Vite 6 + TypeScript + Tailwind CSS      |
| Editor     | TipTap 3                                           |
| Backend    | Django 6 + Django REST Framework 3.16              |
| Auth       | JWT via SimpleJWT (access 60 min / refresh 7 dias) |
| Banco      | PostgreSQL — Neon (produção) / SQLite (dev/testes) |
| Realtime   | Server-Sent Events (SSE) + heartbeat               |
| Assinatura | `node-forge` (frontend) + protocolo/hash (backend) |

---

## Arquitetura

```
┌────────────────────┐        HTTPS / JWT        ┌────────────────────────┐
│  SPA (React/Vite)  │  ───────────────────────► │  Django REST Framework │
│  TipTap · Tailwind │  ◄─── SSE (status/chat)   │  apps por domínio      │
└────────────────────┘                           └───────────┬────────────┘
                                                             │
                                                     ┌───────▼────────┐
                                                     │  PostgreSQL     │
                                                     │  (Neon / SQLite)│
                                                     └────────────────┘
```

O backend segue separação por camadas em cada app: `views.py` (HTTP), `serializadores.py`
(validação), `servicos.py` (regra de negócio), `permissoes.py` (acesso), `models.py` (persistência).

---

## Pré-requisitos

| Ferramenta | Versão mínima | Testado com |
| ---------- | ------------- | ----------- |
| Node.js    | 18            | 22.19       |
| npm        | 9             | —           |
| Python     | 3.11          | 3.13        |
| PostgreSQL | 14 (produção) | Neon        |

---

## Instalação

### 1. Clonar o repositório

```bash
git clone https://github.com/anaforttes/UemaBrisas.git
cd UemaBrisas
```

### 2. Backend (Django)

```bash
cd backend

# Ambiente virtual
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate

# Dependências
pip install -r requirements.txt

# Variáveis de ambiente (ver seção abaixo)
#   crie backend/.env com DATABASE_URL

# Banco
python manage.py migrate
python manage.py createsuperuser   # opcional

# Servir em http://localhost:8000
python manage.py runserver 8000
```

> Sem `DATABASE_URL`, os testes usam SQLite em memória automaticamente.

### 3. Frontend (React/Vite)

```bash
# Na raiz do projeto
npm install

# Variáveis de ambiente (ver seção abaixo)
#   crie .env com VITE_API_URL

npm run dev   # http://localhost:5173
```

### 4. Rodar tudo de uma vez

```bash
npm start     # sobe backend + frontend em paralelo (concurrently)
```

**Acesso padrão de desenvolvimento:** `admin@reurb.gov.br` / `Admin123!`

---

## Variáveis de ambiente

### Backend — `backend/.env`

| Variável       | Obrigatória | Descrição                                         |
| -------------- | ----------- | ------------------------------------------------- |
| `DATABASE_URL` | Sim¹        | String de conexão PostgreSQL (`postgresql://...`) |

¹ Ausente → fallback para SQLite em memória (uso em testes).

### Frontend — `.env` (raiz)

| Variável                | Obrigatória | Descrição                                      |
| ----------------------- | ----------- | ---------------------------------------------- |
| `VITE_API_URL`          | Sim         | URL base da API (ex.: `http://localhost:8000`) |
| `VITE_GOOGLE_CLIENT_ID` | Não         | Client ID para login com Google                |
| `VITE_FRONTEND_URL`     | Não         | URL pública do frontend (links de convite)     |

> Nunca versionar `.env` ou credenciais.

---

## Scripts disponíveis

| Comando            | Ação                                    |
| ------------------ | --------------------------------------- |
| `npm run dev`      | Frontend em modo desenvolvimento (Vite) |
| `npm run backend`  | Backend Django na porta 8000            |
| `npm start`        | Backend + frontend em paralelo          |
| `npm run build`    | Type-check + build de produção          |
| `npm run preview`  | Serve o build de produção               |
| `npm run lint`     | ESLint (0 warnings tolerados)           |
| `npm run lint:fix` | ESLint com correção automática          |
| `npm run format`   | Prettier                                |

---

## Modelo de dados físico

PostgreSQL. Tabelas nomeadas por padrão do Django (`<app>_<model>`), exceto o módulo
`controleadmin`, que define `db_table` explícito. PKs são `BIGINT` autoincremento, salvo onde
indicado `UUID`.

### Diagrama de relacionamentos (visão macro)

```
                         ┌──────────────────────────┐
                         │  autenticacao_customuser │  (AUTH_USER_MODEL)
                         └────────────┬─────────────┘
        ┌─────────────────────────────┼──────────────────────────────┐
        │                             │                              │
┌───────▼────────┐          ┌─────────▼─────────┐          ┌─────────▼──────────┐
│processos_      │  1     N │ etapas_etapa      │          │ controleadmin_     │
│processo        ├──────────┤                   │          │ perfil_acesso_     │
│                │          └───────────────────┘          │ usuario (1:1)      │
│                │  1     N ┌───────────────────┐          └─────────┬──────────┘
│                ├──────────┤ anexos_anexo      │            N│      │N
│                │          └───────────────────┘   ┌─────────▼──┐ ┌─▼──────────────┐
│                │  1     N ┌───────────────────┐   │controleadmin│ │controleadmin_  │
│                ├──────────┤ processos_evento  │   │_nivel_acesso│ │usuario_perm_   │
│                │          └───────────────────┘   └──────┬──────┘ │extra           │
│                │  1     N ┌───────────────────┐          │N       └────────────────┘
│                ├──────────┤ processos_convite │          │
│                │          │ atribuicao        │   ┌──────▼───────────────┐
└────────────────┘          └─────────┬─────────┘   │controleadmin_        │
                                      │ N:1         │permissao_sistema     │
                            ┌─────────▼─────────┐   └──────────────────────┘
                            │ notificacoes_     │
                            │ notificacao       │
                            └───────────────────┘

┌────────────────────┐  1   N ┌───────────────────────────┐
│ documentos_        ├────────┤ documentos_versaodocumento │
│ documento (UUID)   │        ├───────────────────────────┤
│                    ├────────┤ documentos_comentario (UUID)│
│                    ├────────┤ documentos_assinatura      │
│                    ├────────┤ documentos_colaborador     │
│                    ├────────┤ documentos_convite         │
│                    ├────────┤ documentos_auditoria (UUID) │
│                    ├────────┤ documentos_presenca        │
└────────────────────┘        └───────────────────────────┘
   (referencia processos_processo por processo_id textual)
```

### Módulo `autenticacao`

**`autenticacao_customuser`** — usuário do sistema (email como login).

| Coluna            | Tipo         | Notas                                           |
| ----------------- | ------------ | ----------------------------------------------- |
| `id`              | bigint PK    |                                                 |
| `email`           | varchar(254) | único, `USERNAME_FIELD`                         |
| `name`            | varchar(255) |                                                 |
| `role`            | varchar(100) | Admin/Gestor/Jurídico/Técnico/Auditor/Atendente |
| `avatar`          | text         | base64/URL                                      |
| `name_changed_at` | timestamptz  | nulo                                            |
| `last_access`     | timestamptz  | base do status online (< 35s)                   |
| `is_active`       | bool         |                                                 |
| `is_staff`        | bool         |                                                 |
| `created_at`      | timestamptz  | auto                                            |
| `updated_at`      | timestamptz  | auto                                            |

**`autenticacao_perfiltemplate`** — `usuario` FK, `nome_perfil`, `dados` (JSON), timestamps.
**`autenticacao_conviteequipe`** — `token` único, `permissao` (visualizar/editar), `criado_por` FK,
`expira_em`, `usado`.

### Módulo `processos`

**`processos_processo`** — processo REURB.

| Coluna             | Tipo         | Notas                             |
| ------------------ | ------------ | --------------------------------- |
| `id`               | bigint PK    |                                   |
| `protocol`         | varchar(20)  | único, gerado `NNNN-AAAA`         |
| `protocolado`      | bool         |                                   |
| `title`            | varchar(255) |                                   |
| `applicant`        | varchar(255) | requerente                        |
| `modality`         | varchar(20)  | REURB-S / REURB-E                 |
| `status`           | varchar(50)  | Pendente … Arquivado (13 estados) |
| `progress`         | int          | 0–100                             |
| `location`         | varchar(255) |                                   |
| `municipio`        | varchar(100) |                                   |
| `estado`           | varchar(10)  |                                   |
| `area`             | varchar(100) |                                   |
| `responsible_name` | varchar(255) |                                   |
| `technician_id`    | FK → user    | `on_delete=SET NULL`              |
| `legal_id`         | FK → user    | `on_delete=SET NULL`              |
| `criado_por`       | FK → user    | `on_delete=SET NULL`              |
| `created_at`       | timestamptz  | auto                              |
| `updated_at`       | timestamptz  | auto                              |

**`processos_eventoprocesso`** — trilha de eventos: `processo` FK, `tipo` (7 tipos), `descricao`,
`usuario` FK, `dados` (JSON), `criado_em`.
**`processos_conviteatribuicao`** — convite para papel técnico/jurídico: `processo` FK, `papel`,
`convidado` FK, `solicitado_por` FK, `status` (pendente/aceito/recusado/cancelado), `respondido_em`.

### Módulo `etapas`

**`etapas_etapa`** — `processo` FK, `numero`, `nome`, `eixo`, `status`, `responsavel` FK,
`observacoes`, `data_inicio`, `data_conclusao`, `prazo`, `depende_de` (JSON).
Restrição: `UNIQUE (processo, numero)`.

### Módulo `anexos`

**`anexos_anexo`** — `processo` FK, `nome`, `tipo`, `tamanho`, `arquivo` (upload `anexos/AAAA/MM/`),
`adicionado_por` FK, `etapa_numero`, `adicionado_em`.

### Módulo `documentos`

**`documentos_documento`** (PK `UUID`) — `doc_ref` (indexado), `titulo`, `conteudo`, `cabecalho`,
`rodape`, `processo_id` (texto, referência lógica a processo), `criado_por` FK, `status`
(Draft/Review/Approved/Signed/Finalizado), `versao_atual`, timestamps.

| Tabela                            | PK     | Relacionamento / campos-chave                                                                                                                                  |
| --------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `documentos_colaboradordocumento` | bigint | `documento` FK, `usuario` FK, `papel`; `UNIQUE(documento, usuario)`                                                                                            |
| `documentos_comentariodocumento`  | UUID   | `documento` FK, `autor` FK, `texto`, `tipo`, `status`, `pos_inicio/fim`                                                                                        |
| `documentos_versaodocumento`      | bigint | `documento` FK, `numero`, `conteudo`, `autor` FK; `UNIQUE(documento, numero)`                                                                                  |
| `documentos_assinaturadocumento`  | bigint | `documento` FK, `usuario` FK, `status`, `ordem`, `protocolo`, `hash_assinatura`, `cpf_certificado`, `ac_emissora`, `assinado_em`; `UNIQUE(documento, usuario)` |
| `documentos_convitedocumento`     | bigint | `documento` FK, `codigo` UUID único, `papel`, `expira_em`, `usos/max_usos`                                                                                     |
| `documentos_auditoriadocumento`   | UUID   | `documento` FK, `tipo`, `usuario` FK, `versao`; índice `(documento, -criado_em)`                                                                               |
| `documentos_modelodocumento`      | UUID   | `nome`, `tipo`, `versao`, `conteudo`, `campos` (JSON), `is_sistema`                                                                                            |
| `documentos_presencadocumento`    | bigint | `documento` FK, `usuario` FK, `ultimo_acesso`, `cursor_pos`; `UNIQUE(documento, usuario)`                                                                      |

### Módulo `chat`

**`chat_mensagemchat`** — `usuario` FK, `texto`, `criado_em` (indexado).

### Módulo `notificacoes`

**`notificacoes_notificacao`** — `usuario` FK, `tipo` (6 tipos), `titulo`, `descricao`, `lida`,
`link`, `convite` FK → `processos_conviteatribuicao` (nulo), `criado_em`.

### Módulo `controleadmin` (RBAC)

Controle de permissões: `PerfilAcessoUsuario → NivelAcesso → PermissaoSistema`, com exceções por
usuário.

| Tabela (`db_table`)                      | Descrição                                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `controleadmin_nivel_acesso`             | `codigo` único, `nome`, `descricao`, `ativo`                                                                |
| `controleadmin_permissao_sistema`        | `codigo` único, `nome`, `modulo`, `ativo`                                                                   |
| `controleadmin_nivel_acesso_permissao`   | vínculo N:N nível↔permissão; `UNIQUE(nivel_acesso, permissao)`                                              |
| `controleadmin_perfil_acesso_usuario`    | 1:1 com usuário; `nivel_acesso` FK, `status_acesso`, `escopo_tipo`, `municipio`, `setor`, `aprovado_por/em` |
| `controleadmin_usuario_permissao_extra`  | exceções por usuário; `permitido` bool, `origem`; `UNIQUE(perfil, permissao)`                               |
| `controleadmin_auditoria_administrativa` | `usuario_alvo` FK, `administrador` FK, `acao`, `detalhes` (JSON), `ip`                                      |

---

## API — endpoints principais

Base autenticada: header `Authorization: Bearer <access_token>`.

```
POST   /api/autenticacao/login/
POST   /api/autenticacao/cadastro/
GET    /api/autenticacao/refresh/

GET|POST         /api/processos/
GET|PATCH|DELETE  /api/processos/<id>/
GET              /api/processos/consulta/<protocolo>/   # público (sem login)

GET|POST          /api/documentos/
GET|POST          /api/documentos/modelos/

GET  /api/painel/dashboard/
GET  /api/equipe/
GET  /api/permissoes/
```

---

## Perfis de acesso

| Papel     | Escopo típico                                 |
| --------- | --------------------------------------------- |
| Admin     | Acesso total, gestão de usuários e permissões |
| Gestor    | Gestão de processos e equipe                  |
| Jurídico  | Análise jurídica, editais, documentos         |
| Técnico   | Levantamento técnico, etapas de campo         |
| Auditor   | Leitura ampla + trilha de auditoria           |
| Atendente | Protocolo e atendimento ao cidadão            |

Permissões efetivas são resolvidas via `controleadmin` (nível de acesso + exceções por usuário),
não pelo campo `role` isoladamente.

---

## Estrutura de diretórios

```
UemaBrisas/
├── backend/
│   ├── autenticacao/    # JWT, SSE, usuários, convites de equipe
│   ├── processos/       # CRUD, eventos, convites de atribuição, consulta pública
│   ├── etapas/          # 14 etapas por processo, dependências e prazos
│   ├── documentos/      # documentos, versões, comentários, assinaturas, modelos, presença
│   ├── anexos/          # upload de arquivos por processo/etapa
│   ├── chat/            # mensagens da equipe
│   ├── notificacoes/    # notificações por usuário
│   ├── controleadmin/   # RBAC: níveis, permissões, auditoria administrativa
│   ├── painel/          # dashboard e estatísticas
│   └── configuracao/    # settings.py, urls.py, wsgi.py
├── components/
│   ├── auth/            # login, cadastro, recuperação, verificação de assinatura
│   ├── dashboard/       # painel, processos, equipe, templates, relatórios
│   ├── editor/          # editor TipTap, toolbar, colaboração, assinatura
│   └── layout/          # sidebar
├── hooks/               # useProcesses, usePresenca, useStatusStream, useGeolocalizacao…
├── services/            # camada de acesso à API (painel, documentos, assinatura…)
├── shared/              # contexts, apiClient, componentes e utils compartilhados
├── types/               # tipos TypeScript de domínio
└── styles/              # CSS global / Tailwind
```

---

## Testes

```bash
# Backend (Django) — usa SQLite em memória
cd backend
python manage.py test
```

---

## Equipe

Andre · Carol · Keven · Leandro

---

_Desenvolvido para a gestão pública de regularização fundiária urbana — Lei Federal 13.465/2017._
