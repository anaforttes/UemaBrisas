# RegularizaAI — Plataforma de Regularização Fundiária

Sistema de gestão de processos REURB (Regularização Fundiária Urbana). Permite que equipes municipais conduzam processos do protocolo à titulação, com controle de etapas, documentos, arquivos e trilha de auditoria. Cidadãos podem acompanhar o andamento do seu processo via consulta pública sem precisar de conta.

---

## Funcionalidades

### Autenticação e Controle de Acesso

- Login e cadastro com JWT (access token de 60 min + refresh de 7 dias com rotação automática)
- Login com Google (OAuth2 / GSI)
- Recuperação de senha com e-mail HTML
- Roles: Admin, Gestor, Jurídico, Técnico, Auditor, Atendente
- Flags de acesso: `superusuario`, `adminMunicipio`, `profissionalInterno`, `usuarioExterno`
- Permissões granulares por role — botões e menus ocultados conforme acesso
- Status Online/Offline em tempo real via SSE + heartbeat a cada 25 s

### Processos REURB

- Criação de processos com número de protocolo automático no formato `NNNN-YYYY`
- Modalidades REURB-S e REURB-E
- Filtros por status e busca por requerente, núcleo ou protocolo
- Grid e tabela com papéis do usuário logado por processo (Criador, Técnico, Jurídico, Colaborador)
- Download de pacote ZIP com metadados e documentos do processo
- Cada usuário vê apenas os processos nos quais tem papel atribuído ou que criou

### Fluxo de Etapas

Ao protocolar um processo, 14 etapas padrão REURB são criadas automaticamente:

1. Abertura / Protocolo
2. Diagnóstico Prévio
3. Levantamento Topográfico
4. Classificação da Modalidade
5. Buscas Dominiais
6. Notificação dos Confrontantes
7. Estudos Técnicos
8. Vetorização + Cadastro Social
9. Saneamento
10. Elaboração do PRF
11. Aprovação do PRF
12. Emissão da CRF
13. Registro em Cartório
14. Monitoramento Pós-REURB

Cada etapa registra data de início e conclusão automaticamente. Ao concluir uma etapa é solicitado um **parecer/justificativa**, que fica salvo no banco e aparece na trilha de auditoria. A próxima etapa é iniciada automaticamente.

### Atribuição de Equipe

Dentro do painel de cada processo é possível atribuir:

- **Responsável Técnico** — passa a ver e gerenciar o processo
- **Responsável Jurídico** — idem

Ao salvar, o processo aparece automaticamente na lista de processos do usuário atribuído.

### Arquivos por Etapa

- Cada etapa tem sua própria área de upload de arquivos
- Arquivos podem ser enviados para a etapa específica (ex.: laudos no Levantamento, pareceres na Análise Jurídica)
- Arquivos gerais do processo ficam numa seção separada
- Todos os arquivos têm data de upload e nome de quem enviou

### Trilha de Auditoria

Toda ação relevante é registrada automaticamente:

- Processo criado / protocolado
- Etapa avançada de status (com o parecer registrado)
- Arquivo adicionado ou removido (com nome do arquivo e etapa)
- Equipe alterada (técnico/jurídico atribuído)
- Status do processo alterado

O histórico fica visível na aba **Histórico** do painel do processo, com usuário e timestamp de cada evento.

### Documentos

- Criação de documentos rich text (TipTap 3) vinculados ao processo
- Auto-save de versões no banco
- Templates de documento com modelos pré-definidos do sistema REURB:
  - Portaria de Instauração
  - Notificação de Confrontantes
  - Relatório Técnico Social
  - Auto de Demarcação Urbanística
  - Título de Legitimação Fundiária
- Preenchimento de campos com validação de CPF (algoritmo módulo 11)
- Perfis de preenchimento salvos por conta do usuário (até 15 por usuário)
- Colaboração em documentos com convite por link

### Convites de Equipe

- Geração de links de convite com permissão (visualizar / editar) e validade configurável (1–30 dias)
- Aceite do convite adiciona o usuário como colaborador no sistema

### Consulta Pública de Processos

Cidadãos podem acompanhar o andamento do processo sem precisar de login:

- Acesso via botão **"Consultar andamento de processo"** na tela de login
- Busca pelo número do protocolo (ex.: `0003-2026`)
- Exibe: status atual, descrição do que está acontecendo, stepper das 5 fases REURB, etapas detalhadas com datas
- **Não expõe** arquivos, nomes de servidores, observações internas nem dados sensíveis

### Dashboard e Relatórios

- Painel com totais de processos ativos, em diligência e finalizados
- Gráficos de distribuição por modalidade, status e município
- Cache de 60 s com skeleton screen durante carregamento
- Invalidação automática ao criar, deletar ou protocolar processo

### Chat da Equipe

- Mensagens compartilhadas entre todos os membros da equipe
- Polling incremental a cada 5 s (só busca mensagens novas por timestamp)

---

## Stack

| Camada     | Tecnologia                                     |
| ---------- | ---------------------------------------------- |
| Frontend   | React 18 + Vite 6 + TypeScript                 |
| UI         | Tailwind CSS + Lucide React                    |
| Roteamento | React Router DOM (HashRouter)                  |
| Editor     | TipTap 3                                       |
| Backend    | Python 3.13 + Django 6 + Django REST Framework |
| Auth       | SimpleJWT (JWT com rotação de refresh)         |
| Banco      | PostgreSQL — Neon (produção) / SQLite (dev)    |
| Realtime   | SSE (Server-Sent Events)                       |

