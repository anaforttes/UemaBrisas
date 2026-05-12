# RegularizaAI — Plataforma de Regularização Fundiária

Sistema completo para gestão de processos REURB (Regularização Fundiária Urbana), com frontend React e backend Django REST.

---

## Integrações realizadas

### Login e Autenticação — Keven
- Cadastro e login integrados com o banco de dados (Neon PostgreSQL) via `POST /api/autenticacao/cadastro/` e `/login/`
- Autenticação com JWT (access token + refresh token automático ao expirar)
- Recuperação de senha funcional com e-mail HTML responsivo e estilizado
- Login exige conta real no banco — sem fallback para autenticação local

### Processos — Andre
- Listagem, criação, edição e exclusão de processos integradas com o banco via `/api/processos/`
- Modal de confirmação antes de excluir, com atualização imediata do painel
- Protocolar processo muda status para "Em Andamento" via PATCH
- Download de pacote ZIP com metadados + documentos do processo
- Tags de papel ("Criador", "Técnico", "Jurídico", "Colaborador") nos cards da Central de Processos
- Datas formatadas como DD/MM/AAAA no grid de processos

### Painel (Dashboard) — Carol / Andre
- Integração completa com `/api/processos/stats/` e `/api/processos/`
- Cache inteligente com TTL de 30s — sem spinner em toda navegação, dados frescos em background
- Invalidação automática de cache ao deletar ou protocolar um processo
- Processos recentes ordenados por `updated_at`

### Equipe — Leandro
- Listagem de membros integrada com o banco via `GET /api/autenticacao/usuarios/`
- Status Online/Offline em tempo real via SSE (Server-Sent Events) + heartbeat a cada 25s
- Editar nome, salvar permissões e remover colaborador via `PATCH | DELETE /api/autenticacao/usuarios/<pk>/`
- Último acesso atualizado automaticamente no banco

### Colaboração em Documentos — Carol
- Geração de link de convite para co-edição de documentos
- Aceite de convite via `/convite/:code` — adiciona colaborador com papel definido
- SSE centralizado em `autenticacao/sse.py` para broadcast de status em tempo real

### Permissões
- `GET /api/permissoes/` retorna roles, flags e ações permitidas para o usuário autenticado
- Botões e menus ocultados no frontend conforme permissão (`pode.criarProcesso`, `pode.verMenuAcoes`)
- FKs de responsável técnico e jurídico nos processos apontam para `CustomUser` (integridade referencial)

---

## Refatoração (branch `feature/andre`)

### Backend — Camada de Serviço
- `processos/servicos.py` — lógica de negócio extraída de `views.py`
- `documentos/servicos.py` — criar documento, salvar versão, colaboradores, assinaturas, convites
- `autenticacao/sse.py` — SSE centralizado (views não importam mais de views)
- `processos/constantes.py` — listas de status compartilhadas
- Migration `0004`: `technician_id` e `legal_id` convertidos de `IntegerField` para `ForeignKey(CustomUser)`
- `autenticacao/serializers.py` removido — classes consolidadas em `serializadores.py`

### Frontend — Decomposição de Componentes
- `components/editor/EditorToolbar.tsx` — toolbar extraída do Editor (redução de ~200 linhas)
- `components/editor/extensions/FontSize.ts` — extensão TipTap extraída
- `services/exportService.ts` — `exportarPDF` e `exportarDOCX` extraídos do Editor
- `components/dashboard/DeleteProcessModal.tsx` — modal de confirmação extraído
- `hooks/useProcesses.ts` — lógica de fetch, delete, protocolar e download ZIP
- `shared/components/ErrorBoundary.tsx` — captura erros de renderização no Editor
- `shared/components/StatusBadge.tsx` — badge de status reutilizável
- `hooks/useGeolocalizacao.ts` — movido de `components/editor/components/`

### Shared Kernel
- `shared/services/apiClient.ts` — URL da API, token refresh, `request<T>()` centralizados
- `shared/contexts/AuthContext.tsx` — contexto de autenticação (elimina prop drilling)
- `shared/utils/date.ts` — helpers de formatação de data
- `types/index.ts` e `constants/index.tsx` — fontes únicas de tipos e constantes

