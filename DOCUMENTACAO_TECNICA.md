# 📚 Documentação Técnica - Implementação de Dados Adicionais em Documentos

## 📋 Resumo das Alterações

Uma nova funcionalidade foi implementada para permitir que usuários preencham dados adicionais (nome, CPF, local, cargo, instituição, data e observações) ao criar documentos baseados em modelos. Esses dados são automaticamente inseridos no documento gerado.

## 🔧 Arquivos Modificados

### 1. `/uema-2026/types/index.ts`
**Mudança:** Adicionado novo tipo `DadosAdicionaisDocumento`

```typescript
export interface DadosAdicionaisDocumento {
  nome: string;
  cpf: string;
  local: string;
  cargo?: string;
  instituicao?: string;
  dataDocumento?: string;
  observacoes?: string;
}
```

**Mudança:** Estendida interface `REURBDocument`
```typescript
export interface REURBDocument {
  // ... campos existentes
  dadosAdicionais?: DadosAdicionaisDocumento;
}
```

### 2. `/uema-2026/components/dashboard/Templates.tsx`
**Mudanças principais:**

#### a) Importações
- Adicionado `DadosAdicionaisDocumento` nos imports de types
- Adicionados ícones `Eye` e `FileDetails` via lucide-react

#### b) Novo Componente Modal: `ModalDadosDocumento`
Componente React que exibe:
- Um formulário com campos para dados adicionais
- Uma aba de prévia para visualizar dados
- Validação de campos obrigatórios (nome, CPF, local)
- Formatação automática de CPF (XXX.XXX.XXX-XX)

```tsx
interface ModalDadosDocumentoProps {
  modelo: any;
  onConfirmar: (dados: DadosAdicionaisDocumento) => void;
  onFechar: () => void;
}

const ModalDadosDocumento: React.FC<ModalDadosDocumentoProps> = ({ modelo, onConfirmar, onFechar }) => {
  // Implementação do modal
}
```

**Funcionalidades:**
- Abas: "Dados do Documento" e "Prévia do Modelo"
- Formatação automática de CPF
- Validação de campos obrigatórios
- Interface intuitiva com Tailwind CSS

#### c) Estado Adicionado no Componente `Templates`
```typescript
const [dadosDocumento, setDadosDocumento] = useState<DadosAdicionaisDocumento | null>(null);
const [etapaModal, setEtapaModal] = useState<'dados' | 'geo' | 'processo' | null>(null);
```

#### d) Novo Fluxo de Handlers

**`handleUsarModelo`** - Iniciador do fluxo
```typescript
const handleUsarModelo = (model: any) => {
  setModeloSelecionado(model);
  setProcessoEscolhido(null);
  setDadosDocumento(null);
  limpar();
  setEtapaModal('dados'); // Abre modal de dados PRIMEIRO
};
```

**`handleConfirmarDados`** - Novo handler
```typescript
const handleConfirmarDados = (dados: DadosAdicionaisDocumento) => {
  setDadosDocumento(dados);
  setEtapaModal('processo'); // Vai para seleção de processo
};
```

**`handleContinuarParaEditor`** - Modificado
- Agora injeta `dadosDocumento` no início do documento
- Gera um bloco HTML com os dados formatados
- Mantém compatibilidade com geolocalização

#### e) Injeção de Dados no Documento
```typescript
if (dadosDocumento) {
  const dadosHTML = `
    <div style="margin-bottom:30px;padding:15px;background:#f0f9ff;...">
      <h3>Dados Adicionais do Documento</h3>
      <table>
        <tr><td>Nome:</td><td>${dadosDocumento.nome}</td></tr>
        <tr><td>CPF:</td><td>${dadosDocumento.cpf}</td></tr>
        ... (outros campos)
      </table>
    </div>
  `;
  conteudoCompleto = dadosHTML + conteudoCompleto;
}
```

#### f) Atualização do Render de Modais
```tsx
{/* Modal 0: Dados do Documento — primeiro passo (NOVO) */}
{etapaModal === 'dados' && modeloSelecionado && (
  <ModalDadosDocumento
    modelo={modeloSelecionado}
    onConfirmar={handleConfirmarDados}
    onFechar={handleFechar}
  />
)}

{/* Modal 1: Selecionar Processo — segundo passo */}
{/* Modal 2: Geolocalização — terceiro passo */}
```

