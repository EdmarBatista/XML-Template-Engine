# XML Template Engine · Editor e Gerador de Documentos

Uma aplicação web moderna, responsiva e de alta fidelidade desenvolvida em **React 19**, **TypeScript**, **Vite** e **Tailwind CSS**, projetada para transformar templates estruturados em **XML** (`<formulario>` + `<conteudo>`) em formulários interativos com renderização em tempo real e exportação profissional para **DOCX (Word)**, **PDF** e **JSON**.

---

## 🚀 Principais Recursos

- ⚡ **Renderização e Atualização em Tempo Real**: Conforme os campos do formulário são preenchidos, o documento é atualizado instantaneamente na visualização lateral.
- 📄 **Exportação Multiformato de Alta Fidelidade**:
  - **Microsoft Word (.docx)**: Geração nativa via `docx` a partir do DOM renderizado, com suporte a estilos, tabelas com quebra de página inteligente (`cantSplit`), repetição de cabeçalho (`tableHeader`), preenchimento suave (`#E2E8F0`), recuos de lista, numeração automática e destaque opcional de variáveis.
  - **PDF Vetorial (.pdf)**: Geração vetorial com `pdfmake` a partir do DOM renderizado, preservando a estrutura tipográfica, alinhamento, larguras automáticas de colunas, células com repetição de cabeçalho entre páginas (`headerRows: 1`) e recuo progressivo de 0,5 cm por nível de seção.
  - **Impressão Isolada (A4)**: Impressão limpa via `<iframe>` oculto com estilos `@page` otimizados para papel A4.
  - **JSON de Preenchimento & Pacote ZIP**: Exportação e importação completa de dados salvos (`.json`) e pacote `.zip` unificado contendo o template XML e dados JSON.
- 🎨 **Constantes Centralizadas de Tema (`documentTheme.ts`)**:
  - Arquivo único de configuração contendo tipografia, tamanhos de fonte em pt, paleta de cores (hexadecimal e texto), larguras e estilos de borda, padding/twips de células de tabelas e espaçamentos entre parágrafos, eliminando valores arbitrários hardcoded em múltiplos arquivos.
- 🎛️ **Visualização Flexível**:
  - **Modo Folha A4 vs. Modo Fluido**: Alterne entre a prévia em página A4 física (com margens e paginação visual) e o modo leitura contínua.
  - **Controle de Zoom**: Zoom independente para o modo A4 e modo fluido (50% a 200%).
  - **Recuo Hierárquico de Seções**: Recuo progressivo de 0,5 cm por nível de seção (1.1, 1.1.1, etc.), com total paridade entre a tela, o Word e o PDF.
- ✏️ **Edição e Interatividade**:
  - **Variáveis Interativas**: Destaque e sincronização bidirecional entre o campo do formulário e o texto no documento.
  - **Edição Inline**: Alterne para o modo de edição direta no corpo do documento.
  - **Editor XML Integrado**: Editor CodeMirror 6 com syntax highlighting, autocompletar inteligente (sugere tags, atributos e variáveis), **linter de sintaxe em tempo real (bloqueia e alerta visualmente sobre tags inválidas)** e numeração de linhas.
  - **Inspetor de Variáveis e Modelo**: Painel para visualização da árvore AST, lista de variáveis detectadas e alertas de validação de escopo.
- 🌐 **Consultas e Máscaras Automáticas**:
  - Máscaras para **telefone** (fixo e celular), monetária (`moeda`), CPF, CNPJ e CEP, com validação rigorosa integrada.
  - Consulta automática de CEP via **ViaCEP** e CNPJ via **ReceitaWS/OpenCNPJ**.
  - Formatação de valores e datas por extenso em português.
- 💾 **Persistência Local**: Todo o estado (modelos customizados, dados preenchidos, zoom, preferências de barra lateral e exibição) é persistido no `localStorage`.
- 📥 **Gestão de Modelos, Drag & Drop e Histórico**:
  - **Criação Rápida**: Opção "Novo Modelo Em Branco" no seletor para iniciar projetos com a estrutura base pronta (`<documento>`, `<formulario>`, `<conteudo>`).
  - **Arrastar Documento Word (.docx)**: Converte automaticamente a estrutura do arquivo Word (títulos H1-H6, parágrafos, listas com marcadores/numeradas e tabelas) em um novo modelo XML editável (`<documento><formulario/><conteudo>...`), com diálogo de confirmação prévio e extração semântica de comentários de revisão (`word/comments.xml`).
  - **Arrastar Modelo + Dados juntos**: Cria o modelo customizado e armazena os dados de preenchimento como histórico atrelado àquele modelo.
  - **Arrastar arquivo de Dados isolado**: Preenche imediatamente os dados do formulário ativo.
  - **Arrastar Modelo (XML) isolado**: Importa o novo modelo de documento. Se já houver um histórico de dados com o mesmo nome na memória do navegador, ele será automaticamente vinculado!
  - **Botão `+` (Restaurar Dados Históricos)**: Modelos que possuem dados históricos associados exibem um botão verde `+` no seletor de modelos. Clicar no botão restaura instantaneamente os dados de preenchimento predefinidos.
  - **Exclusão Granular de Modelos**: Ao excluir um modelo, um painel interativo pergunta se você deseja: **Apagar apenas o Modelo** (mantendo os dados para uso futuro), **Apagar apenas os Dados** (mantendo o modelo na lista, mas limpando o histórico) ou **Apagar Tudo (Modelo e Dados)**.
  - **Limpeza Segura do Formulário**: A ação de limpar formulário reseta apenas os dados preenchidos da sessão atual, preservando o modelo e seu histórico atrelado.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Framework & UI** | React 19, TypeScript, Vite 6, Tailwind CSS v4 |
