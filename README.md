# UemaBrisas

## Como executar o projeto

Este projeto possui duas partes principais: o **Backend** (Node.js/Express) e o **Frontend** (React/Vite). Ambas as partes precisam estar em execução para que a aplicação funcione corretamente.

### 1. Como executar o Backend

1. Abra um terminal.
2. Navegue até a pasta do backend:
   ```bash
   cd backend
   ```
3. Crie o arquivo de variáveis de ambiente:
   - Duplique o arquivo `.env.example` e renomeie-o para `.env`
   - Preencha as informações necessárias no `.env` (como o *DATABASE_URL*)
   ```bash
   cp .env.example .env
   ```
4. Instale as dependências (caso ainda não tenha feito):
   ```bash
   npm install
   ```
4. Inicie o servidor em modo de desenvolvimento:
   ```bash
   npm run dev
   ```
   *O backend iniciará usando o `tsx watch` e conectará com o Prisma.*

### 2. Como executar o Frontend

1. Abra um **novo terminal** (para manter o backend rodando).
2. Navegue até a pasta do frontend:
   ```bash
   cd uema-2026
   ```
3. Crie o arquivo de variáveis de ambiente:
   - Duplique o arquivo `.env.example` e renomeie-o para `.env`
   - Preencha as informações necessárias (como a *VITE_API_KEY*)
   ```bash
   cp .env.example .env
   ```
4. Instale as dependências (caso ainda não tenha feito):
   ```bash
   npm install
   ```
4. Inicie o servidor do frontend:
   ```bash
   npm run dev
   ```
   *O frontend estará disponível em `http://localhost:5173` ou na porta informada no terminal.*
