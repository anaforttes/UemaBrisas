# Colaboração em Documentos — Como Funciona

## O que foi feito

Implementei um sistema de colaboração em documentos inspirado no Google Docs, onde membros da equipe podem ser convidados para editar um documento através de um link, todas as alterações ficam registradas no histórico e o sistema de assinaturas exige a participação de todos os envolvidos.

---

## O que mudou no backend

Criei um novo módulo chamado `documentos` dentro do backend Django. Ele é responsável por tudo que envolve documentos colaborativos: guardar o conteúdo, registrar quem participou, controlar versões, gerenciar comentários, assinaturas e os links de convite.

Esse módulo se comunica com o banco de dados PostgreSQL (Neon) e expõe uma API REST que o frontend consome.

### Modelos criados

- **Documento** — armazena o conteúdo, título, status e quem criou
- **ColaboradorDocumento** — relaciona um usuário a um documento como editor
- **VersaoDocumento** — cada vez que alguém salva, uma nova versão é registrada com o conteúdo, autor e data
- **ComentarioDocumento** — comentários e sugestões feitos dentro do editor
- **AssinaturaDocumento** — controla quem já assinou e quem ainda precisa assinar
- **ConviteDocumento** — o código UUID gerado para o link de convite

---

## Como funciona o link de convite

Quando o dono do documento clica em **"Gerar link de convite"**, o sistema faz o seguinte:

1. O frontend envia uma requisição para o backend pedindo a criação de um convite
2. O backend gera um código único (UUID — uma sequência aleatória como `a3f8c2d1-...`) e salva no banco com:
   - qual documento está sendo compartilhado
   - quem gerou o convite
   - quando expira (padrão: 7 dias)
   - quantas vezes já foi usado
3. O backend devolve esse código para o frontend, que monta o link completo no formato:
   ```
   http://localhost:5173/#/convite/a3f8c2d1-...
   ```
4. O dono copia esse link e manda para quem quiser convidar

### O que acontece quando alguém acessa o link

1. A pessoa abre o link no navegador e cai na página de convite
2. Se não estiver logada, o sistema pede que faça login primeiro
3. Após o login, o frontend extrai o código do convite da URL e consulta o backend
4. O backend verifica se o código existe, está ativo e não expirou — e retorna as informações do documento (título, quem criou, quando expira)
5. A pessoa vê uma tela com os detalhes e clica em **"Entrar no Documento"**
6. O backend então cria um registro de colaborador ligando aquele usuário ao documento, com papel de editor
7. A partir daí, o documento aparece para ela no painel e ela pode editar normalmente

---

## Como cada documento fica isolado dos outros

Cada documento no frontend tem um ID local único. Esse ID é usado como referência (`doc_ref`) para encontrar o registro correspondente no backend. Isso garante que um convite gerado para o documento A só adiciona a pessoa naquele documento — não em todos os outros.

Corrigi um bug onde documentos com o mesmo título estavam sendo mapeados para o mesmo registro no banco, o que fazia uma pessoa aparecer como participante em documentos que ela nunca foi convidada.

---

## Como o histórico funciona

Toda vez que alguém salva o documento (manualmente ou pelo auto-save), o sistema:

1. Atualiza o conteúdo atual no banco
2. Cria uma nova entrada de versão com o conteúdo, o autor e a data
3. Incrementa o número da versão

Se outro usuário estiver com o mesmo documento aberto, a cada 30 segundos o sistema verifica se existe uma versão mais nova no banco. Se existir, aparece um aviso no topo: _"Nova versão salva por [nome] — Carregar agora"_. O usuário decide se quer ou não carregar.

---

## Correções feitas na autenticação

Corrigi dois problemas relacionados ao login:

**1. Token JWT expirado sem renovação automática**
O sistema usa tokens JWT para autenticar as requisições. O token de acesso tem validade curta. Antes, quando ele expirava, qualquer chamada ao backend retornava erro e o usuário via mensagens como "Convite inválido". Agora o sistema detecta automaticamente o erro 401 (não autorizado), usa o token de refresh (que dura mais tempo) para pedir um novo token de acesso, e repete a requisição — tudo transparente para o usuário.

**2. Tabela de blacklist com referência errada**
O Django usa uma tabela chamada `token_blacklist_outstandingtoken` para controlar os tokens emitidos. Essa tabela estava com uma ligação (chave estrangeira) apontando para a tabela padrão de usuários do Django (`auth_user`), mas o sistema usa uma tabela customizada (`autenticacao_customuser`). Isso fazia o login falhar com erro 500 para usuários novos. Corrigi diretamente no banco, redirecionando a referência para a tabela correta e limpando os registros antigos inválidos.

---

## Resumo do fluxo completo

```
Usuário A abre um documento
    → sistema cria/encontra o documento no backend
    → Usuário A clica em "Gerar link de convite"
    → backend gera um código UUID com validade de 7 dias

Usuário A envia o link para o Usuário B

Usuário B abre o link no navegador
    → faz login (se necessário)
    → vê os detalhes do documento
    → clica em "Entrar no Documento"
    → backend registra Usuário B como editor daquele documento

Usuário B agora tem acesso ao documento
    → pode editar, comentar e assinar
    → aparece na lista de participantes
    → todas as suas edições ficam registradas no histórico
```