| **Animações & Ícones** | Lucide React, Motion |
| **Editor de Código** | CodeMirror 6 (`@uiw/react-codemirror`, `@codemirror/lang-xml`, `@codemirror/lang-json`) |
| **Geração e Conversão de Documentos** | `docx` (Word), `pdfmake` (PDF), `jszip`, `mammoth` (Conversão DOCX -> XML) |
| **Parsing & AST** | Parser XML customizado para árvore sintática intermediária (AST) |

---

## 📂 Estrutura do Projeto

```
/
├── public/                 # Recursos estáticos
├── src/
│   ├── components/         # Componentes da interface
│   │   ├── CodeMirrorEditor.tsx    # Wrapper reutilizável do CodeMirror
│   │   ├── DocumentViewer.tsx      # Visualizador de documento com suporte A4/Fluido
│   │   ├── DocumentViewer/         # Renderizadores modulares do documento (AST, blocos, inline, lógica)
│   │   │   ├── DocumentA4Canvas.tsx        # Canvas e container de página física A4 e modo fluido
│   │   │   ├── DocumentNodeRenderer.tsx    # Orquestrador raiz e ponto de entrada da AST
│   │   │   ├── index.ts                    # Barrel de exportação do DocumentViewer
│   │   │   ├── blocks/                     # Nós de nível estrutural/bloco
│   │   │   │   ├── DocumentBlockDispatcher.tsx # Despachante e gerenciador de blocos e buffers
│   │   │   │   ├── DocumentSectionNode.tsx     # Renderizador de seções (<secao>), títulos e numeração
│   │   │   │   ├── DocumentParagraphNode.tsx   # Renderizador de parágrafos (<p>) e quebras de linha
│   │   │   │   ├── DocumentListNode.tsx        # Renderizador de listas ordenadas e com marcadores
│   │   │   │   ├── DocumentTableNode.tsx       # Renderizador de tabelas (<tabela>) com linhas e loops
│   │   │   │   └── index.ts                    # Barrel de blocos estruturais
│   │   │   ├── inline/                     # Nós e variáveis de nível inline
│   │   │   │   ├── DocumentInlineRenderer.tsx  # Despachante e renderizador de nós inline
│   │   │   │   ├── DocumentInlineVariable.tsx  # Variável interativa com foco e edição inline
│   │   │   │   ├── DocumentInlineTableAccess.tsx # Acesso a células e colunas de tabelas
│   │   │   │   ├── DocumentInlineAutoTable.tsx   # Grade dinâmica gerada automaticamente
│   │   │   │   ├── DocumentTableCell.tsx         # Célula de tabela com edição inline unificada
│   │   │   │   ├── textVariableProcessor.tsx     # Processador e interpolador de {{chave|filtro}}
│   │   │   │   └── index.ts                    # Barrel de nós inline
│   │   │   └── logic/                      # Avaliação e renderização condicional
│   │   │       ├── DocumentConditionalNode.tsx # Avaliação interativa de <if expr="...">
│   │   │       └── index.ts                    # Barrel de lógica condicional
│   │   ├── ImportWordModal.tsx     # Modal de confirmação e conversão de arquivos Word (.docx)
│   │   ├── ModelModal.tsx          # Inspetor de variáveis e modelo AST
│   │   ├── ModelModal/VarsTabs.tsx # Abas de Variáveis (edição + resumo)
│   │   ├── Sidebar.tsx             # Formulário dinâmico com grupos e campos
│   │   ├── SidebarToolbar.tsx      # Barra de ferramentas e ações rápidas
│   │   ├── TemplateSelector.tsx    # Seletor de templates (customizados/prontos)
│   │   └── XmlEditorModal.tsx      # Modal de edição do código-fonte XML
│   ├── hooks/              # Hooks de estado extraídos do App
│   │   ├── usePreferencias.ts      # Preferências de interface + persistência
│   │   ├── useCamposFoco.ts        # Foco/destaque bidirecional documento↔sidebar
│   │   └── useToast.ts             # Toast simples
│   ├── hooks_App/          # Hooks orquestradores de alto nível do App.tsx
│   │   ├── index.ts                # Barrel de exportação de hooks_App
│   │   ├── useDocumentEngine.ts    # Orquestração do template XML, AST e sincronização de dados
│   │   ├── useDocumentExporters.ts # Camada unificada de exportações (Word, PDF, Impressão, JSON, ZIP)
│   │   ├── useFilePackageActions.ts# Ações de upload/download de pacotes de arquivo
│   │   ├── useFormHistory.ts       # Histórico de desfazer/refazer (Undo/Redo)
│   │   ├── useKeyboardShortcuts.ts # Gerenciador de atalhos de teclado globais
│   │   ├── useModalsManager.ts     # Gerenciamento de estado dos modais
│   │   └── useSidebarResizer.ts    # Redimensionamento dinâmico da barra lateral
│   ├── constants/
│   │   └── documentTheme.ts        # Constantes centralizadas de tipografia, cores, bordas e tabelas
│   ├── data/
│   │   ├── defaultTemplates.ts     # Catálogo de modelos padrão (barrel)
│   │   └── templates/              # Um arquivo por template (termoReferencia, bateriaTestes, contratoServicos)
│   ├── services/           # Serviços desacoplados de persistência, empacotamento e API externa
│   │   ├── apiService.ts           # Consultas CNPJ/CEP com cache/debounce
│   │   ├── useCnpjCepLookup.ts     # Hook que consome apiService (loading/data/error)
│   │   ├── filePackageService.ts   # Empacotador/desempacotador ZIP, leitura e download de arquivos
│   │   └── storageService.ts       # Gerenciamento unificado de LocalStorage (preferências e dados)
│   ├── utils/              # Motores de conversão e utilitários
│   │   ├── documentUtils.ts        # Barrel de formatacao/mascaras/validacao/listas/caminhos
│   │   ├── docxToXmlConverter.ts   # Conversor semântico Word (.docx) para Modelo XML e extração de comentários
│   │   ├── formatacao.ts           # Moeda, datas, números por extenso, romano
│   │   ├── mascaras.ts             # Máscaras de CPF/CNPJ/CEP/moeda e filtros de documento
│   │   ├── validacao.ts            # Validações (email/CPF/CNPJ/CEP) e validarCampo
│   │   ├── listas.ts               # CSV/foreach (formatarItemForeach, valoresDaLista)
│   │   ├── caminhos.ts             # obterValorPorCaminho e obterTipoEfetivoColuna
│   │   ├── paragraphs.ts           # Quebra de parágrafos por \\n / <br>
│   │   ├── domDocumentExtractor.ts # Extrator semântico DOM para Word e PDF
│   │   ├── expressionEvaluator.ts  # Avaliador de expressões lógicas (<if expr="...">)
│   │   ├── pdfExporter.ts          # Exportador vetorial para PDF (via DOM) e impressão isolada
│   │   ├── wordExporter.ts         # Exportador para Microsoft Word (via DOM) (.docx)
│   │   └── xmlParser.ts            # Parser XML -> Modelo Intermediário (AST)
│   ├── types.ts            # Definições de tipos TypeScript
│   ├── App.tsx             # Componente raiz e gerenciador de estado
│   ├── main.tsx            # Ponto de entrada da aplicação React
│   └── index.css           # Estilos globais Tailwind CSS
├── index.html              # HTML principal da aplicação
├── package.json            # Dependências e scripts npm
├── tsconfig.json           # Configurações do compilador TypeScript
└── vite.config.ts          # Configuração do Vite e plugins
```

