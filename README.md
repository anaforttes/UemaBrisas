# RegularizaAI — Plataforma de Regularização Fundiária

Sistema completo para gestão de processos REURB (Regularização Fundiária Urbana), com frontend React e backend Django REST integrado ao PostgreSQL (Neon).

---

## Integrações realizadas

### Autenticação — Keven

- Cadastro e login integrados com o banco via `POST /api/autenticacao/cadastro/` e `/login/`
- Autenticação com JWT (access token + refresh token automático ao expirar)
- Recuperação de senha com e-mail HTML responsivo
- Login exige conta real no banco — sem fallback local

### Processos — Andre

- Listagem, criação, edição e exclusão via `/api/processos/`
- Modal de confirmação antes de excluir, com atualização imediata do painel
- Download de pacote ZIP com metadados + documentos do processo
- Tags de papel ("Criador", "Técnico", "Jurídico", "Colaborador") nos cards
- Datas formatadas como DD/MM/AAAA no grid

### Etapas dos Processos — Andre

- 14 etapas REURB criadas automaticamente ao protocolar um processo
- Fluxo: Abertura → Diagnóstico → Levantamento → Classificação → Buscas Dominiais → Notificação → Estudos Técnicos → Vetorização → Saneamento → Elaboração do PRF → Aprovação → Emissão da CRF → Registro em Cartório → Monitoramento
- Cada etapa registra data de início, data de conclusão, responsável e observações no banco
- Aprovação de etapa pelo drawer atualiza o banco e avança para a próxima automaticamente
- Endpoint idempotente: se o processo já foi protocolado, retorna etapas existentes sem duplicar

### Painel (Dashboard) — Carol 

- Integração completa com `/api/processos/stats/` e `/api/processos/`
- Skeleton screens substituem o spinner — carregamento visualmente suave
- Cache com TTL de 60s: navegação instantânea sem requests desnecessários
- Invalidação automática ao deletar ou protocolar um processo
- Feedback de erro com botão "Tentar novamente" quando o backend não responde

### Chat da Equipe — Andre

- Mensagens salvas no banco de dados, compartilhadas entre todos os membros
- Polling automático a cada 5s — novas mensagens aparecem sem recarregar a página
- Busca incremental: após a carga inicial, só busca mensagens novas (por timestamp)
- Sidebar de membros carregada do banco (usuários reais)

### Documentos — Carol

- Documentos vinculados a processos, armazenados no banco
- ProcessDrawer lista documentos do backend (qualquer membro vê os mesmos docs)
- Criar novo documento abre diretamente no editor TipTap e salva no servidor
- Geração de link de convite para co-edição com papel definido

### Anexos dos Processos — Andre

- Upload de arquivos (PDF, DOC, DOCX, JPG, PNG, ZIP) diretamente para o servidor
- Arquivos servidos via `/media/` — link permanente independente do navegador
- Exclusão remove o arquivo do disco e o registro do banco
- Drag-and-drop e seleção múltipla suportados

### Relatórios — Andre

- Dados reais do banco: processos por modalidade, status e município
- Cache com TTL de 60s e skeleton screen durante carregamento
- Gráfico de barras e distribuição por categoria

### Equipe — Leandro 

- Listagem de membros via banco (`CustomUser`) — sem dados mock
- Status Online/Offline em tempo real via SSE + heartbeat a cada 25s
- Editar nome, salvar permissões e remover colaborador via PATCH/DELETE

### Colaboração em Documentos — Carol

- SSE centralizado em `autenticacao/sse.py` para broadcast em tempo real
- Aceite de convite via `/convite/:code` — adiciona colaborador com papel definido

### Timeline dos Processos — Andre

- Gerada automaticamente a partir dos dados reais: início/conclusão de etapas e criação de documentos
- Ordenada do evento mais recente ao mais antigo, com código de cor por tipo

### Permissões

