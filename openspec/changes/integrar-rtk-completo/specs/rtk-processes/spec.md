## ADDED Requirements

### Requirement: processSlice armazena lista de processos com cache

O sistema SHALL manter `state.processes.data`, `state.processes.fetchedAt`, `state.processes.loading` e `state.processes.error` no `processSlice`. Seletores SHALL verificar TTL de 60 s antes de re-fetch.

#### Scenario: Lista é buscada na primeira abertura do dashboard

- **WHEN** o Dashboard monta e `state.processes.fetchedAt` é `null`
- **THEN** a thunk `fetchProcesses()` é despachada
- **THEN** `state.processes.loading` é `true` durante o fetch
- **THEN** ao concluir, `state.processes.data` é populado e `fetchedAt` registra o timestamp atual

#### Scenario: Cache evita re-fetch dentro do TTL

- **WHEN** o Dashboard remonta e `fetchedAt` tem menos de 60 s
- **THEN** `fetchProcesses()` retorna sem fazer request
- **THEN** `state.processes.data` permanece inalterado

#### Scenario: Cache expirado dispara novo fetch

- **WHEN** o Dashboard monta e `fetchedAt` tem 60 s ou mais
- **THEN** `fetchProcesses()` faz um novo request
- **THEN** `state.processes.data` é atualizado com a resposta

### Requirement: Evento customizado invalida o cache de processos

O sistema SHALL ouvir o evento `reurb:processos-alterados` e despachar `processes/invalidate`, forçando re-fetch na próxima leitura.

#### Scenario: Criação de processo dispara invalidação

- **WHEN** um novo processo é criado e `reurb:processos-alterados` é emitido
- **THEN** `processes/invalidate` é despachada
- **THEN** `state.processes.fetchedAt` é definido como `null`
- **THEN** na próxima renderização do Dashboard, um novo fetch é iniciado

### Requirement: useProcesses delega estado ao Redux

O sistema SHALL refatorar `useProcesses` para despachar `fetchProcesses()` e ler `state.processes` via `useAppSelector`, sem manter estado local próprio.

#### Scenario: Hook retorna dados do Redux

- **WHEN** um componente usa `useProcesses()`
- **THEN** recebe `{ processes, loading, error }` derivados de `state.processes`
- **THEN** o hook não cria `useState` internamente para esses campos
