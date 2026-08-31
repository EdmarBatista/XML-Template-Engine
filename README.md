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
- 📥 **Arrastar e Soltar (Drag & Drop) e Carregamento Inteligente de Dados**:
  - **Arrastar XML + JSON juntos**: Cria o modelo customizado e armazena o JSON como seu conjunto de dados de exemplo.
  - **Arrastar `.json` isolado**: Preenche imediatamente os dados do formulário ativo.
  - **Arrastar `.xml` isolado**: Importa o novo modelo de documento.
  - **Botão `+` (Dados de Exemplo)**: Modelos que possuem um conjunto de dados de exemplo associado exibem um botão verde `+` no seletor de modelos. Clicar no botão restaura instantaneamente os dados de exemplo pré-configurados para o formulário.
  - **Limpeza Segura do Formulário**: A ação de limpar formulário reseta apenas os dados preenchidos da sessão atual no `localStorage`, preservando o modelo e seu atalho `+` para recarregar dados de exemplo quando desejar.

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

> **Nomenclatura padronizada:** cada conceito de tipo/atributo tem **um único nome canônico** (sem aliases). Ex.: use `number` (não `numero`/`inteiro`/`decimal`), `moeda` (não `dinheiro`), `date` (não `data`), `select` (não `selecao`), `checkbox` (não `booleano`), `textarea` (não `texto_longo`), `texto` (não `text`). O mesmo vale para atributos: `validar` (não `validacao`), `tipo` (não `tag`), `var`/`lista` no `<foreach>` (não `item`/`de`/`items`), e `cor` (não `hex`/`valor`/`value`). Tags de título: `<titulo>` (nível 1) e `<subtitulo>` (nível 2).

| Tag | Atributos Principais | Descrição |
|---|---|---|
| `<input>` | `id`, `label`, `tipo`, `placeholder`, `descricao` | Campo de texto/e-mail/lista (`texto`, `email`, `lista_csv`) |
| `<textarea>` | `id`, `label`, `rows` | Texto com múltiplas linhas |
| `<number>` | `id`, `label`, `tipo`, `min`, `max`, `step` | Campo numérico/mascarado: `tipo="number"`, `moeda`, `cpf`, `cnpj`, `cep` |
| `<date>` | `id`, `label` | Seletor nativo de data (formato ISO / BR) |
| `<select>` | `id`, `label` + filhos `<option>` | Caixa de seleção suspensa |
| `<radio>` | `id`, `label` + filhos `<option>` | Grupo de botões de opção exclusivos |
| `<checkbox>` | `id`, `label` | Caixa de seleção booleana (`true`/`false`) |
| `<tabela>` | `id`, `label` + filhos `<coluna>` | Grade dinâmica de linhas e colunas (adiciona, exclui e reordena linhas) |

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

O documento suporta interpolação de variáveis, aplicação de filtros via sintaxe `{{campo | filtro}}` e **numeração hierárquica automática de seções** (não é necessário prefixar números no título quando `numerar="true"` ou padrão):

```xml
<conteudo>
  <titulo>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</titulo>

  <secao titulo="DAS PARTES" numerar="true">
    <p>Pelo presente instrumento, <b>{{nome_contratante}}</b>, inscrito no CPF sob o nº {{cpf_contratante | cpf}}...</p>
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

> **Nota sobre Numeração:** Ao utilizar `<secao titulo="DO VALOR E PAGAMENTO" numerar="true">` (ou simplesmente sem o atributo, já que a numeração é habilitada por padrão), o motor calcula e renderiza automaticamente o prefixo sequencial (ex.: `1.`, `2.`, `3.`, `3.1.`, etc.). Portanto, **não adicione números manuais** no atributo `titulo`. Para seções que não devem ser numeradas (como blocos de assinaturas ou anexos), use `numerar="false"`.

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
