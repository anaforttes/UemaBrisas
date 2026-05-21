## ADDED Requirements

### Requirement: presenceSlice centraliza usuários online no documento

O sistema SHALL manter a lista de usuários presentes no documento em `state.presence.users`, eliminando estado duplicado em `usePresenca` e `PainelColaboradores`.

#### Scenario: Presença é carregada ao entrar no documento

- **WHEN** o Editor monta com um `documentoId`
- **THEN** a thunk `fetchPresence(documentoId)` é despachada
- **THEN** `state.presence.users` é populado com os usuários ativos
- **THEN** `state.presence.documentId` armazena o ID do documento atual

#### Scenario: PainelColaboradores lê presença via selector

- **WHEN** `PainelColaboradores` precisa exibir usuários online
- **THEN** lê `state.presence.users` via `useAppSelector(selectOnlineUsers)`
- **THEN** não inicia polling próprio

### Requirement: Polling de presença deduplicado via hook global

O sistema SHALL ter um único `usePresenceSync` hook ativado uma vez no Editor, responsável pelo intervalo de 10 s — nenhum outro componente ou hook inicia polling de presença.

#### Scenario: Um único intervalo de polling por sessão de documento

- **WHEN** o Editor monta e ativa `usePresenceSync`
- **THEN** um único `setInterval` de 10 s é criado
- **THEN** a cada tick, a thunk `syncPresence(documentoId)` é despachada
- **THEN** ao desmontar o Editor, o intervalo é limpo

#### Scenario: Polling não cria intervalos adicionais

- **WHEN** `PainelColaboradores` monta (com o Editor já ativo)
- **THEN** nenhum novo intervalo de presença é criado
- **THEN** `PainelColaboradores` apenas lê `state.presence.users`

### Requirement: Heartbeat de sessão permanece independente

O sistema SHALL manter o `useHeartbeat` (25 s) separado do polling de presença — são responsabilidades distintas.

#### Scenario: Heartbeat não afeta state.presence

- **WHEN** o heartbeat dispara
- **THEN** nenhuma action do `presenceSlice` é despachada
- **THEN** `state.presence.users` não é modificado pelo heartbeat
