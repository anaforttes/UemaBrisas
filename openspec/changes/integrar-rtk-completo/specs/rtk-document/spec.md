## ADDED Requirements

### Requirement: documentSlice centraliza estado do documento aberto

O sistema SHALL gerenciar conteúdo, metadata, versões, colaboradores e status de auto-save do documento ativo em `documentSlice`, eliminando os `useState` equivalentes do `Editor.tsx`.

#### Scenario: Documento é carregado na store ao abrir o Editor

- **WHEN** o Editor monta e recebe um `documentoId`
- **THEN** a thunk `fetchDocument(documentoId)` é despachada
- **THEN** `state.document.loading` é `true` durante o fetch
- **THEN** ao concluir, `state.document.id`, `title`, `content` e `status` são populados
- **THEN** `state.document.loading` é `false`

#### Scenario: Edição de conteúdo atualiza a store imediatamente

- **WHEN** o usuário edita o conteúdo no TipTap
- **THEN** a action `document/setContent` é despachada com o novo HTML
- **THEN** `state.document.autoSave.status` muda para `'pending'`

#### Scenario: Auto-save persiste o conteúdo a cada 30 s

- **WHEN** `state.document.autoSave.status` é `'pending'` e 30 s se passam
- **THEN** a thunk `saveDocument()` é despachada
- **THEN** `state.document.autoSave.status` muda para `'saving'` durante o request
- **THEN** ao concluir com sucesso, muda para `'saved'` e `lastSavedAt` é atualizado
- **THEN** se o request falhar, muda para `'error'`

#### Scenario: Novo save não sobrescreve enquanto outro está em voo

- **WHEN** `state.document.autoSave.status` é `'saving'`
- **THEN** a thunk `saveDocument()` retorna sem fazer novo request

### Requirement: Histórico de versões no documentSlice

O sistema SHALL armazenar as versões do documento em `state.document.versions` e permitir restauração.

#### Scenario: Versão é adicionada ao salvar

- **WHEN** `saveDocument()` conclui com sucesso
- **THEN** a versão salva é adicionada ao início de `state.document.versions`
- **THEN** o array é limitado às últimas 50 versões

#### Scenario: Restaurar versão atualiza o conteúdo

- **WHEN** o usuário seleciona uma versão e aciona restauração
- **THEN** a action `document/restoreVersion` é despachada com o conteúdo da versão
- **THEN** `state.document.content` é atualizado e `autoSave.status` muda para `'pending'`

### Requirement: Colaboradores do documento no slice

O sistema SHALL armazenar a lista de colaboradores do documento em `state.document.collaborators`, compartilhada entre Editor e PainelColaboradores sem prop-drilling.

#### Scenario: PainelColaboradores lê colaboradores via selector

- **WHEN** `PainelColaboradores` monta
- **THEN** lê `state.document.collaborators` via `useAppSelector`
- **THEN** não faz fetch próprio se a lista já estiver populada

#### Scenario: Colaborador adicionado atualiza a store

- **WHEN** um convite é aceito ou um colaborador é adicionado via API
- **THEN** a action `document/addCollaborator` é despachada
- **THEN** o novo colaborador aparece em `state.document.collaborators`

### Requirement: Estado de UI do documento (modais e tabs) no slice

O sistema SHALL manter `activeTab`, `showExportMenu` e identificadores de modal aberto em `state.document.ui`, eliminando useState de UI do Editor.

#### Scenario: Abertura de modal atualiza o slice

- **WHEN** o usuário clica para abrir um modal (ex: assinatura, finalização)
- **THEN** a action `document/openModal` é despachada com o identificador do modal
- **THEN** `state.document.ui.activeModal` reflete o modal aberto

#### Scenario: Fechar modal limpa o estado

- **WHEN** o usuário fecha um modal
- **THEN** a action `document/closeModal` é despachada
- **THEN** `state.document.ui.activeModal` é `null`