---

## 📋 Schema do Template XML

Um template XML é estruturado em dois blocos principais:

```xml
<documento>
  <formulario>
    <!-- Definição dos grupos e campos interativos -->
  </formulario>
  <conteudo>
    <!-- Definição da estrutura e texto do documento -->
  </conteudo>
</documento>
```

### 1. `<formulario>` (Campos e Grupos)

Campos são organizados dentro de `<grupo titulo="...">`:

```xml
<formulario>
  <grupo titulo="Identificação das Partes">
    <input id="nome_contratante" label="Nome do Contratante" placeholder="Digite o nome completo" />
    <input id="email_contratante" label="E-mail" tipo="email" />
    <number id="cpf_contratante" label="CPF" tipo="cpf" />
    <number id="cnpj_empresa" label="CNPJ" tipo="cnpj" />
    <number id="cep_imovel" label="CEP do Imóvel" tipo="cep" />
    <select id="tipo_pessoa" label="Tipo de Pessoa">
      <option valor="F">Pessoa Física</option>
      <option valor="J">Pessoa Jurídica</option>
    </select>
  </grupo>
</formulario>
```

#### Controles Suportados no `<formulario>`:

> **Nomenclatura padronizada e estrita:** cada conceito de tipo/atributo tem **um único nome canônico**.
> - **`placeholder="..."`**: Texto fantasma de orientação que fica *dentro* do campo quando vazio.
> - **`descricao="..."`**: Texto explicativo/ajuda fixo posicionado *abaixo* do campo.
> - **`tipo="..."`**: Define a especialização, máscara e validação do campo.
>
> Use `<number>` para todos os valores numéricos, valores monetários (`tipo="moeda"`), documentos com dígitos (`tipo="cpf"`, `tipo="cnpj"`) e códigos postais (`tipo="cep"`). Use `<input>` estritamente para texto livre (`tipo="texto"` ou padrão), e-mail (`tipo="email"`) e listas de itens (`tipo="lista_csv"`).

