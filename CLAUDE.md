# CLAUDE.md — UemaBrisas / ReUrb Doc Flow

## Projeto

Sistema de gestão documental para regularização fundiária urbana (REURB).
Equipe: Andre, Carol, Keven, Leandro.

---

## Stack

| Camada         | Tecnologia                                 |
| -------------- | ------------------------------------------ |
| Frontend       | React 18 + Vite + TypeScript               |
| Editor         | TipTap 3                                   |
| Backend        | Django + Django REST Framework             |
| Auth           | JWT via `rest_framework_simplejwt`         |
| Banco          | Neon PostgreSQL (`DATABASE_URL` no `.env`) |
| Fallback banco | SQLite local (`backend/db.sqlite3`)        |

---

## Rodar o projeto

```bash
# Backend
cd backend && python manage.py runserver 8000

# Frontend
npm run dev   # sobe em http://localhost:517x (porta varia)
```

- Frontend: `http://localhost:5178` (porta pode variar entre 5173–5180)
- Backend: `http://localhost:8000`
- Admin: `admin@reurb.gov.br` / `Admin123!`

---

## Estrutura do backend

```
backend/
  autenticacao/   # login, cadastro, JWT, CustomUser
  processos/      # CRUD de processos REURB
  painel/         # dashboard, estatísticas
  equipe/         # gestão de membros
  permissoes/     # controle de acesso
  documentos/     # (app em desenvolvimento)
  configuracao/   # settings.py, urls.py, wsgi.py
```

**Padrão obrigatório por módulo:**

- `views.py` — apenas lógica HTTP, sem regra de negócio
- `serializadores.py` — validação de entrada
- `servicos.py` — regras de negócio
- `permissoes.py` — controle de acesso
- `models.py` + migrations — alterações de banco

---

## Endpoints principais

```
POST   /api/autenticacao/login/
POST   /api/autenticacao/cadastro/
GET    /api/autenticacao/refresh/

GET|POST        /api/processos/
GET|PUT|DELETE  /api/processos/<id>/

GET  /api/painel/
GET  /api/equipe/
GET  /api/permissoes/
```

Toda requisição autenticada exige header: `Authorization: Bearer <token>`

---

## Estrutura do frontend

```
components/
  auth/         # LoginScreen, SignupScreen, ForgotPasswordScreen
  dashboard/    # Dashboard, ProcessManagement, ProcessTable, Team, Reports…
  editor/       # Editor TipTap, PainelComentarios, PainelColaboradores, SignatureModal…
  layout/       # Sidebar
  common/       # Logo

hooks/
  useHeartbeat.ts       # mantém sessão ativa
  usePermissoes.ts      # verifica permissões do usuário
  useStatusStream.ts    # streaming de status

services/
  painelService.ts      # chamadas ao /api/painel/ e /api/processos/
  databaseService.ts    # abstração de banco local
```

---

## Configurações relevantes

- CORS liberado para `localhost:5173–5180`
- JWT: access token 60 min, refresh 7 dias, rotate + blacklist ativados
- Throttle: login 10/min, cadastro 5/min
- Paginação padrão: 20 itens/página
- Idioma: `pt-br`, fuso: `America/Sao_Paulo`
- E-mail em dev: imprime no terminal (sem SMTP)

---

## Ferramentas instaladas

- **OpenSpec** — specs de features persistidas no repo. Usar `/opsx:propose` antes de implementar features novas.
- **DSPy 3.2.1** — otimização de pipelines de IA. Configurar com `dspy.LM("anthropic/claude-sonnet-4-6")`.

---

## O que NÃO fazer

- Não colocar regra de negócio em `views.py`
- Não fazer chamadas diretas ao banco no frontend — usar os services
- Não commitar `.env` ou credenciais
- Não criar migrations manualmente — sempre via `python manage.py makemigrations`
- Não adicionar lógica ao CLAUDE.md que já esteja no código
