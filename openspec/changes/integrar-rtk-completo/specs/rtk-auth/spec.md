## ADDED Requirements

### Requirement: Redux é a fonte de verdade para autenticação

O sistema SHALL manter o estado de autenticação (usuário, tokens, loading) exclusivamente no `authSlice` da Redux store. O `AuthContext` SHALL ler esse estado via `useAppSelector` e não manter estado próprio.

#### Scenario: Login bem-sucedido atualiza o Redux

- **WHEN** o usuário submete credenciais válidas no `LoginScreen`
- **THEN** a action `auth/setCredentials` é despachada com `{ user, accessToken, refreshToken }`
- **THEN** o middleware persiste `accessToken` e `refreshToken` no localStorage com as chaves `reurb_access_token` e `reurb_refresh_token`
- **THEN** `state.auth.user` reflete o usuário logado e `state.auth.isAuthenticated` é `true`

#### Scenario: Logout limpa o Redux e o localStorage

- **WHEN** o usuário aciona logout (via botão ou token expirado)
- **THEN** a action `auth/logout` é despachada
- **THEN** o middleware remove `reurb_access_token`, `reurb_refresh_token` e `reurb_current_user` do localStorage
- **THEN** `state.auth.user` é `null` e `state.auth.isAuthenticated` é `false`

#### Scenario: Hidratação do estado na inicialização

- **WHEN** a aplicação é carregada (mount do Provider)
- **THEN** o middleware lê os tokens do localStorage
- **THEN** se tokens válidos existirem, despacha `auth/setCredentials` com os dados persistidos
- **THEN** `state.auth.loading` é `false` após a hidratação

### Requirement: AuthContext mantém compatibilidade de interface

O `AuthContext` SHALL continuar expondo o hook `useAuth()` com os mesmos campos (`user`, `loading`, `login`, `logout`) para não quebrar componentes existentes.

#### Scenario: Componente usa useAuth() sem alteração

- **WHEN** um componente chama `useAuth()`
- **THEN** recebe `user` derivado de `state.auth.user`
- **THEN** recebe `loading` derivado de `state.auth.loading`
- **THEN** `login()` despacha `auth/setCredentials` e `logout()` despacha `auth/logout`

### Requirement: Middleware de persistência de tokens

O sistema SHALL usar um middleware RTK customizado (não `redux-persist`) para persistir apenas tokens — nenhum outro dado da store é salvo no localStorage pelo middleware.

#### Scenario: Apenas tokens são persistidos

- **WHEN** qualquer action é despachada na store
- **THEN** o middleware verifica se é `auth/setCredentials` ou `auth/logout`
- **THEN** em nenhuma outra action o middleware escreve no localStorage
