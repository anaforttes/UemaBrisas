# 🎉 Guia de Uso - Nova Funcionalidade de Documentos com Dados Adicionais

## 📋 O que foi implementado?

Uma nova funcionalidade que permite ao usuário:

1. **Selecionar um Modelo** de documento
2. **Preencher Dados Adicionais** (Nome, CPF, Local, Cargo, Instituição, Data, Observações)
3. **Ver uma Prévia** dos dados que serão inseridos
4. **Vincular ao Processo** apropriado
5. **Validar a Geolocalização** (GPS)
6. **Gerar o Documento** com todos os dados preenchidos automaticamente

## 🔄 Fluxo de Uso

### Passo 1: Acesse a Biblioteca de Modelos
- Clique em "Biblioteca de Modelos" no menu principal
- Veja todos os modelos disponíveis

### Passo 2: Clique em "Usar Modelo"
- Escolha um modelo (ex: "Portaria de Instauração", "Notificação de Confrontantes", etc)
- Clique no botão **"+ Usar Modelo"**

### Passo 3️⃣: Preencha os Dados do Documento
Um novo modal aparecerá com dois abas:

#### Aba "Dados do Documento" (Formulário)
Preencha os seguintes campos:

**Campos Obrigatórios:\***
- **Nome Completo** - Nome da pessoa responsável
- **CPF** - Documento de identidade (será formatado automaticamente: XXX.XXX.XXX-XX)
- **Local** - Município/localização (ex: São Luís, Maranhão)

**Campos Opcionais:**
- **Cargo** - Posição/função (ex: Secretário de Habitação)
- **Instituição** - Órgão/empresa (ex: Prefeitura Municipal)
- **Data do Documento** - Data do documento (padrão: data atual)
- **Observações** - Informações adicionais

#### Aba "Prévia do Modelo"
Clique para visualizar os dados que serão inseridos no documento antes de confirmarem

### Passo 4️⃣: Selecione o Processo
- Busque o processo por título, requerente ou protocolo
- Selecione o processo desejado
- Clique em "Continuar"

### Passo 5️⃣: Valide a Geolocalização
- O sistema capturará sua localização (GPS)
- Confirme se está no município correto
- O sistema validará automaticamente

### Passo 6️⃣: Document criado!
- O documento será criado com:
  - Os **dados adicionais** que você preencheu (nome, CPF, local, etc)
  - Os **dados do processo** já integrados ao modelo
  - A **validação de geolocalização**
- O documento abrirá automaticamente no editor

## 📝 Onde os Dados Aparecem?

Os dados adicionais aparecem em um bloco especial no início do documento com formatação clara:

```
┌─────────────────────────────────────────────┐
│   Dados Adicionais do Documento             │
├─────────────────────────────────────────────┤
│ Nome: [Nome que você preencheu]             │
│ CPF: [CPF que você preencheu]               │
│ Local: [Local que você preencheu]           │
│ Cargo: [Cargo que você preencheu]           │
│ Instituição: [Instituição que você preeench│
└─────────────────────────────────────────────┘

[Conteúdo do modelo com dados do processo]
```

## 🎯 Exemplos de Uso

### Exemplo 1: Portaria de Instauração
1. Selecione "Portaria de Instauração"
2. Preencha:
   - Nome: João da Silva
   - CPF: 123.456.789-10
   - Local: São Luís, Maranhão
   - Cargo: Secretário de Habitação
3. Selecione o processo "Núcleo Habitacional Vila Verde"
4. Valide o GPS
5. Pronto! A portaria terá os dados do João + dados do processo

### Exemplo 2: Notificação de Confrontantes
1. Selecione "Notificação de Confrontantes"
2. Preencha:
   - Nome: Maria Santos
   - CPF: 987.654.321-09
   - Local: Imperatriz, Maranhão
3. Selecione o processo "Vila Maranhão — Regularização"
4. Valide o GPS
5. A notificação será gerada com os dados de Maria!

## ✨ Recursos Especiais

### Formatação Automática de CPF
- Digite: `12345678910`
- Recebe automaticamente: `123.456.789-10`

### Validação de Campos Obrigatórios
- Não é possível continuar sem preencher:
  - Nome Completo
  - CPF
  - Local

### Prévia de Dados
- Visualize exatamente como os dados aparecerão antes de criar

### Flexibilidade
- Campos opcionais permitem preencher apenas o essencial
- Observações permitem adicionar informações específicas do documento

## 🐛 Troubleshooting

### "Os campos em azul não aparecem no documento"
- Clique na aba "Prévia do Modelo" para confirmar
- Preencha novamente se necessário

### "Não consigo continuar do formulário"
- Verifique se preencheu os 3 campos obrigatórios:
  - ✅ Nome Completo
  - ✅ CPF (mesmo se for incompleto, será formatado)
  - ✅ Local

### "O CPF não está formatado"
- Digite apenas números: `12345678910`
- Será formatado automaticamente quando sair do campo

## 🔐 Dados Salvos

Todos os dados adicionais são salvos no documento e podem ser:
- ✏️ Editados no editor após criação
- 💾 Salvos junto com o documento
- 📋 Consultados a qualquer momento

## 📌 Dicas Importantes

1. **Sempre valide os dados** na prévia antes de confirmar
2. **O GPS é obrigatório** - certifique-se de ter permissão de localização
3. **Os campos opcionais** não impedem a criação, mas agreguem valor ao documento
4. **Salve frequentemente** qualquer edição no editor

---

**Desenvolvido com ❤️ para melhorar a eficiência de seu trabalho de regularização fundiária!**
