# AGENTS.md — UemaBrisas / ReUrb Doc Flow

> Instruções para agentes de IA (Claude Code, Codex, Gemini CLI, Copilot, etc.)

## Visão geral do projeto

Sistema de gestão documental para regularização fundiária urbana (REURB).
Equipe: Andre, Carol, Keven, Leandro.

## Stack

| Camada   | Tecnologia                         |
| -------- | ---------------------------------- |
| Frontend | React 18 + Vite + TypeScript       |
| Editor   | TipTap 3                           |
| Backend  | Django + Django REST Framework     |
| Auth     | JWT via `rest_framework_simplejwt` |
| Banco    | Neon PostgreSQL (`DATABASE_URL`)   |

## Regras obrigatórias

### Arquitetura backend

- `views.py` — apenas lógica HTTP, zero regra de negócio
- `serializadores.py` — validação de entrada
- `servicos.py` — toda regra de negócio fica aqui
- `permissoes.py` — controle de acesso
- Nunca criar migrations manualmente: sempre `python manage.py makemigrations`

### Frontend

- Nunca chamar a API diretamente nos componentes — usar os services em `services/`
- Nunca ler `localStorage` diretamente nos componentes — usar `shared/services/apiClient`
- Componentes ficam em `components/`, hooks em `hooks/`, serviços em `services/`

### Código geral

- Sem comentários óbvios — só comentar o "por quê" quando não for evidente
- Sem abstrações prematuras — 3 linhas repetidas não justificam helper
- Sem tratamento de erros para cenários impossíveis
- Não commitar `.env` ou credenciais

## Como rodar

```bash
# Backend
cd backend && python manage.py runserver 8000

# Frontend
npm run dev

# Ambos juntos
npm run start
```

## Endpoints principais

```
POST   /api/autenticacao/login/
POST   /api/autenticacao/cadastro/
GET|POST        /api/processos/
GET|PUT|DELETE  /api/processos/<id>/
GET|POST        /api/documentos/
POST            /api/documentos/<id>/salvar/
GET             /api/documentos/<id>/versoes/
POST            /api/documentos/<id>/comentarios/
POST            /api/documentos/<id>/presenca/
```

Toda requisição autenticada exige: `Authorization: Bearer <token>`

## Linting / formatação

```bash
npm run lint        # ESLint
npm run format      # Prettier
npm run type-check  # TypeScript
```

O pre-commit hook (Husky) roda lint + format automaticamente.