| Tag | Atributos Principais | Descrição e Tipos Válidos |
|---|---|---|
| `<input>` | `id`, `label`, `tipo`, `placeholder`, `descricao` | Campo de texto de linha única. Atributos de `tipo`: `texto` (padrão), `email` (com validação de formato) e `lista_csv` (lista para loops `<foreach>`). |
| `<number>` | `id`, `label`, `tipo`, `min`, `max`, `step`, `placeholder`, `descricao` | Campo numérico e de dados com máscara/dígitos. Atributos de `tipo`: `number` (numérico com setas), `moeda` (R$ com máscara monetária), `cpf` (máscara e validação de dígitos), `cnpj` (máscara, validação e consulta OpenCNPJ), `cep` (máscara, validação e consulta ViaCEP), `telefone` (máscara com DDD). |
| `<textarea>` | `id`, `label`, `rows`, `placeholder`, `descricao` | Campo de texto com múltiplas linhas (altura configurável via `rows="N"`, padrão: 4). |
| `<date>` | `id`, `label`, `descricao` | Seletor nativo de data (formato ISO YYYY-MM-DD / exibição DD/MM/AAAA). |
| `<select>` | `id`, `label`, `descricao` + filhos `<option>` | Caixa de seleção suspensa (dropdown). Cada `<option>` aceita texto e atributo opcional `valor="..."`. |
| `<radio>` | `id`, `label`, `descricao` + filhos `<option>` | Grupo de botões de seleção exclusiva. Cada `<option>` aceita texto e atributo opcional `valor="..."`. |
| `<checkbox>` | `id`, `label`, `descricao` | Caixa de seleção booleana (`true` / `false`). |
| `<tabela>` | `id`, `label` + filhos `<coluna>` | Grade dinâmica de dados (tabela interativa onde o usuário pode adicionar, excluir e reordenar linhas). |

#### Configuração de `<coluna>` dentro de `<tabela>` (Formulário):
```xml
<tabela id="itens_orcamento" label="Planilha de Itens">
  <coluna id="descricao" label="Descrição" tipo="texto" placeholder="Ex: Licença de software" />
  <coluna id="quantidade" label="Qtd" tipo="number" min="1" step="1" />
  <coluna id="valor_unitario" label="Valor Unitário" tipo="moeda" />
  <coluna id="categoria" label="Categoria" tipo="select" opcoes="Hardware, Software, Serviço" />
</tabela>
```
- **Tipos suportados em `<coluna>`**: `texto` (padrão), `number`, `moeda`, `date`, `select`, `radio`, `textarea`, `checkbox`, `cpf`, `cnpj`, `cep`, `telefone`, `email`.
- **Atributos de `<coluna>`**: `id` (obrigatório), `label`, `tipo`, `placeholder`, `min`, `max`, `step`, `opcoes` (valores separados por vírgula ou tags `<option>` filhas).

#### Condicionais no Formulário (`<if>`):
Permite exibir ou ocultar campos dinamicamente no formulário com base em valores preenchidos:
```xml
<grupo titulo="Dados Adicionais">
  <checkbox id="tem_fiador" label="Possui Fiador?" />
  <if expr="tem_fiador == true">
    <input id="nome_fiador" label="Nome do Fiador" placeholder="Nome completo" />
    <number id="cpf_fiador" label="CPF do Fiador" tipo="cpf" />
  </if>
</grupo>
```

---

### 2. `<conteudo>` (Estrutura do Documento)

O documento suporta interpolação de variáveis, aplicação de filtros via sintaxe `{{campo | filtro}}` e **numeração hierárquica automática de seções**:

```xml
<conteudo>
  <titulo alinhamento="centro">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</titulo>

  <secao titulo="DAS PARTES" numerar="true">
    <p alinhamento="justificar">Pelo presente instrumento, <b>{{nome_contratante}}</b>, inscrito no CPF sob o nº {{cpf_contratante | cpf}}...</p>
  </secao>

  <secao titulo="DA PLANILHA DE ITENS E SERVIÇOS" numerar="true">
    <!-- Renderização Automática e Direta da Tabela do Formulário -->
    {{itens_orcamento}}
  </secao>

  <secao titulo="DO VALOR E PAGAMENTO" numerar="true">
    <p>O valor total acordado é de <b>R$ {{valor_servico | moeda}}</b> ({{valor_servico | moedaPorExtenso}}).</p>
  </secao>
</conteudo>
```

#### Todas as Tags Aceitas no `<conteudo>`:

