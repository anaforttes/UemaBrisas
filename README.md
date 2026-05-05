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
- Listagem, criação e exclusão de processos integrados com o banco via `GET | POST | DELETE /api/processos/`
- Botão de exclusão com modal de confirmação, comunicando diretamente com o banco Neon
- Refresh automático de token sem logout forçado
- Listagem carrega apenas dados do banco (sem fallback para localStorage)

### Equipe — Leandro
- Listagem de membros integrada com o banco via `GET /api/autenticacao/usuarios/`
- Status Online/Offline em tempo real via SSE (Server-Sent Events) + heartbeat a cada 25s
- Editar nome, salvar permissões e remover colaborador via `PATCH | DELETE /api/autenticacao/usuarios/<pk>/`
- Último acesso atualizado automaticamente no banco

### Permissões — feature/brisa
- `permissoes/servicos.py`: função `obter_permissoes_usuario()` que retorna roles, flags e ações do usuário
- Usa diretamente os campos `CustomUser.role`, `access_flags` e `permissions_data` (sem model extra)

---

## Tecnologias

**Frontend**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router DOM
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
├── backend/               # API Django
│   ├── autenticacao/      # Login, cadastro, JWT, OAuth2 Google
│   ├── processos/         # CRUD de processos REURB
│   ├── painel/            # Dados do dashboard
│   ├── equipe/            # Gestão de usuários/equipe
│   ├── permissoes/        # Controle de acesso
│   └── configuracao/      # Settings, URLs, WSGI
├── components/            # Componentes React
├── services/              # Serviços (API, banco local)
├── types/                 # Tipos TypeScript
├── hooks/                 # Hooks React
└── uema-2026/             # Versão estendida do frontend
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
# SQLite (padrão para desenvolvimento — não precisa configurar)
# DATABASE_URL=sqlite:///db.sqlite3

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
| GET | `/api/processos/` | Listar processos | JWT |
| POST | `/api/processos/` | Criar processo | JWT |
| GET | `/api/processos/<id>/` | Detalhe do processo | JWT |
| PATCH | `/api/processos/<id>/` | Atualizar processo | JWT |
| DELETE | `/api/processos/<id>/` | Excluir processo | JWT |
| GET | `/api/processos/stats/` | Estatísticas do painel | JWT |

**Autenticação:** Bearer Token no header `Authorization: Bearer <access_token>`

---

## Credenciais de Teste

| Campo | Valor |
|-------|-------|
| Email | `admin@reurb.gov.br` |
| Senha | `Admin123!` |

> **Atenção:** o login exige conta cadastrada no banco Django. Usuários criados antes da integração (apenas no localStorage) precisam ser recriados via cadastro ou pelo admin do Django.

---

## Funcionalidades

- **Painel:** visão geral de processos ativos, em revisão e concluídos
- **Processos:** Central de Processos com listagem, filtros, criação e exclusão integradas ao banco
- **Modelos:** biblioteca de documentos REURB (Portaria, Notificação, Relatório, etc.)
- **Relatórios:** gráficos de produtividade, modalidade e status
- **Equipe:** gestão de membros com status online/offline em tempo real e controle de permissões
- **Configurações:** tema, fonte, acessibilidade

---

*Desenvolvido para gestão pública de regularização fundiária municipal.*
