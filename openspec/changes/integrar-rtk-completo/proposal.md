## Why

O frontend do UemaBrisas usa múltiplas fontes de estado desconexas (Context API, 19+ useState no Editor, hooks com polling duplicado), causando inconsistências, N chamadas redundantes à API e dificuldade de manutenção. A integração completa do RTK já instalado centraliza o estado, elimina duplicações e facilita cache e sincronismo com o backend.

## What Changes

- **authSlice** completo substitui AuthContext como fonte primária de autenticação; middleware persiste tokens no localStorage
- **documentSlice** encapsula todo estado do Editor (conteúdo, metadata, versões, colaboradores, status de auto-save), eliminando 19+ useState dispersos
- **presenceSlice** centraliza o polling de presença (10 s), eliminando chamadas duplicadas entre `usePresenca` e `PainelColaboradores`
- **processSlice** armazena lista de processos com cache e invalidação, desacoplando do estado local do hook
- **uiSlice** gerencia modais, tabs e tema, movendo preferências de `configuracoesService`/localStorage para a store
- `AuthContext` é mantido apenas como wrapper React que lê do Redux (sem estado próprio)
- `useProcesses`, `usePresenca`, `usePermissoes` são refatorados para despachar ações RTK em vez de gerenciar estado local

## Capabilities

### New Capabilities

- `rtk-auth`: Autenticação centralizada no Redux com middleware de persistência de tokens e refresh automático
- `rtk-document`: Estado do documento (conteúdo TipTap, metadata, versões, colaboradores, auto-save) gerenciado por slice RTK
- `rtk-presence`: Presença e colaboração em tempo real centralizada com polling deduplicado
- `rtk-processes`: Lista de processos REURB com cache RTK e invalidação por evento
- `rtk-ui`: Estado de UI global (modais, tabs, tema) via uiSlice

### Modified Capabilities

_(nenhuma spec existente com requisitos alterados)_

## Impact

- **Componentes afetados**: `Editor.tsx`, `PainelColaboradores.tsx`, `LoginScreen.tsx`, `Configuracoes.tsx`, `ConviteAcceptPage.tsx`, `index.tsx`
- **Hooks refatorados**: `usePresenca.ts`, `usePermissoes.ts`; `useProcesses` (em `services/`)
- **Contexto**: `AuthContext.tsx` vira wrapper read-only do Redux
- **Store**: `store/index.ts`, `store/slices/authSlice.ts` (completar), adicionar 4 novos slices
- **Dependências**: `@reduxjs/toolkit` e `react-redux` já instalados; nenhuma nova dependência necessária
- **Backend**: nenhuma alteração de API; apenas padrão de consumo muda no frontend