---

## Estrutura

```
UemaBrisas/
├── backend/
│   ├── autenticacao/      # Login, JWT, SSE, CustomUser, ConviteEquipe, PerfilTemplate
│   ├── processos/         # CRUD processos, eventos de auditoria, consulta pública
│   ├── etapas/            # 14 etapas padrão REURB, atualização de progresso
│   ├── anexos/            # Upload de arquivos por processo e por etapa
│   ├── documentos/        # Documentos, versões, modelos do sistema, colaboradores
│   ├── chat/              # Mensagens da equipe
│   ├── painel/            # Dashboard e estatísticas
│   ├── equipe/            # Listagem de membros ativos
│   ├── permissoes/        # Controle de acesso por role e flags
│   ├── notificacoes/      # Notificações in-app
│   └── configuracao/      # settings.py, urls.py, wsgi.py
├── components/
│   ├── auth/              # LoginScreen, SignupScreen, ForgotPassword, ConsultaProcesso
│   ├── dashboard/         # Dashboard, ProcessManagement, ProcessDrawer, Team, Templates…
│   ├── editor/            # Editor TipTap + toolbar + extensões
│   └── layout/            # Sidebar
├── hooks/                 # useProcesses, useHeartbeat, usePermissoes, useStatusStream
├── services/              # Todos os serviços de API (um por módulo)
├── shared/
│   ├── contexts/          # AuthContext
│   ├── services/          # apiClient — fetch centralizado com refresh automático
│   └── utils/             # Helpers de data
└── types/                 # Tipos TypeScript globais
```

---

## Como Executar

### Backend

```bash
# Instalar dependências
pip install django djangorestframework djangorestframework-simplejwt \
            django-cors-headers dj-database-url python-dotenv google-auth requests

# Configurar banco — criar backend/.env
DATABASE_URL=postgresql://usuario:senha@host/neondb
GOOGLE_OAUTH2_CLIENT_ID=seu_client_id   # opcional

# Rodar
cd backend
python manage.py migrate
python manage.py runserver 8000
```

### Frontend

```bash
npm install
npm run dev
# http://localhost:5173
```

---

## Endpoints da API

| Método           | Endpoint                                     | Descrição                          | Auth |
| ---------------- | -------------------------------------------- | ---------------------------------- | ---- |
| POST             | `/api/autenticacao/login/`                   | Login — retorna JWT                | Não  |
| POST             | `/api/autenticacao/cadastro/`                | Criar conta                        | Não  |
| POST             | `/api/autenticacao/esqueci-senha/`           | Solicitar recuperação de senha     | Não  |
| GET              | `/api/processos/consulta/<protocolo>/`       | Consulta pública por protocolo     | Não  |
| POST             | `/api/autenticacao/heartbeat/`               | Atualizar status online            | JWT  |
| GET              | `/api/autenticacao/status-stream/`           | SSE de status da equipe            | JWT  |
| GET/PATCH/DELETE | `/api/autenticacao/usuarios/<pk>/`           | Gerenciar membro                   | JWT  |
| GET/POST         | `/api/autenticacao/convites-equipe/`         | Listar / criar convites            | JWT  |
| DELETE           | `/api/autenticacao/convites-equipe/<token>/` | Revogar convite                    | JWT  |
| GET/POST         | `/api/autenticacao/perfis-template/`         | Perfis de preenchimento do usuário | JWT  |
| DELETE           | `/api/autenticacao/perfis-template/<pk>/`    | Remover perfil                     | JWT  |
| GET/POST         | `/api/processos/`                            | Listar / criar processos           | JWT  |
| GET/PATCH/DELETE | `/api/processos/<id>/`                       | Detalhe / editar / excluir         | JWT  |
| GET              | `/api/processos/meus/`                       | Processos do usuário com papéis    | JWT  |
| GET              | `/api/processos/stats/`                      | Estatísticas do painel             | JWT  |
| GET              | `/api/processos/<id>/eventos/`               | Trilha de auditoria do processo    | JWT  |
| GET              | `/api/processos/<id>/etapas/`                | Listar etapas                      | JWT  |
| POST             | `/api/processos/<id>/etapas/protocolar/`     | Protocolar e criar etapas          | JWT  |
| PATCH            | `/api/etapas/<id>/`                          | Atualizar etapa (status, parecer)  | JWT  |
| GET/POST         | `/api/processos/<id>/anexos/`                | Listar / upload de arquivos        | JWT  |
| DELETE           | `/api/anexos/<id>/`                          | Remover arquivo                    | JWT  |
| GET/POST         | `/api/documentos/`                           | Listar / criar documentos          | JWT  |
| GET/POST         | `/api/documentos/modelos/`                   | Modelos de documento               | JWT  |
| GET/POST         | `/api/chat/`                                 | Mensagens da equipe                | JWT  |
| GET              | `/api/equipe/`                               | Membros ativos                     | JWT  |
| GET              | `/api/permissoes/`                           | Permissões do usuário logado       | JWT  |

**Header de autenticação:** `Authorization: Bearer <access_token>`

---

## Acesso de Teste

| Campo | Valor                |
| ----- | -------------------- |
| Email | `admin@reurb.gov.br` |
| Senha | `Admin123!`          |

---

_Sistema desenvolvido para gestão pública de regularização fundiária municipal — REURB (Lei Federal 13.465/2017)._