#### g) Armazenamento no Banco de Dados
```typescript
const newDoc = dbService.documents.upsert({
  title: modeloSelecionado.name,
  content: conteudoCompleto,
  processId: processoEscolhido.id,
  dadosAdicionais: dadosDocumento,
});
```

## 🔄 Fluxo Completo

```
┌─────────────────┐
│ Usar Modelo     │
└────────┬────────┘
         ↓
┌──────────────────────────────┐
│ Modal: Dados do Documento     │
│ - Nome                       │
│ - CPF                        │
│ - Local                      │
│ - Cargo (opcional)           │
│ - Instituição (opcional)     │
│ - Data (opcional)            │
│ - Observações (opcional)     │
└────────┬─────────────────────┘
         ↓
┌──────────────────────────────┐
│ Modal: Selecionar Processo   │
│ - Buscar processo            │
│ - Vincular                   │
└────────┬─────────────────────┘
         ↓
┌──────────────────────────────┐
│ Modal: Geolocalização (GPS)  │
│ - Capturar localização       │
│ - Validar município          │
└────────┬─────────────────────┘
         ↓
┌──────────────────────────────┐
│ Editor - Documento Criado!   │
│ - Dados adicionais inseridos │
│ - Dados do processo inseridos│
│ - GPS validado e registrado  │
└──────────────────────────────┘
```

## 📊 Exemplo de HTML Gerado

```html
<div style="margin-bottom:30px;padding:15px;background:#f0f9ff;border:1px solid #bfdbfe;border-radius:8px;">
  <h3 style="margin-top:0;font-size:13px;font-weight:bold;color:#1e40af;">
    Dados Adicionais do Documento
  </h3>
  <table style="width:100%;font-size:11px;border-collapse:collapse;">
    <tr style="border-bottom:1px solid #dbeafe;">
      <td style="padding:6px;font-weight:bold;color:#475569;">Nome:</td>
      <td style="padding:6px;color:#334155;">João da Silva</td>
    </tr>
    <tr style="border-bottom:1px solid #dbeafe;">
      <td style="padding:6px;font-weight:bold;color:#475569;">CPF:</td>
      <td style="padding:6px;color:#334155;">123.456.789-10</td>
    </tr>
    {/* ... mais campos */}
  </table>
</div>
```

## ✅ Validações Implementadas

### Frontend
1. **Campos Obrigatórios:**
   - Nome não pode ser vazio
   - CPF não pode ser vazio
   - Local não pode ser vazio
   - Botão "Continuar" desabilitado até preenchimento

2. **Formatação:**
   - CPF é automaticamente formatado com máscara XXX.XXX.XXX-XX
   - Data padrão é a data atual

3. **UX:**
   - Abas para documentar dados vs prévia
   - Validação visual com cores
   - Mensagens de feedback

## 🔐 Armazenamento de Dados

Os dados adicionais são armazenados em três locais:

1. **localStorage** - Via `databaseService.documents.upsert()`
2. **Documento criado** - Campo `dadosAdicionais` em `REURBDocument`
3. **Editor** - Injetados como HTML no conteúdo inicial do documento

## 🚀 Próximas Melhorias Possíveis

1. **Backend Integration:**
   - Salvar `dadosAdicionais` em banco de dados real
   - API endpoints para CRUD de dados

2. **Funcionalidades Adicionais:**
   - Template customizável para apresentação dos dados
   - Mais campos configuráveis
   - Validação de CPF (algoritmo de validação)
   - Busca de dados de pessoa por CPF

3. **UX Enhancements:**
   - Histórico de dados preenchidos
   - Copiar dados de documento anterior
   - Autocomplete de campos

## 📝 Testes Realizados

- ✅ Fluxo completo sem erros
- ✅ Validação de campos obrigatórios
- ✅ Formatação automática de CPF
- ✅ Injeção correta de dados no documento
- ✅ Armazenamento em localStorage
- ✅ Compatibilidade com geolocalização
- ✅ Abas de dados vs prévia funcionam
- ✅ Comportamento de modais correto

## 🔗 Dependências

Nenhuma dependência adicional foi necessária. O código utiliza:
- React hooks (`useState`, `useMemo`)
- React Router (`useNavigate`)
- Lucide React (ícones)
- Tailwind CSS (estilos)
- tipos TypeScript existentes

---

**Data de Implementação:** 25 de março de 2026
**Status:** ✅ Pronto para Produção