- `GET /api/permissoes/` retorna roles, flags e ações permitidas
- Botões e menus ocultos conforme permissão (`pode.criarProcesso`, `pode.verMenuAcoes`)

---

## Refatoração (branch `feature/andre`)

### Backend — Camada de Serviço

- `processos/servicos.py` — lógica de negócio extraída de `views.py`
- `documentos/servicos.py` — criar documento, salvar versão, colaboradores, assinaturas, convites
- `autenticacao/sse.py` — SSE centralizado
- Migration `0004`: `technician_id` e `legal_id` convertidos para `ForeignKey(CustomUser)`

### Frontend — Decomposição de Componentes

- `components/editor/EditorToolbar.tsx` — toolbar extraída do Editor (~200 linhas a menos)
- `services/exportService.ts` — exportarPDF e exportarDOCX extraídos do Editor
- `components/dashboard/DeleteProcessModal.tsx` — modal de confirmação extraído
- `hooks/useProcesses.ts` — lógica de fetch, delete, protocolar e download ZIP

### Shared Kernel

- `shared/services/apiClient.ts` — URL da API, token refresh e `request<T>()` centralizados
- `shared/contexts/AuthContext.tsx` — contexto de autenticação
- `shared/utils/date.ts` — helpers de formatação de data

---

## Tecnologias

**Frontend**

- React 18 + TypeScript
- Vite 6
- Tailwind CSS
- React Router DOM (HashRouter)
- TipTap 3 (editor rich text)
- Lucide React

**Backend**

- Python 3.13 + Django 6
- Django REST Framework
- SimpleJWT (autenticação JWT)
- PostgreSQL — Neon (produção) / SQLite (desenvolvimento)
- django-cors-headers

---

## Estrutura do Projeto

```
UemaBrisas/
├── backend/
│   ├── autenticacao/      # Login, cadastro, JWT, SSE, CustomUser
│   ├── processos/         # CRUD processos REURB
│   ├── etapas/            # 14 etapas padrão REURB por processo
│   ├── chat/              # Mensagens da equipe (polling)
│   ├── anexos/            # Upload de arquivos por processo
│   ├── documentos/        # Documentos, versões, assinaturas, convites
│   ├── painel/            # Dashboard e estatísticas
│   ├── equipe/            # Listagem de membros
│   ├── notificacoes/      # Notificações in-app
│   ├── permissoes/        # Controle de acesso
│   └── configuracao/      # Settings, URLs, WSGI
├── components/
│   ├── auth/              # LoginScreen, SignupScreen, ForgotPasswordScreen
│   ├── dashboard/         # Dashboard, ProcessManagement, ProcessDrawer, Reports…
│   ├── editor/            # Editor TipTap + EditorToolbar + extensões
│   └── layout/            # Sidebar
├── hooks/                 # useProcesses, useHeartbeat, usePermissoes…
├── services/              # painelService, chatService, etapasService, anexosService, equipeService…
├── shared/
│   ├── components/        # ErrorBoundary, StatusBadge
│   ├── contexts/          # AuthContext
│   ├── services/          # apiClient (fetch centralizado)
│   └── utils/             # date helpers
├── types/                 # Tipos TypeScript (fonte única)
└── constants/             # Constantes e modelos mock
```

---

## Como Executar

### Backend (Django)

**1. Instalar dependências**

```bash
pip install django djangorestframework djangorestframework-simplejwt \
            django-cors-headers dj-database-url python-dotenv google-auth requests
```

**2. Configurar banco de dados**

Crie `backend/.env`:

```env
DATABASE_URL=postgresql://usuario:senha@host/neondb
GOOGLE_OAUTH2_CLIENT_ID=seu_client_id   # opcional
```

**3. Rodar migrations e subir servidor**

```bash
cd backend
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 8000
```

API disponível em `http://localhost:8000`

---

### Frontend (React + Vite)

```bash
npm install
npm run dev
```

