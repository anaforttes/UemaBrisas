## 1. Completar authSlice e middleware de persistência

- [ ] 1.1 Adicionar campos `isAuthenticated`, `accessToken`, `refreshToken` ao `authSlice` existente em `store/slices/authSlice.ts`
- [ ] 1.2 Criar actions `setCredentials({ user, accessToken, refreshToken })` e `logout()` no slice
- [ ] 1.3 Criar middleware RTK customizado `tokenPersistenceMiddleware` que ouve `auth/setCredentials` e `auth/logout` e escreve/remove tokens do localStorage
- [ ] 1.4 Registrar o middleware em `store/index.ts`
- [ ] 1.5 Adicionar lógica de hidratação: ao criar a store, ler tokens do localStorage e popular `initialState` do authSlice

## 2. Migrar AuthContext para wrapper Redux

- [ ] 2.1 Refatorar `shared/contexts/AuthContext.tsx` (ou equivalente) para ler `state.auth` via `useAppSelector` sem manter `useState` próprio
- [ ] 2.2 Implementar `login()` no contexto despachando `auth/setCredentials` com a resposta da API
- [ ] 2.3 Implementar `logout()` no contexto despachando `auth/logout`
- [ ] 2.4 Verificar que todos os consumidores de `useAuth()` continuam funcionando sem alteração de interface
- [ ] 2.5 Remover qualquer escrita direta no localStorage de tokens que existia no contexto anterior

## 3. Criar uiSlice

- [ ] 3.1 Criar `store/slices/uiSlice.ts` com estado `{ theme, sidebarCollapsed, toasts, activeModal }`
- [ ] 3.2 Adicionar actions: `setTheme`, `setSidebarCollapsed`, `addToast`, `removeToast`, `openModal`, `closeModal`
- [ ] 3.3 No `initialState`, ler tema do localStorage (chave `reurb_theme`)
- [ ] 3.4 Registrar `uiSlice` na store em `store/index.ts`
- [ ] 3.5 Refatorar `Configuracoes.tsx` para despachar `ui/setTheme` ao mudar o tema
- [ ] 3.6 Adicionar listener (middleware ou `useEffect` no app root) que persiste `state.ui.theme` no localStorage quando muda
- [ ] 3.7 Criar seletores `selectTheme`, `selectSidebarCollapsed`, `selectToasts`

## 4. Criar processSlice e refatorar useProcesses

- [ ] 4.1 Criar `store/slices/processSlice.ts` com estado `{ data, fetchedAt, loading, error }`
- [ ] 4.2 Criar thunk `fetchProcesses()` que verifica TTL de 60 s antes de fazer request
- [ ] 4.3 Adicionar action `processes/invalidate` que zera `fetchedAt`
- [ ] 4.4 Registrar `processSlice` na store
- [ ] 4.5 Criar seletores `selectProcesses`, `selectProcessesLoading`, `selectProcessesError`
- [ ] 4.6 Refatorar `useProcesses` (hook ou service) para despachar `fetchProcesses()` e ler via `useAppSelector` — remover `useState` interno
- [ ] 4.7 Adicionar listener de `reurb:processos-alterados` em um único ponto (ex: hook de alto nível no Dashboard) que despacha `processes/invalidate`

## 5. Criar presenceSlice e hook usePresenceSync

- [ ] 5.1 Criar `store/slices/presenceSlice.ts` com estado `{ users, documentId, loading }`
- [ ] 5.2 Criar thunk `fetchPresence(documentId)` e thunk `syncPresence(documentId)` (usado no polling)
- [ ] 5.3 Registrar `presenceSlice` na store
- [ ] 5.4 Criar seletor `selectOnlineUsers`
- [ ] 5.5 Criar `hooks/usePresenceSync.ts` que ativa um único `setInterval` de 10 s despachando `syncPresence`; limpa o intervalo no unmount
- [ ] 5.6 Refatorar `usePresenca.ts` para despachar `fetchPresence` e ler de `state.presence` — remover `useState` e `setInterval` internos
- [ ] 5.7 Refatorar `PainelColaboradores.tsx` para ler presença via `useAppSelector(selectOnlineUsers)` — remover polling próprio

## 6. Criar documentSlice e migrar Editor

- [ ] 6.1 Criar `store/slices/documentSlice.ts` com estado `{ id, title, content, status, loading, autoSave, versions, collaborators, ui }`
- [ ] 6.2 Criar thunk `fetchDocument(documentoId)` que popula o slice
- [ ] 6.3 Criar thunk `saveDocument()` com guarda `isSaving` (não dispara se já em voo)
- [ ] 6.4 Adicionar actions: `setContent`, `setTitle`, `setStatus`, `addVersion`, `restoreVersion`, `addCollaborator`, `removeCollaborator`, `openModal`, `closeModal`, `setActiveTab`, `setExportMenu`
- [ ] 6.5 Registrar `documentSlice` na store
- [ ] 6.6 Criar seletores: `selectDocumentContent`, `selectAutoSaveStatus`, `selectVersions`, `selectCollaborators`, `selectDocumentUI`
- [ ] 6.7 Migrar grupo 1 do Editor (metadata: `id`, `title`, `status`, `isFinalizado`) para `useAppSelector` + dispatch
- [ ] 6.8 Migrar grupo 2 do Editor (auto-save: `autoSaveStatus`, `lastSavedAt`, `isSaving`) para o slice
- [ ] 6.9 Migrar grupo 3 do Editor (versões: `versoes`, `showVersionHistory`) para o slice
- [ ] 6.10 Migrar grupo 4 do Editor (colaboradores: `colaboradores`) para o slice — `PainelColaboradores` passa a ler via selector
- [ ] 6.11 Migrar grupo 5 do Editor (UI/modais: `showExportMenu`, `activeTab`, modal flags) para `state.document.ui`
- [ ] 6.12 Remover os `useState` migrados do `Editor.tsx` e confirmar que o componente compila sem erros de TypeScript

## 7. Validação final

- [ ] 7.1 Verificar fluxo completo de login → edição → auto-save → logout no browser
- [ ] 7.2 Verificar que presença aparece corretamente em `PainelColaboradores` sem polling duplicado (checar Network tab: uma única chamada a cada 10 s)
- [ ] 7.3 Verificar que criação de processo invalida o cache e a lista é recarregada
- [ ] 7.4 Verificar mudança de tema em Configurações aplicada imediatamente e persistida após refresh
- [ ] 7.5 Verificar que `AuthContext` não mantém estado próprio (nenhum `useState` de user/tokens)
- [ ] 7.6 Confirmar ausência de erros de TypeScript (`npx tsc --noEmit`)
