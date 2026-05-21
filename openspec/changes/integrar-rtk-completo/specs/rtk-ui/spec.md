## ADDED Requirements

### Requirement: uiSlice gerencia tema da aplicação

O sistema SHALL armazenar a preferência de tema (`'light' | 'dark'`) em `state.ui.theme`. O `configuracoesService` SHALL despachar `ui/setTheme` em vez de escrever diretamente no localStorage.

#### Scenario: Tema é aplicado ao inicializar

- **WHEN** a aplicação carrega
- **THEN** o `uiSlice` lê a preferência do localStorage na inicialização do slice (`initialState`)
- **THEN** `state.ui.theme` reflete o valor salvo (padrão `'light'` se ausente)

#### Scenario: Mudança de tema atualiza a store e persiste

- **WHEN** o usuário muda o tema em Configurações
- **THEN** a action `ui/setTheme` é despachada com o novo valor
- **THEN** um listener (middleware ou `useEffect` no componente raiz) escreve o valor no localStorage
- **THEN** a aplicação aplica o tema imediatamente via classe CSS no `document.body`

### Requirement: uiSlice gerencia sidebar

O sistema SHALL armazenar `state.ui.sidebarCollapsed: boolean` para controlar a exibição da Sidebar globalmente.

#### Scenario: Colapsar a sidebar persiste entre navegações

- **WHEN** o usuário colapsa a Sidebar
- **THEN** a action `ui/setSidebarCollapsed` é despachada com `true`
- **THEN** qualquer componente que leia `state.ui.sidebarCollapsed` reflete o estado colapsado

### Requirement: uiSlice gerencia toasts/notificações globais

O sistema SHALL manter `state.ui.toasts: Toast[]` para notificações temporárias, com suporte a add e dismiss.

#### Scenario: Toast é adicionado e removido automaticamente

- **WHEN** uma operação bem-sucedida ou com erro ocorre
- **THEN** a action `ui/addToast` é despachada com `{ id, message, type, duration }`
- **THEN** o toast aparece na UI
- **THEN** após `duration` ms, a action `ui/removeToast` é despachada automaticamente

#### Scenario: Toast pode ser dispensado manualmente

- **WHEN** o usuário clica no X do toast
- **THEN** a action `ui/removeToast` é despachada com o `id` correspondente
- **THEN** o toast desaparece imediatamente