Frontend disponível em `http://localhost:5173`

---

## Endpoints da API

| Método           | Endpoint                                 | Descrição                             | Auth |
| ---------------- | ---------------------------------------- | ------------------------------------- | ---- |
| POST             | `/api/autenticacao/login/`               | Login — retorna JWT                   | Não  |
| POST             | `/api/autenticacao/cadastro/`            | Criar conta                           | Não  |
| POST             | `/api/autenticacao/esqueci-senha/`       | Recuperar senha                       | Não  |
| POST             | `/api/autenticacao/heartbeat/`           | Atualizar status online               | JWT  |
| GET              | `/api/autenticacao/status-stream/`       | SSE de status da equipe               | JWT  |
| GET              | `/api/autenticacao/usuarios/`            | Listar membros                        | JWT  |
| PATCH            | `/api/autenticacao/usuarios/<pk>/`       | Editar membro                         | JWT  |
| DELETE           | `/api/autenticacao/usuarios/<pk>/`       | Remover membro                        | JWT  |
| GET/POST         | `/api/processos/`                        | Listar / criar processos              | JWT  |
| GET/PATCH/DELETE | `/api/processos/<id>/`                   | Detalhe / editar / excluir            | JWT  |
| GET              | `/api/processos/stats/`                  | Estatísticas do painel                | JWT  |
| GET              | `/api/processos/<id>/etapas/`            | Listar etapas do processo             | JWT  |
| POST             | `/api/processos/<id>/etapas/protocolar/` | Protocolar e criar etapas             | JWT  |
| PATCH            | `/api/etapas/<id>/`                      | Atualizar status/observações de etapa | JWT  |
| GET/POST         | `/api/processos/<id>/anexos/`            | Listar / fazer upload de anexos       | JWT  |
| DELETE           | `/api/anexos/<id>/`                      | Remover anexo                         | JWT  |
| GET/POST         | `/api/chat/`                             | Listar mensagens / enviar             | JWT  |
| GET              | `/api/equipe/`                           | Listar membros da equipe              | JWT  |
| GET              | `/api/permissoes/`                       | Permissões do usuário logado          | JWT  |
| GET/POST         | `/api/documentos/`                       | Listar / criar documentos             | JWT  |
| POST             | `/api/documentos/<id>/versao/`           | Salvar versão                         | JWT  |
| POST             | `/api/documentos/<id>/colaboradores/`    | Adicionar colaborador                 | JWT  |
| POST             | `/api/documentos/<id>/convite/`          | Gerar link de convite                 | JWT  |
| GET              | `/api/notificacoes/`                     | Listar notificações                   | JWT  |

**Autenticação:** `Authorization: Bearer <access_token>`

---

## Credenciais de Teste

| Campo | Valor                |
| ----- | -------------------- |
| Email | `admin@reurb.gov.br` |
| Senha | `Admin123!`          |

---

## Funcionalidades

- **Painel:** visão geral com skeleton screen, cache de 60s e feedback de erro com retry
- **Processos:** grid/tabela com filtros, criação, exclusão, protocolo e download ZIP
- **Etapas:** 14 etapas REURB por processo, criadas ao protocolar, com histórico de datas
- **Documentos:** editor rich text TipTap com auto-save, versões e assinatura digital
- **Chat:** mensagens em tempo real compartilhadas entre toda a equipe
- **Anexos:** upload de arquivos por processo, armazenados no servidor
- **Timeline:** histórico automático de eventos por processo (etapas + documentos)
- **Relatórios:** gráficos reais de produtividade, modalidade e status
- **Equipe:** gestão de membros com status online/offline em tempo real
- **Permissões:** controle granular por role
- **Configurações:** tema, fonte e preferências do usuário

---

_Desenvolvido para gestão pública de regularização fundiária municipal — UEMA 2026._
_Equipe: Andre, Carol, Keven, Leandro._
