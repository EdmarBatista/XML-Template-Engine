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
  - **Editor XML Integrado**: Editor CodeMirror 6 com syntax highlighting, validação de schema e numeração de linhas.
  - **Inspetor de Variáveis e Modelo**: Painel para visualização da árvore AST e lista de variáveis detectadas.
- 🌐 **Consultas e Máscaras Automáticas**:
  - Máscara monetária (`moeda`), CPF, CNPJ e CEP.
  - Consulta automática de CEP via **ViaCEP** e CNPJ via **ReceitaWS/OpenCNPJ**.
  - Formatação de valores e datas por extenso em português.
- 💾 **Persistência Local**: Todo o estado (modelos customizados, dados preenchidos, zoom, preferências de barra lateral e exibição) é persistido no `localStorage`.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Framework & UI** | React 19, TypeScript, Vite 6, Tailwind CSS v4 |
| **Animações & Ícones** | Lucide React, Motion |
| **Editor de Código** | CodeMirror 6 (`@uiw/react-codemirror`, `@codemirror/lang-xml`, `@codemirror/lang-json`) |
| **Geração de Documentos** | `docx` (Word), `pdfmake` (PDF), `jszip` |
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
│   │   ├── ModelModal.tsx          # Inspetor de variáveis e modelo AST
│   │   ├── Sidebar.tsx             # Formulário dinâmico com grupos e campos
│   │   ├── SidebarToolbar.tsx      # Barra de ferramentas e ações rápidas
│   │   └── XmlEditorModal.tsx      # Modal de edição do código-fonte XML
│   ├── constants/
│   │   └── documentTheme.ts        # Constantes centralizadas de tipografia, cores, bordas e tabelas
│   ├── data/
│   │   └── defaultTemplates.ts     # Catálogo de modelos padrão integrados
│   ├── services/           # Serviços desacoplados de persistência e empacotamento
│   │   ├── filePackageService.ts   # Empacotador/desempacotador ZIP, leitura e download de arquivos
│   │   └── storageService.ts       # Gerenciamento unificado de LocalStorage (preferências e dados)
│   ├── utils/              # Motores de conversão e utilitários
│   │   ├── documentUtils.ts        # Máscaras, filtros e formatações por extenso
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

Campos são agrupados dentro de `<grupo titulo="...">`:

```xml
<formulario>
  <grupo titulo="Identificação das Partes">
    <input id="nome_contratante" label="Nome do Contratante" />
    <input id="cpf_contratante" label="CPF" tipo="cpf" />
    <input id="cep_imovel" label="CEP do Imóvel" tipo="cep" />
    <select id="tipo_pessoa" label="Tipo de Pessoa">
      <option valor="F">Pessoa Física</option>
      <option valor="J">Pessoa Jurídica</option>
    </select>
  </grupo>
</formulario>
```

#### Tipos de Controles Suportados:

| Tag | Atributos Principais | Descrição |
|---|---|---|
| `<input>` | `id`, `label`, `tipo`, `placeholder`, `descricao` | Campo de linha única (`texto`, `email`, `cpf`, `cnpj`, `cep`, `moeda`, `lista_csv`) |
| `<textarea>` | `id`, `label`, `rows` | Texto com múltiplas linhas |
| `<number>` | `id`, `label`, `min`, `max`, `step`, `tipo` | Números inteiros, decimais ou quantitativos |
| `<date>` | `id`, `label` | Seletor nativo de data (formato ISO / BR) |
| `<select>` | `id`, `label` + filhos `<option>` | Caixa de seleção suspensa |
| `<radio>` | `id`, `label` + filhos `<option>` | Grupo de botões de opção exclusivos |
| `<checkbox>` | `id`, `label` | Caixa de seleção booleana (`true`/`false`) |

#### Condicionais no Formulário (`<if>`):
```xml
<grupo titulo="Dados Adicionais">
  <checkbox id="tem_fiador" label="Possui Fiador?" />
  <if expr="tem_fiador == 'true'">
    <input id="nome_fiador" label="Nome do Fiador" />
    <input id="cpf_fiador" label="CPF do Fiador" tipo="cpf" />
  </if>
</grupo>
```

---

### 2. `<conteudo>` (Estrutura do Documento)

O documento suporta interpolação de variáveis e aplicação de filtros via sintaxe `{{campo | filtro}}`:

```xml
<conteudo>
  <titulo>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</titulo>

  <secao titulo="1. DAS PARTES" numerar="true">
    <p>Pelo presente instrumento, <b>{{nome_contratante}}</b>, inscrito no CPF sob o nº {{cpf_contratante | cpf}}...</p>
  </secao>

  <secao titulo="2. DO VALOR E PAGAMENTO" numerar="true">
    <p>O valor total acordado é de <b>R$ {{valor_servico | moeda}}</b> ({{valor_servico | moedaPorExtenso}}).</p>
  </secao>
</conteudo>
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
| `cpfcnpj` | Detecta automaticamente | `123.456.789-00` ou `12.345.678/0001-95` |
| `cep` | `01001000` | `01001-000` |
| `romano` | `14` | `XIV` |

#### Tags Estruturais:

| Tag | Descrição |
|---|---|
| `<titulo>` / `<subtitulo>` | Títulos e subtítulos principais centralizados ou alinhados |
| `<secao titulo="..." numerar="true">` | Seção com suporte a aninhamento e recuo automático de 0,5 cm por nível |
| `<p>` / `<paragrafo>` | Parágrafo com alinhamento justificado e espaçamento ajustado |
| `<b>`, `<i>`, `<u>` | Formatações inline de texto (negrito, itálico e sublinhado) |
| `<lista numerada="true/false">` | Listas ordenadas ou com marcadores |
| `<tabela>` | Tabelas com suporte a `<cabecalho>`, `<linha>` e `<celula>` |
| `<if expr="...">` | Exibição condicional de parágrafos ou blocos inteiros |
| `<foreach var="..." lista="...">` | Repetição dinâmica a partir de listas CSV ou quebras de linha |

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
