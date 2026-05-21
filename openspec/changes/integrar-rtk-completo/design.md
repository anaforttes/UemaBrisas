## Context

O RTK (`@reduxjs/toolkit` ^2.11.2 + `react-redux`) já está instalado e há um esqueleto em `store/` com `authSlice` básico e `Provider` no `index.tsx`. Porém:

- **Auth**: `AuthContext` é a fonte real de verdade; o Redux não é consultado por nenhum componente
- **Editor**: 19+ `useState` gerenciam estado de documento, versões, colaboradores, modais e auto-save de forma acoplada
- **Presença**: `usePresenca()` e `PainelColaboradores` fazem polling independente a cada 10 s (chamadas duplicadas)
- **Processos**: `useProcesses()` guarda estado localmente sem cache
- **UI/Tema**: `configuracoesService` lê/escreve diretamente no localStorage

A migração deve ser incremental — cada slice pode ser integrado e testado de forma independente.

## Goals / Non-Goals

**Goals:**

- Unificar estado de autenticação no Redux (eliminar dualidade com AuthContext)
- Centralizar estado do documento no `documentSlice` (eliminar 19+ useState do Editor)
- Deduplicar polling de presença via `presenceSlice` com intervalo único de 10 s
- Adicionar `processSlice` com cache simples e invalidação por evento
- Adicionar `uiSlice` para modais, tabs e tema
- Manter `AuthContext` como wrapper fino (React context que lê do Redux) para não quebrar consumidores existentes

**Non-Goals:**

- Migrar para RTK Query (nenhum endpoint está sendo migrado para query caching agora)
- Alterar qualquer endpoint do backend
- Reescrever lógica de negócio — apenas relocar estado
- WebSocket real-time (polling permanece como está)

## Decisions

### 1. AuthContext vira wrapper read-only do Redux

**Decisão**: `AuthContext` passa a ler `state.auth` da store e a despachar `loginAction`/`logoutAction`. Não mantém estado próprio.

**Alternativa rejeitada**: Remover o Context completamente e fazer todos os componentes usarem `useAppSelector`. Muito invasivo; quebraria todos os componentes que já usam `useAuth()` de uma vez.

**Rationale**: Wrapper fino preserva a API pública (`useAuth()`) sem mudanças de interface, e a migração para `useAppSelector` direto pode acontecer progressivamente depois.

---

### 2. documentSlice agrupa todo estado do Editor

**Decisão**: Criar `documentSlice` com os sub-estados:

```
document: {
  id, title, content, status,
  autoSave: { status, lastSavedAt },
  versions: [],
  collaborators: [],
  ui: { activeTab, showModal, exportMenu }
}
```

**Alternativa rejeitada**: Manter useState no Editor e só sincronizar com Redux no save. Perpetua o problema de acoplamento.

**Rationale**: O Editor tem lógica de auto-save (30 s), versões e colaboradores que precisam de acesso cross-component (ex: `PainelColaboradores` lê colaboradores do mesmo documento). Um slice único elimina prop-drilling e duplicação.

---

### 3. Middleware para persistência de tokens (auth)

**Decisão**: Usar um middleware RTK customizado que ouve as actions `auth/setCredentials` e `auth/logout` e escreve/remove tokens do localStorage.

**Alternativa rejeitada**: `redux-persist`. Adiciona dependência e serializa toda a store (incluindo dados sensíveis).

**Rationale**: Controle explícito — apenas tokens vão para o localStorage, nada mais.

---

### 4. presenceSlice com um único intervalo global

**Decisão**: `presenceSlice` dispara um único `setInterval` de 10 s via middleware ou hook de alto nível (`usePresenceSync`), eliminando os intervalos redundantes em `usePresenca` e `PainelColaboradores`.

**Alternativa rejeitada**: Manter hooks individuais mas coordená-los com um singleton. Frágil e difícil de testar.

---

### 5. processSlice com cache por TTL simples

**Decisão**: `processSlice` armazena `{ data: [], fetchedAt: number, loading, error }`. Seletores verificam se `fetchedAt` tem menos de 60 s; se não, disparam re-fetch. Evento `reurb:processos-alterados` despacha `invalidateProcesses()`.

**Alternativa rejeitada**: RTK Query. Overkill para uma única lista com invalidação por evento custom.

---

### 6. uiSlice para estado global de UI

**Decisão**: `uiSlice` gerencia `theme`, `sidebarCollapsed`, `activeModal` e `toasts[]`. `configuracoesService` passa a ler/gravar o tema via dispatch.

## Risks / Trade-offs

- **Regressão no Editor** → Migrar um `useState` por vez, mantendo testes manuais do fluxo de auto-save e versões antes de mergear
- **AuthContext desatualizado durante transição** → Usar feature flag temporária (`USE_REDUX_AUTH=true`) para ativar o wrapper apenas em dev antes de promover para prod
- **Race condition auto-save vs polling** → `documentSlice` deve ter flag `isSaving` que bloqueia o polling de sobrescrever o estado local enquanto um save está em voo
- **Componentes usando `useAuth()` e `useAppSelector` ao mesmo tempo** → Proibir via lint rule ou revisão de PR; o wrapper deve ser a única fonte durante a transição

## Migration Plan

1. Completar `authSlice` + middleware de persistência → atualizar `AuthContext` para ler Redux
2. Criar `uiSlice` + migrar tema de `configuracoesService`
3. Criar `processSlice` + refatorar `useProcesses`
4. Criar `presenceSlice` + hook `usePresenceSync` + remover intervalos de `usePresenca` e `PainelColaboradores`
5. Criar `documentSlice` + migrar Editor por grupos de useState (metadata → versões → colaboradores → modais)
6. Remover estado próprio do `AuthContext`; validar que todos os consumidores acessam via Redux

**Rollback**: Cada slice é aditivo. Reverter um slice significa restaurar o useState/hook anterior sem afetar os demais.

## Open Questions

- O campo `avatar` do `CustomUser` (migration 0004) deve ser incluído no `authSlice` ou permanecer apenas no perfil de Configurações?
- Polling de presença deve pausar quando o documento não está em foco (Page Visibility API)?
