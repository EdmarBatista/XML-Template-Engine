const fs = require('fs');
const content = fs.readFileSync('README.md', 'utf-8');

const newSection = `
### Importação Inteligente de Documentos Word (DOCX)

O sistema suporta a importação direta de arquivos Word (DOCX) mantendo a estrutura de títulos, parágrafos, tabelas, e listas. Mais do que isso, o sistema é capaz de gerar **automaticamente** o formulário inteligente através do reconhecimento de marcações \`{{ ... }}\` no documento original.

Basta inserir as variáveis diretamente no texto do Word. O sistema compilará as variáveis, inferindo o tipo correto, rótulo e eventuais restrições.

#### Sintaxe Universal no Word:

\`\`\`
{{ Nome do Campo | tipo_ou_filtro(args) | atributo=valor }}
\`\`\`

**Regras de Extração e Inferência:**
- **Variáveis Básicas**: Se você digitar \`{{ Nome do Fornecedor }}\`, o sistema criará um campo de texto no formulário lateral. O nome da variável será normalizado (\`nome_do_fornecedor\`) para uso interno, mas o rótulo legível é preservado.
- **Tipos e Filtros**:
  - \`{{ Valor do Contrato | moeda }}\` → Cria um campo tipo Moeda no formulário, que já inclui formatação R$.
  - \`{{ Data de Assinatura | data }}\` → Cria um seletor de data (*date picker*).
  - \`{{ Descrição do Objeto | longo }}\` ou \`textarea\` → Cria uma caixa de texto com múltiplas linhas.
  - \`{{ CNPJ da Empresa | cnpj }}\` → Cria um campo numérico formatado como CNPJ.
- **Campos Numéricos com Atributos**:
  - \`{{ Quantidade | number(min=1, max=100, step=1) }}\` → Campo numérico com limites restritos e incremento de 1.
- **Múltipla Escolha**:
  - \`{{ Modalidade | select(Pregão, Dispensa, Concorrência) }}\` → Cria um menu suspenso (Dropdown) com 3 opções.
  - \`{{ Documentação | checkbox(Aprovada, Pendente) }}\` → Cria caixas de seleção.
  - \`{{ Regime | radio(Integral, Parcial) }}\` → Cria botões de opção.
- **Atributos de Apresentação**:
  - \`{{ E-mail | email | placeholder=exemplo@email.com | desc=Informe o e-mail corporativo }}\` → Cria campo com dica visual no formulário.

#### Controle Estrutural e Lógico (If / Foreach)
Você pode usar lógica diretamente no arquivo do Word:

- **Condicionais**:
  \`\`\`word
  {{ if Modalidade == 'Dispensa' }}
  Este parágrafo só aparecerá se a modalidade for Dispensa.
  {{ /if }}
  \`\`\`
- **Listas e Repetições (Foreach)**:
  Para criar uma lista dinâmica (por exemplo, dentro de uma tabela do Word ou tópicos), você pode fazer:
  \`\`\`word
  {{ foreach itens_orcamento }}
  - {{ item.descricao }} - {{ item.valor_unitario | moeda }}
  {{ /foreach }}
  \`\`\`
*(Nota: Tabelas nativas do Word são convertidas automaticamente e os seus cabeçalhos também se tornam campos do formulário para o usuário preencher múltiplas linhas).*

`;

// Insert the new section after "### 3. Flexibilidade de Modelos e Particionamento"
// Wait, I can insert it just before "### 3. Flexibilidade de Modelos e Particionamento"
const target = "### 3. Flexibilidade de Modelos e Particionamento";
const replacement = newSection + target;

if (content.includes(target)) {
    fs.writeFileSync('README.md', content.replace(target, replacement));
    console.log("README updated successfully");
} else {
    console.error("Target not found");
}