### Organização
- Removidos arquivos órfãos: `components/AuthScreens.tsx`, `components/Editor.tsx`, `scratch/`
- Barrel exports em `hooks/index.ts` e `shared/components/index.ts`
- Aliases de path no Vite e tsconfig (`@/`, `@shared/`, `@features/`)

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
│   ├── processos/         # CRUD processos REURB + permissoes + constantes
│   ├── documentos/        # Documentos, versões, assinaturas, convites
│   ├── painel/            # Dashboard e estatísticas
│   ├── equipe/            # Gestão de membros
│   ├── permissoes/        # Controle de acesso
│   └── configuracao/      # Settings, URLs, WSGI
├── components/
│   ├── auth/              # LoginScreen, SignupScreen, ForgotPasswordScreen
│   ├── dashboard/         # Dashboard, ProcessManagement, Templates, Equipe…
│   ├── editor/            # Editor TipTap + EditorToolbar + extensões
│   └── layout/            # Sidebar
├── hooks/                 # useProcesses, useHeartbeat, usePermissoes, useGeolocalizacao…
├── services/              # painelService, databaseService, exportService…
├── shared/
│   ├── components/        # ErrorBoundary, StatusBadge
│   ├── contexts/          # AuthContext
│   ├── services/          # apiClient (fetch centralizado)
│   └── utils/             # date helpers
├── types/                 # Tipos TypeScript (fonte única)
└── constants/             # Constantes e modelos mock (fonte única)
```

---

## Como Executar

### Backend (Django)

**1. Instalar dependências Python**
```bash
pip install django djangorestframework djangorestframework-simplejwt \
            django-cors-headers dj-database-url python-dotenv google-auth requests
```

**2. Configurar banco de dados**

Crie um arquivo `.env` dentro de `backend/`:
```env
# PostgreSQL (produção — Neon)
DATABASE_URL=postgresql://usuario:senha@host/neondb

# Google OAuth2 (opcional)
GOOGLE_OAUTH2_CLIENT_ID=seu_client_id

# E-mail (opcional — sem isso, e-mails aparecem no terminal)
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
```

**3. Rodar migrations**
```bash
cd backend
python manage.py migrate
```

**4. Criar superusuário**
```bash
python manage.py createsuperuser
```

**5. Iniciar servidor**
```bash
python manage.py runserver 8000
```

API disponível em `http://localhost:8000`

---

### Frontend (React + Vite)

**1. Instalar dependências**
```bash
npm install
```

**2. Variáveis de ambiente (opcional)**

Crie `.env` na raiz:
```env
VITE_API_URL=http://localhost:8000
```

**3. Iniciar servidor de desenvolvimento**
```bash
npm run dev
```

Frontend disponível em `http://localhost:5173`

---

## Endpoints da API

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/api/autenticacao/login/` | Login — retorna JWT | Não |
| POST | `/api/autenticacao/cadastro/` | Criar conta | Não |
| POST | `/api/autenticacao/esqueci-senha/` | Recuperar senha | Não |
| POST | `/api/autenticacao/heartbeat/` | Atualizar status online | JWT |
| GET | `/api/autenticacao/status-stream/` | Stream SSE de status | JWT |
| GET | `/api/autenticacao/usuarios/` | Listar membros da equipe | JWT |
| PATCH | `/api/autenticacao/usuarios/<pk>/` | Editar membro | JWT |
| DELETE | `/api/autenticacao/usuarios/<pk>/` | Remover membro | JWT |
| GET | `/api/processos/` | Listar processos (paginado) | JWT |
| POST | `/api/processos/` | Criar processo | JWT |
| GET | `/api/processos/<id>/` | Detalhe do processo | JWT |
| PATCH | `/api/processos/<id>/` | Atualizar processo | JWT |
| DELETE | `/api/processos/<id>/` | Excluir processo | JWT |
| GET | `/api/processos/meus/` | Processos do usuário logado | JWT |
| GET | `/api/processos/stats/` | Estatísticas do painel | JWT |
| GET | `/api/permissoes/` | Permissões do usuário | JWT |
| GET | `/api/documentos/` | Listar documentos | JWT |
| POST | `/api/documentos/` | Criar documento | JWT |
| POST | `/api/documentos/<id>/versao/` | Salvar versão | JWT |
| POST | `/api/documentos/<id>/colaboradores/` | Adicionar colaborador | JWT |
| POST | `/api/documentos/<id>/convite/` | Gerar link de convite | JWT |
| GET/POST | `/api/documentos/convite/<codigo>/` | Aceitar convite | JWT |

**Autenticação:** Bearer Token no header `Authorization: Bearer <access_token>`

---

## Credenciais de Teste

| Campo | Valor |
|-------|-------|
| Email | `admin@reurb.gov.br` |
| Senha | `Admin123!` |

---

## Funcionalidades

- **Painel:** visão geral de processos ativos, em revisão e concluídos com cache inteligente
- **Processos:** Central de Processos com grid/tabela, filtros, criação, exclusão e protocolo; tags de papel do usuário em cada card
- **Modelos:** biblioteca de documentos REURB (Portaria, Notificação, Relatório, Demarcação, Título)
- **Editor:** editor rich text TipTap com auto-save, histórico de versões, comentários e assinatura digital
- **Colaboração:** convite por link para co-edição de documentos com papéis definidos
- **Relatórios:** gráficos de produtividade, modalidade e status
- **Equipe:** gestão de membros com status online/offline em tempo real
- **Permissões:** controle granular por role — menus e ações ocultos conforme perfil do usuário
- **Configurações:** tema, fonte, acessibilidade

---

*Desenvolvido para gestão pública de regularização fundiária municipal — UEMA 2026.*