| Categoria | Tag XML | Atributos Aceitos | Descrição |
|---|---|---|---|
| **Títulos** | `<titulo>` | `alinhamento="centro\|esquerda\|direita"` | Título principal do documento (Nível 1 / H1). |
| | `<subtitulo>` | `alinhamento="centro\|esquerda\|direita"` | Subtítulo do documento (Nível 2 / H2). |
| **Seções** | `<secao>` | `titulo="..."`, `numerar="true\|false"` | Seção com aninhamento ilimitado, numeração sequencial (1., 1.1, 1.1.1...) e recuo progressivo de 0,5 cm por nível. |
| **Parágrafos** | `<p>` | `alinhamento="justificar\|esquerda\|centro\|direita"` | Bloco de parágrafo de texto com alinhamento configurável e quebra inteligente. |
| **Divisores** | `<hr>` / `<hr/>` | — | Linha horizontal divisória entre blocos. |
| **Listas** | `<lista>` | — | Lista com marcadores (bullet points). Contém tags `<item>`. |
| | `<lista_numerada>` | — | Lista numerada sequencial (1, 2, 3...). Contém tags `<item>`. |
| | `<item>` | — | Item individual de lista. Suporta formatação inline e `<if expr="...">`. |
| **Formatação Inline** | `<b>` / `<strong>` | — | Texto em **negrito**. |
| | `<i>` / `<em>` | — | Texto em *itálico*. |
| | `<u>` | — | Texto <u>sublinhado</u>. |
| | `<s>` | — | Texto <s>tachado / riscado</s>. |
| | `<mark>` | — | Texto com destaque de marca-texto amarelo. |
| | `<cor>` | `cor="#HEX\|rgb\|nome"` | Texto colorido (ex.: `<cor cor="#dc2626">Alerta</cor>` ou `<cor cor="blue">Info</cor>`). |
| | `<a>` | `href="..."` | Link / hiperlink clicável. |
| | `<br>` / `<br/>` | — | Quebra de linha manual dentro de parágrafos. |
| **Lógica** | `<if>` | `expr="..."` | Exibição condicional de blocos, parágrafos, células de tabela ou itens de lista. |
| | `<foreach>` | `lista="..."`, `var="..."` | Repetição dinâmica de conteúdo iterando sobre tabelas, listas CSV ou linhas. Disponibiliza `{{var.coluna}}`, `{{var._index}}` e `{{var._indice}}`. |
| **Tabelas** | `<tabela>` | `id="..."` | Tabela estruturada. Aceita `<cabecalho>`, `<linha>`, `<celula>` e `<foreach>`. |
| | `<cabecalho>` | — | Linha de cabeçalho da tabela com repetição em quebra de página. |
| | `<linha>` | — | Linha regular de dados da tabela. |
| | `<celula>` | — | Célula individual da tabela. Suporta tags inline e variáveis. |

---


### Importação Inteligente de Documentos Word (DOCX)

O sistema suporta a importação direta de arquivos Word (DOCX) mantendo a estrutura de títulos, parágrafos, tabelas, e listas. Mais do que isso, o sistema é capaz de gerar **automaticamente** o formulário inteligente através do reconhecimento de marcações `{{ ... }}` no documento original.

Basta inserir as variáveis diretamente no texto do Word. O sistema compilará as variáveis, inferindo o tipo correto, rótulo e eventuais restrições.

#### Sintaxe Universal no Word:

```
{{ Nome do Campo | tipo_ou_filtro(args) | atributo=valor }}
```

**Regras de Extração e Inferência:**
- **Variáveis Básicas**: Se você digitar `{{ Nome do Fornecedor }}`, o sistema criará um campo de texto no formulário lateral. O nome da variável será normalizado (`nome_do_fornecedor`) para uso interno, mas o rótulo legível é preservado.
- **Tipos e Filtros**:
  - `{{ Valor do Contrato | moeda }}` → Cria um campo tipo Moeda no formulário, que já inclui formatação R$.
  - `{{ Data de Assinatura | data }}` → Cria um seletor de data (*date picker*).
  - `{{ Descrição do Objeto | longo }}` ou `textarea` → Cria uma caixa de texto com múltiplas linhas.
  - `{{ CNPJ da Empresa | cnpj }}` → Cria um campo numérico formatado como CNPJ.
- **Campos Numéricos com Atributos**:
  - `{{ Quantidade | number(min=1, max=100, step=1) }}` → Campo numérico com limites restritos e incremento de 1.
- **Múltipla Escolha**:
  - `{{ Modalidade | select(Pregão, Dispensa, Concorrência) }}` → Cria um menu suspenso (Dropdown) com 3 opções.
  - `{{ Documentação | checkbox(Aprovada, Pendente) }}` → Cria caixas de seleção.
  - `{{ Regime | radio(Integral, Parcial) }}` → Cria botões de opção.
- **Atributos de Apresentação**:
  - `{{ E-mail | email | placeholder=exemplo@email.com | desc=Informe o e-mail corporativo }}` → Cria campo com dica visual no formulário.

#### Controle Estrutural e Lógico (If / Foreach)
Você pode usar lógica diretamente no arquivo do Word:

- **Condicionais**:
  ```word
  {{ if Modalidade == 'Dispensa' }}
  Este parágrafo só aparecerá se a modalidade for Dispensa.
  {{ /if }}
  ```
- **Listas e Repetições (Foreach)**:
  Para criar uma lista dinâmica (por exemplo, dentro de uma tabela do Word ou tópicos), você pode fazer:
  ```word
  {{ foreach itens_orcamento }}
  - {{ item.descricao }} - {{ item.valor_unitario | moeda }}
  {{ /foreach }}
  ```
*(Nota: Tabelas nativas do Word são convertidas automaticamente e os seus cabeçalhos também se tornam campos do formulário para o usuário preencher múltiplas linhas).*


#### De Para (Word vs. XML)

Aqui está o paralelo exato do que você digita no Word e como o sistema compila estruturalmente no XML da aplicação:

