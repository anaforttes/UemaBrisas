# RegularizaAI — Gestão de Regularização Fundiária (REURB)

Plataforma para equipes municipais conduzirem processos REURB do protocolo à titulação, com editor de documentos colaborativo, trilha de auditoria e consulta pública para cidadãos.

---

## Stack

| Camada   | Tecnologia                                         |
| -------- | -------------------------------------------------- |
| Frontend | React 18 + Vite 6 + TypeScript + Tailwind CSS      |
| Editor   | TipTap 3                                           |
| Backend  | Django 6 + Django REST Framework                   |
| Auth     | JWT via SimpleJWT (access 60 min / refresh 7 dias) |
| Banco    | PostgreSQL — Neon (produção) / SQLite (dev)        |
| Realtime | SSE + heartbeat                                    |

---

## Funcionalidades principais

- **Processos REURB** — protocolo automático, 14 etapas padrão, atribuição de equipe técnica e jurídica
- **Editor de documentos** — TipTap 3 com auto-save, histórico de versões, templates REURB, exportação PDF/DOCX
- **Colaboração** — presença em tempo real, comentários, convite por link com permissões
- **Controle de acesso** — 6 roles (Admin, Gestor, Jurídico, Técnico, Auditor, Atendente) com permissões granulares
- **Trilha de auditoria** — cada ação registrada com usuário e timestamp
- **Consulta pública** — cidadão acompanha o processo pelo protocolo sem precisar de login
- **Dashboard** — gráficos de distribuição por modalidade, status e município
- **Chat da equipe** — mensagens compartilhadas com polling incremental

---

## Como executar

### Backend

```bash
# 1. Instalar dependências
pip install django djangorestframework djangorestframework-simplejwt \
            django-cors-headers dj-database-url python-dotenv google-auth requests

# 2. Criar backend/.env
DATABASE_URL=postgresql://usuario:senha@host/neondb

# 3. Rodar
cd backend
python manage.py migrate
python manage.py runserver 8000
```

### Frontend

```bash
npm install
npm run dev   # http://localhost:5173
```

---

## Estrutura

```
UemaBrisas/
├── backend/
│   ├── autenticacao/   # JWT, SSE, usuários, convites de equipe
│   ├── processos/      # CRUD, etapas, auditoria, consulta pública
│   ├── documentos/     # Documentos, versões, modelos, colaboradores
│   ├── anexos/         # Upload de arquivos por processo e etapa
│   ├── chat/           # Mensagens da equipe
│   ├── painel/         # Dashboard e estatísticas
│   └── configuracao/   # settings.py, urls.py
├── components/
│   ├── auth/           # Login, cadastro, recuperação de senha
│   ├── dashboard/      # Painel, processos, equipe, templates
│   ├── editor/         # Editor TipTap, toolbar, colaboração
│   └── layout/         # Sidebar
├── hooks/
├── services/
└── types/
```

---

## Endpoints principais

```
POST   /api/autenticacao/login/
POST   /api/autenticacao/cadastro/

GET|POST        /api/processos/
GET|PATCH|DELETE /api/processos/<id>/
GET             /api/processos/consulta/<protocolo>/   # público

GET|POST        /api/documentos/
GET|POST        /api/documentos/modelos/

GET  /api/painel/dashboard/
GET  /api/equipe/
GET  /api/permissoes/
```

Toda requisição autenticada exige: `Authorization: Bearer <access_token>`

---

_Desenvolvido para gestão pública de regularização fundiária — Lei Federal 13.465/2017_