| O que você digita no Word (DOCX) | O que o motor gera no Formulario XML | O que o motor gera no Conteúdo XML |
|:---|:---|:---|
| `{{ Nome da Mãe }}`                | `<input id="nome_da_mae" tipo="texto" rotulo="Nome da Mãe" />` | `<p>{{nome_da_mae}}</p>` |
| <code>{{ Valor &#124; moeda }}</code>              | <code>&lt;number id="valor" tipo="moeda" rotulo="Valor" /&gt;</code>            | <code>&lt;p&gt;{{valor &#124; moeda}}&lt;/p&gt;</code> |
| <code>{{ Nasc. &#124; data }}</code>               | <code>&lt;date id="nasc" rotulo="Nasc." /&gt;</code>                            | <code>&lt;p&gt;{{nasc &#124; data}}&lt;/p&gt;</code> |
| <code>{{ Resumo &#124; longo }}</code>              | <code>&lt;textarea id="resumo" rotulo="Resumo" /&gt;</code>                     | `<p>{{resumo}}</p>` |
| <code>{{ UF &#124; select(AC, AL) }}</code>        | <code>&lt;select id="uf" rotulo="UF"&gt;&lt;option&gt;AC&lt;/option&gt;...&lt;/select&gt;</code> | `<p>{{uf}}</p>` |
| <code>{{ CNH &#124; radio(Sim, Não) }}</code>      | <code>&lt;radio id="cnh" rotulo="CNH"&gt;&lt;option&gt;Sim&lt;/option&gt;...&lt;/radio&gt;</code> | `<p>{{cnh}}</p>` |
| `{{ if UF == 'SP' }}`              | *(Nenhum campo criado, apenas lógica)*                       | `<if expr="uf == 'SP'">` |
| `{{ /if }}`                        | *(Fechamento de condicional)*                                | `</if>` |
| `{{ foreach dependentes }}`        | *(Inicia lista dinâmica na tabela)*                          | `<foreach lista="dependentes" var="item">` |
| `{{ item.nome }}`                  | `<coluna id="nome" rotulo="Nome" />` (na tabela)           | `{{item.nome}}` |
| `{{ /foreach }}`                   | *(Fechamento da lista dinâmica)*                             | `</foreach>` |

#### Tabelas Nativas do Word
O sistema também converte **Tabelas do Word** perfeitamente:
1. Ele cria automaticamente um grupo de `<tabela>` no formulário para preenchimento de múltiplas linhas.
2. Cada cabeçalho da tabela do Word vira uma `<coluna>` desta tabela do formulário.
3. No conteúdo, ele envolve as linhas com `<foreach>` para renderizar todos os dados que o usuário preencher.



### 3. Flexibilidade de Modelos e Particionamento

- **XML com apenas `<formulario>`**: Carrega todos os campos no painel lateral; o visualizador central exibe aviso claro de que o modelo não possui `<conteudo>`.
- **XML com apenas `<conteudo>`**: Renderiza o texto e estrutura no visualizador; o painel lateral exibe aviso informativo de que não há campos no documento.
- **XML Vazio**: Inicializa graciosamente sem erros, permitindo edição imediata no modal de XML (`Ctrl + S`).
- **Arquivos Particionados (`[1]`, `[01]`)**:
  - Arquivos nomeados com índice no final (ex.: `Minuta [1].xml`, `Minuta [2].xml` ou `Contrato [01].xml`, `Contrato [02].xml`) são automaticamente ordenados e concatenados em um único documento unificado.
  - Arquivos sem o padrão de colchetes numéricos no final são tratados como documentos independentes e não sofrem fusão acidental.

> **Nota sobre Numeração:** Ao utilizar `<secao titulo="DO VALOR E PAGAMENTO" numerar="true">` (ou simplesmente sem o atributo, já que a numeração é habilitada por padrão), o motor calcula e renderiza automaticamente o prefixo sequencial (ex.: `1.`, `2.`, `3.`, `3.1.`, etc.). Portanto, **não adicione números manuais** no atributo `titulo`. Para seções que não devem ser numeradas (como blocos de assinaturas ou anexos), use `numerar="false"`.

### 4. Sistema de Numeração Hierárquica Multinível (Níveis 1 a 8)

O motor conta com um algoritmo avançado de numeração hierárquica contínua que suporta até **8 níveis de profundidade** (tanto em seções `<secao>` quanto em parágrafos com atributo `nivel="2"` a `nivel="8"` ou importados do Word).

#### Tabela de Níveis e Exemplos:

| Nível | Identificação | Exemplo de Saída | Tag XML Típica | Recuo no Word/PDF |
|:---:|:---|:---|:---|:---:|
| **1** | Seção Primária | `1.` ou `2.` | `<secao titulo="...">` | 0,0 cm (margem) |
| **2** | Seção / Item Secundário | `1.1.` | `<secao>` filha ou `<p nivel="2">` / `<p numerado="true">` | 0,5 cm |
| **3** | Subitem Terciário | `1.1.1.` | `<secao>` neta ou `<p nivel="3">` | 1,0 cm |
| **4** | Subitem Quaternário | `1.1.1.1.` | `<p nivel="4">` | 1,5 cm |
| **5** | Subitem Quinário | `1.1.1.1.1.` | `<p nivel="5">` | 2,0 cm |
| **6** | Subitem Senário | `1.1.1.1.1.1.` | `<p nivel="6">` | 2,5 cm |
| **7** | Subitem Septenário | `1.1.1.1.1.1.1.` | `<p nivel="7">` | 3,0 cm |
| **8** | Subitem Octonário | `1.1.1.1.1.1.1.1.` | `<p nivel="8">` | 3,5 cm |

#### Como Funciona a Lógica:
1. **É recursivo?**
   - **Sim, na propagação de contexto estrutural da árvore AST**: cada `<secao>` aninhada gera um `subContexto` isolado derivado do prefixo do nó pai (`subPrefix`), propagando a numeração para todos os seus nós filhos sem risco de colisão entre capítulos distintos.
   - **Iterativo e dinâmico no estado de contadores**: internamente, a contagem utiliza um mapa indexado (`levelCounters: Record<number, number>`) e um mapa de prefixos acumulados (`levelNumbers: Record<number, string>`). Isso evita chamadas recursivas profundas em lote e elimina qualquer risco de estouro de pilha (*stack overflow*).
2. **Síntese Automática de Níveis Intermediários (Saltos de Nível)**:
   - Se o documento tiver um parágrafo de Nível 2 (`1.1.`) e, em seguida, um parágrafo saltar diretamente para o Nível 4 (`<p nivel="4">`), o motor detecta a ausência do Nível 3 e sintetiza automaticamente o ramo intermediário como `1.1.1.1.`, registrando os contadores corretos.
3. **Reinicialização Automática de Subcontadores**:
   - Ao avançar ou retornar para um nível superior (por exemplo, de um parágrafo `1.1.2.1.` para outro parágrafo de nível 2), todos os contadores dos níveis inferiores (> 2) são automaticamente reiniciados para `1`, e suas referências em cache são apagadas, garantindo que o próximo subitem reinicie em `1.2.1.` e não com numeração residual.
4. **O que Limita a Quantidade de Níveis (Por que até 8)?**
   - **Largura Física da Folha A4 e Legibilidade**: A folha A4 possui 21,0 cm de largura. Com margens padrão de 2,0 cm em cada lado, a área útil de impressão é de 17,0 cm. Como cada nível hierárquico aplica um recuo progressivo de 0,5 cm (`(nivel - 1) * 0.5 cm`), no Nível 8 o recuo atinge **3,5 cm**, restando 13,5 cm para o texto. Níveis acima de 8 esmagariam tabelas, listas e blocos de texto no canto direito da página.
   - **Compatibilidade com o Padrão Microsoft Word (OOXML)**: O padrão internacional OpenXML do Word define em sua especificação de listas multiníveis (`w:numPr`) um limite de 9 níveis (`ilvl 0` a `ilvl 8`). A adoção de até 8 níveis garante aderência total sem distorções no Word nativo (`.docx`) e no gerador PDF (`pdfmake`).
   - **Normas Técnicas (ABNT NBR 6024)**: Recomenda a numeração progressiva de seções até no máximo o 5º nível (seção quinária). O suporte a 8 níveis ultrapassa com folga as exigências mais complexas de editais, termos de referência e contratos públicos.
5. **Integração com Importação de Word (.docx)**:
   - Ao arrastar um arquivo `.docx`, o conversor reconhece estilos de títulos e parágrafos `Nivel 01` a `Nivel 08` (ou `Heading 1` a `Heading 8`), mapeando-os diretamente para `<secao>` ou `<p nivel="2">` ... `<p nivel="8">`.

#### Modos de Usar Tabelas no Documento:

1. **Renderização Direta e Automática (Apenas com a Variável):**
   Basta colocar a variável da tabela definida no formulário:
   ```xml
   {{itens_orcamento}}
   ```
   *(ou `<tabela id="itens_orcamento" />`)*. O motor renderiza automaticamente uma tabela com os cabeçalhos das colunas definidos no formulário e todas as linhas preenchidas com as devidas máscaras e valores aplicados.

2. **Acesso Direto e Individual a Células, Linhas ou Colunas da Tabela:**
   Você pode interpolar qualquer célula pontual ou valor de linha diretamente no texto através do nome da coluna indexada ou índice da linha:
   - **Célula Específica (Coluna Indexada - Recomendado):**
     - `{{itens_orcamento.descricao[0]}}` -> Descrição da 1ª linha.
     - `{{itens_orcamento.valor_unitario[0] | moeda}}` -> Valor da 1ª linha formatado com máscara de moeda.
     - `{{itens_orcamento.prazo[1]}}` -> Prazo da 2ª linha.
   - **Célula Específica (Linha Indexada):**
     - `{{itens_orcamento[0].descricao}}` -> Descrição da 1ª linha.
     - `{{itens_orcamento[1].valor_unitario | moeda}}` -> Valor da 2ª linha.
   - **Coluna Inteira (Valores Concatenados):**
     - `{{itens_orcamento.descricao}}` -> Relação de todos os itens cadastrados separados por vírgula.

3. **Renderização Customizada com `<foreach>` dentro de `<tabela>`:**
   ```xml
   <tabela>
     <cabecalho>
       <celula>#</celula>
       <celula>Especificação</celula>
       <celula>Qtd</celula>
       <celula>Preço Unit.</celula>
     </cabecalho>
     <foreach lista="itens_orcamento" var="item">
       <linha>
         <celula>{{item._indice}}</celula>
         <celula>{{item.descricao}}</celula>
         <celula>{{item.quantidade}}</celula>
         <celula>{{item.valor_unitario | moeda}}</celula>
       </linha>
     </foreach>
   </tabela>
   ```

4. **Tabela Estática Manual:**
   ```xml
   <tabela>
     <cabecalho>
       <celula>Campo</celula>
       <celula>Valor</celula>
     </cabecalho>
     <linha>
       <celula>Órgão</celula>
       <celula>{{orgao}}</celula>
     </linha>
   </tabela>
   ```

#### Filtros de Formatação Disponíveis:

| Filtro | Exemplo de Entrada | Saída Formatada |
|---|---|---|
| `moeda` | `1500.5` ou `1500,50` | `1.500,50` |
| `moedaPorExtenso` | `1500.50` | `um mil e quinhentos reais e cinquenta centavos` |
| `numeroPorExtenso` | `42` | `quarenta e dois` |
| `data` | `2026-08-25` | `25/08/2026` |
| `dataPorExtenso` | `2026-08-25` | `25 de agosto de 2026` |
| `cpf` | `12345678900` | `123.456.789-00` |
| `cnpj` | `12345678000195` | `12.345.678/0001-95` |
| `cep` | `01001000` | `01001-000` |
| `romano` | `14` | `XIV` |

#### Tags Estruturais:

| Tag | Descrição |
|---|---|
| `<titulo>` / `<subtitulo>` | Títulos e subtítulos principais centralizados ou alinhados |
| `<secao titulo="..." numerar="true">` | Seção com suporte a aninhamento e recuo automático de 0,5 cm por nível |
| `<p>` / `<p>` | Parágrafo com alinhamento justificado e espaçamento ajustado |
| `<b>`, `<i>`, `<u>`, `<s>`, `<mark>` | Formatações inline de texto (negrito, itálico e sublinhado) |
| `<lista> ou <lista_numerada>` | Listas ordenadas ou com marcadores |
| `<tabela>` | Tabelas com suporte a `<cabecalho>`, `<linha>` e `<celula>` |
| `<if expr="...">` | Exibição condicional de parágrafos ou blocos inteiros |
| `<foreach var="..." lista="...">` | Repetição dinâmica a partir de listas CSV ou quebras de linha |

---

## ⌨️ Atalhos de Teclado

A aplicação conta com atalhos de teclado para agilizar o fluxo de preenchimento, edição e navegação:

### Globais (Tela Principal)
| Atalho | Ação |
|---|---|
| <kbd>Ctrl</kbd> + <kbd>S</kbd> / <kbd>Cmd</kbd> + <kbd>S</kbd> | Salvar / exportar os dados preenchidos (`.json`) |
| <kbd>Ctrl</kbd> + <kbd>P</kbd> / <kbd>Cmd</kbd> + <kbd>P</kbd> | Imprimir documento / gerar visualização de impressão A4 |
| <kbd>Ctrl</kbd> + <kbd>M</kbd> / <kbd>Cmd</kbd> + <kbd>M</kbd> | Abrir ou fechar o **Painel de Variáveis e Modelo** |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> / <kbd>Cmd</kbd> + <kbd>Z</kbd> | Desfazer (*Undo*) a última alteração nos campos |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> / <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> | Refazer (*Redo*) a alteração desfeita |
| <kbd>Esc</kbd> | Fechar modais, painéis ou cancelar edição ativa |

### No Painel de Código (XML e JSON)
| Atalho | Ação |
|---|---|
| <kbd>Ctrl</kbd> + <kbd>S</kbd> / <kbd>Cmd</kbd> + <kbd>S</kbd> | **Atualizar Documento** imediatamente com o código editado |
| <kbd>Tab</kbd> | Indentação inteligente de 2 espaços no editor de código |

### Na Edição Direta no Documento (*Inline Editing*)
| Atalho | Ação |
|---|---|
| <kbd>Enter</kbd> | Salvar e confirmar valor (em campos simples, data ou numéricos) |
| <kbd>Ctrl</kbd> + <kbd>Enter</kbd> / <kbd>Cmd</kbd> + <kbd>Enter</kbd> | Salvar e confirmar valor em áreas de texto multilinhas (*textarea*) |
| <kbd>Esc</kbd> | Cancelar edição rápida e restaurar o valor anterior |

---

## 💻 Desenvolvimento e Execução

### Pré-requisitos
- **Node.js** (versão 18 ou superior)
- Gerenciador de pacotes **npm**

### Comandos Principais

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (Vite)
npm run dev

# Validar TypeScript / Linter
npm run lint

# Gerar build de produção otimizado
npm run build

# Visualizar build localmente
npm run preview
```

---

## 📄 Licença

Projeto distribuído sob a licença **MIT**.
