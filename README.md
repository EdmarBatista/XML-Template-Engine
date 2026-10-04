# XML Template Engine · Editor e Gerador de Documentos

O **XML Template Engine** é uma plataforma para **criação, edição, preenchimento e geração automatizada de documentos estruturados**, baseada em templates XML.

A ideia central é separar a **estrutura do documento** dos **dados que serão preenchidos**. Em vez de editar manualmente documentos extensos, o usuário cria ou utiliza um template que define os campos, regras, condições, listas, tabelas, seções e formatação do documento. O sistema transforma esse template em uma interface de preenchimento e, simultaneamente, monta o documento final em uma prévia visual.

### O que o sistema faz?

O sistema permite criar **modelos de documentos inteligentes**, nos quais o conteúdo pode mudar automaticamente de acordo com os dados informados pelo usuário.

Um mesmo template pode, por exemplo:

* solicitar informações por meio de formulários;
* utilizar variáveis dentro do texto;
* formatar automaticamente valores, datas, CPF, CNPJ, CEP e telefone;
* exibir ou ocultar trechos do documento conforme determinadas condições;
* repetir blocos de conteúdo para listas de dados;
* criar listas com marcadores ou numeração;
* criar tabelas preenchíveis com múltiplas linhas;
* gerar numeração hierárquica automática de seções;
* utilizar formatação de texto, como **negrito, itálico, sublinhado, tachado, marca-texto, cores e links**;
* atualizar a visualização do documento em tempo real conforme os dados são preenchidos;
* importar documentos Word existentes e transformá-los em templates XML;
* exportar o documento preenchido para **Microsoft Word (.docx)** e **PDF**.

### O que é possível criar?

A estrutura foi pensada para documentos que possuem um **modelo relativamente padronizado**, mas cujos dados e partes do conteúdo variam a cada utilização.

Entre os exemplos de aplicação estão:

* **Termos de Referência (TR);**
* **Estudos Técnicos Preliminares (ETP);**
* editais e documentos de contratação;
* contratos e termos aditivos;
* convênios e instrumentos administrativos;
* relatórios técnicos;
* pareceres e documentos administrativos;
* laudos;
* formulários que precisam gerar documentos automaticamente;
* documentos jurídicos padronizados;
* propostas comerciais;
* orçamentos;
* outros documentos estruturados que possam ser representados por um template.

### Como funciona?

O documento é construído a partir de um XML dividido principalmente em duas partes:

```xml
<documento>
  <formulario>
    <!-- Campos que o usuário deverá preencher -->
  </formulario>

  <conteudo>
    <!-- Estrutura e conteúdo do documento -->
  </conteudo>
</documento>
```

O bloco `<formulario>` define **quais informações devem ser fornecidas**.

O bloco `<conteudo>` define **como essas informações serão utilizadas no documento**.

Por exemplo:

```xml
<formulario>
  <grupo titulo="Dados do Contrato">
    <input
      id="contratado"
      label="Nome do Contratado"
    />

    <number
      id="valor"
      label="Valor do Contrato"
      tipo="moeda"
    />
  </grupo>
</formulario>

<conteudo>
  <p>
    O contrato será celebrado com
    <b>{{contratado}}</b>,
    pelo valor de
    <b>{{valor | moeda}}</b>.
  </p>
</conteudo>
```

Ao preencher o formulário, o documento é atualizado automaticamente:

> O contrato será celebrado com **Empresa Exemplo**, pelo valor de **R$ 150.000,00**.

### Templates com lógica

O XML não precisa ser apenas um documento estático. O template pode conter **regras de negócio e lógica de apresentação**.

É possível, por exemplo, mostrar determinado conteúdo somente quando uma condição for verdadeira:

```xml
<if expr="tipo_contratacao == 'dispensa'">
  <p>
    A contratação será realizada por dispensa de licitação.
  </p>
</if>
```

Também é possível repetir conteúdo para cada registro de uma lista:

```xml
<foreach lista="itens" var="item">
  <p>
    {{item.descricao}} -
    {{item.valor | moeda}}
  </p>
</foreach>
```

Isso permite construir documentos cujo conteúdo é **dinâmico**, sem precisar criar manualmente cada parágrafo, item ou linha.

### Formulários dinâmicos

O template pode definir diferentes tipos de campos, incluindo:

* texto;
* texto multilinha;
* números;
* valores monetários;
* datas;
* CPF;
* CNPJ;
* CEP;
* telefone;
* e-mail;
* listas de opções;
* seleção única;
* caixas de seleção;
* tabelas com múltiplas linhas.

Alguns campos também possuem **máscaras, validação e consultas automáticas**, reduzindo a necessidade de tratamento manual dos dados.

### Editor XML integrado

O sistema também funciona como um **editor de templates XML**.

O usuário pode editar diretamente o código do modelo utilizando um editor com:

* destaque de sintaxe;
* numeração de linhas;
* autocompletar;
* sugestões de tags e atributos;
* sugestões de variáveis;
* validação da estrutura XML;
* identificação visual de tags inválidas;
* visualização imediata do resultado.

Dessa forma, o XML funciona como uma espécie de **linguagem de marcação própria para construção de documentos**, enquanto o sistema interpreta essa estrutura e a transforma em um documento visual.

### Edição visual do documento

Além da edição do XML, o sistema permite trabalhar diretamente com o documento renderizado.

A prévia pode ser visualizada em:

* **modo A4**, simulando a página física do documento;
* **modo fluido**, para leitura contínua;
* diferentes níveis de zoom.

O documento é atualizado conforme o usuário altera os dados do formulário, permitindo verificar o resultado antes da geração do arquivo final.

### Importação de documentos Word

Documentos existentes também podem ser utilizados como ponto de partida.

Um arquivo **`.docx`** pode ser importado e convertido para a estrutura XML do sistema, preservando elementos como:

* títulos;
* subtítulos;
* parágrafos;
* listas;
* tabelas;
* hierarquia de tópicos;
* formatação estrutural.

Além disso, variáveis inseridas no documento Word podem ser identificadas pelo sistema e utilizadas para construir automaticamente os campos correspondentes no formulário.

Isso permite transformar um documento Word tradicional em um **template reutilizável e preenchível** sem precisar reconstruí-lo inteiramente do zero.

### Do template ao documento final

O fluxo básico do sistema é:

```text
TEMPLATE XML
     ↓
Interpretação do modelo
     ↓
Formulário dinâmico
     ↓
Preenchimento dos dados
     ↓
Processamento de variáveis e regras
     ↓
Renderização do documento
     ↓
┌───────────────┬───────────────┐
│               │               │
DOCX            PDF          JSON/ZIP
```

O resultado pode ser exportado para **Microsoft Word**, **PDF** ou salvo como dados para reutilização posterior.

### Em resumo

O XML Template Engine transforma um documento padronizado em um **modelo inteligente e reutilizável**.

Em vez de criar manualmente cada documento, você define uma única vez:

**estrutura + campos + regras + formatação + lógica**

e o sistema utiliza essa definição para produzir diferentes documentos a partir dos dados fornecidos pelo usuário.

Isso torna a ferramenta especialmente útil para processos em que existe uma grande quantidade de documentos semelhantes, mas com informações, tabelas, cláusulas e trechos que precisam variar de acordo com cada situação.

---

## 🚀 Principais Recursos

- ⚡ **Renderização e Atualização em Tempo Real**: Conforme os campos do formulário são preenchidos, o documento é atualizado instantaneamente na visualização lateral.
- 📄 **Exportação Multiformato de Alta Fidelidade**:
  - **Microsoft Word (.docx)**: Geração nativa via `docx` a partir do DOM renderizado, com suporte a estilos, tabelas com quebra de página inteligente (`cantSplit`), repetição de cabeçalho (`tableHeader`), preenchimento suave (`#E2E8F0`), recuos de lista, numeração automática e destaque opcional de variáveis.
  - **Exportação Nativa para PDF (.pdf)**: Geração nativa com `pdfmake` a partir do DOM renderizado, preservando a estrutura tipográfica, alinhamento, larguras automáticas de colunas, células com repetição de cabeçalho entre páginas (`headerRows: 1`) e recuo progressivo de 0,5 cm por nível de seção.
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
  - Consulta automática de CEP via **ViaCEP** e CNPJ via **OpenCNPJ** (`api.opencnpj.org`).
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
| | `<subtitulo>` | `nivel="1\|2\|3\|..."`, `alinhamento="centro\|esquerda\|direita"` | Subtítulo ou cabeçalho temático de tópico com preservação de nível de tópicos (`outlineLevel`). Padrão: nível 2. |
| **Seções** | `<secao>` | `titulo="..."`, `numerar="true\|false"`, `reiniciar="true\|false"` | Seção com aninhamento ilimitado, numeração sequencial (1., 1.1, 1.1.1...) e recuo progressivo de 0,5 cm por nível. |
| **Parágrafos** | `<p>` | `alinhamento="justificar\|esquerda\|centro\|direita"` | Bloco de parágrafo puro de texto (sem atributos de nível ou estado de numeração), com formatação inline e quebra inteligente. |
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

#### Preservação da Estrutura de Tópicos (Outline Levels) no Word

O motor implementa preservação total da hierarquia de tópicos (*Outline Levels*):
1. **Extração Nativa OpenXML**: Lê o atributo `w:outlineLvl` de estilos e parágrafos do DOCX, percorrendo recursivamente a cadeia de herança de estilos (`w:basedOn`).
2. **Representação Semântica em XML**:
   - Títulos de capítulos numerados geram `<secao titulo="...">`.
   - Subtítulos e títulos de tópicos não numerados (`numId="0"`) geram `<subtitulo nivel="X" alinhamento="...">` (ex.: `<subtitulo nivel="2" alinhamento="esquerda">Especificação da garantia do serviço</subtitulo>`), onde `nivel="2"` corresponde ao Nível 2 do Word.
   - Parágrafos de texto permanecem sempre limpos como `<p>...</p>`, sem atributos indevidos.
3. **Fidelidade no Painel de Navegação do Word**: Na exportação para Word (.docx), os nós de `<subtitulo>` e `<secao>` recebem `heading: HeadingLevel.HEADING_X` e `outlineLevel: X - 1`, garantindo que no arquivo DOCX gerado toda a estrutura de tópicos seja visível no **Painel de Navegação do Microsoft Word** (*Navigation Pane*), sem nunca regredir para corpo de texto comum (*Normal / Body Text*).

### 3. Flexibilidade de Modelos e Particionamento

- **XML com apenas `<formulario>`**: Carrega todos os campos no painel lateral; o visualizador central exibe aviso claro de que o modelo não possui `<conteudo>`.
- **XML com apenas `<conteudo>`**: Renderiza o texto e estrutura no visualizador; o painel lateral exibe aviso informativo de que não há campos no documento.
- **XML Vazio**: Inicializa graciosamente sem erros, permitindo edição imediata no modal de XML (`Ctrl + S`).
- **Arquivos Particionados (`[1]`, `[01]`)**:
  - Arquivos nomeados com índice no final (ex.: `Minuta [1].xml`, `Minuta [2].xml` ou `Contrato [01].xml`, `Contrato [02].xml`) são automaticamente ordenados e concatenados em um único documento unificado.
  - Arquivos sem o padrão de colchetes numéricos no final são tratados como documentos independentes e não sofrem fusão acidental.

> **Nota sobre Numeração:** Ao utilizar `<secao titulo="DO VALOR E PAGAMENTO" numerar="true">` (ou simplesmente sem o atributo, já que a numeração é habilitada por padrão), o motor calcula e renderiza automaticamente o prefixo sequencial (ex.: `1.`, `2.`, `3.`, `3.1.`, etc.). Portanto, **não adicione números manuais** no atributo `titulo`. Para seções que não devem ser numeradas (como blocos de assinaturas ou anexos), use `numerar="false"`.

### 4. Sistema de Numeração Hierárquica Multinível (Níveis 1 a 8)

O motor conta com um algoritmo avançado de numeração hierárquica contínua que suporta até **8 níveis de profundidade** através do aninhamento estruturado de `<secao>` e cabeçalhos com `<subtitulo nivel="X">`.

#### Diretrizes Estritas de Parágrafos Limpos e Numeração Pura:
- **Parágrafos Limpos (Regra 1)**: As tags `<p>` são sempre puras (`<p>Conteúdo...</p>`), sem atributos de formatação ou estado como `nivel="..."` ou `numerado="false"`. O uso de atributos em `<p>` é estritamente banido.
- **Hierarquia Estrutural**: A contagem multinível é calculada dinamicamente pelo motor através do aninhamento de `<secao>` (1., 1.1., 1.1.1., etc.) ou de subtítulos com `<subtitulo nivel="X">` para tópicos do Word (`outlineLevel`).
- **Elementos Especiais em `<secao numerar="false">` (Regra 7)**: Conectivos (ex.: "OU"), fórmulas matemáticas e notas explicativas não-numeradas devem ser encapsulados em `<secao numerar="false">` para não receberem numeração e não interromperem a contagem hierárquica dos blocos numerados subsequentes.
- **Numeração Hierárquica Pura**: Nenhuma tag `<secao>` deve emitir `numero="..."`. A numeração em tela é calculada dinamicamente pelo renderizador em tempo real e nas exportações (Word e PDF).

#### Tabela de Níveis e Exemplos:

| Nível | Identificação | Exemplo de Saída | Tag XML Típica | Recuo no Word/PDF |
|:---:|:---|:---|:---|:---:|
| **1** | Seção Primária | `1.` ou `2.` | `<secao titulo="...">` | 0,0 cm (margem) |
| **2** | Seção / Item Secundário | `1.1.` | `<secao>` filha (nível 2) ou `<subtitulo nivel="2">` | 0,5 cm |
| **3** | Subitem Terciário | `1.1.1.` | `<secao>` neta (nível 3) ou `<subtitulo nivel="3">` | 1,0 cm |
| **4** | Subitem Quaternário | `1.1.1.1.` | `<secao>` aninhada (nível 4) ou `<subtitulo nivel="4">` | 1,5 cm |
| **5** | Subitem Quinário | `1.1.1.1.1.` | `<secao>` aninhada (nível 5) ou `<subtitulo nivel="5">` | 2,0 cm |
| **6** | Subitem Senário | `1.1.1.1.1.1.` | `<secao>` aninhada (nível 6) ou `<subtitulo nivel="6">` | 2,5 cm |
| **7** | Subitem Septenário | `1.1.1.1.1.1.1.` | `<secao>` aninhada (nível 7) ou `<subtitulo nivel="7">` | 3,0 cm |
| **8** | Subitem Octonário | `1.1.1.1.1.1.1.1.` | `<secao>` aninhada (nível 8) ou `<subtitulo nivel="8">` | 3,5 cm |

#### Como Funciona a Lógica:
1. **É recursivo?**
   - **Sim, na propagação de contexto estrutural da árvore AST**: cada `<secao>` aninhada gera um `subContexto` isolado derivado do prefixo do nó pai (`subPrefix`), propagando a numeração para todos os seus nós filhos sem risco de colisão entre capítulos distintos.
   - **Iterativo e dinâmico no estado de contadores**: internamente, a contagem utiliza um mapa indexado (`levelCounters: Record<number, number>`) e um mapa de prefixos acumulados (`levelNumbers: Record<number, string>`). Isso evita chamadas recursivas profundas em lote e elimina qualquer risco de estouro de pilha (*stack overflow*).
2. **Síntese Automática de Níveis Intermediários (Saltos de Nível)**:
   - Se o documento estruturar uma seção de Nível 2 (`1.1.`) e, em seguida, um nó saltar diretamente para o Nível 4, o motor detecta a ausência do Nível 3 e sintetiza automaticamente o ramo intermediário como `1.1.1.1.`, registrando os contadores corretos.
3. **Reinicialização Automática de Subcontadores**:
   - Ao avançar ou retornar para um nível superior (por exemplo, de uma subseção `1.1.2.1.` para outra subseção de nível 2), todos os contadores dos níveis inferiores (> 2) são automaticamente reiniciados para `1`, e suas referências em cache são apagadas, garantindo que o próximo subitem reinicie em `1.2.1.` e não com numeração residual.
4. **O que Limita a Quantidade de Níveis (Por que até 8)?**
   - **Largura Física da Folha A4 e Legibilidade**: A folha A4 possui 21,0 cm de largura. Com margens padrão de 2,0 cm em cada lado, a área útil de impressão é de 17,0 cm. Como cada nível hierárquico aplica um recuo progressivo de 0,5 cm (`(nivel - 1) * 0.5 cm`), no Nível 8 o recuo atinge **3,5 cm**, restando 13,5 cm para o texto. Níveis acima de 8 esmagariam tabelas, listas e blocos de texto no canto direito da página.
   - **Compatibilidade com o Padrão Microsoft Word (OOXML)**: O padrão internacional OpenXML do Word define em sua especificação de listas multiníveis (`w:numPr`) um limite de 9 níveis (`ilvl 0` a `ilvl 8`). A adoção de até 8 níveis garante aderência total sem distorções no Word nativo (`.docx`) e no gerador PDF (`pdfmake`).
   - **Normas Técnicas (ABNT NBR 6024)**: Recomenda a numeração progressiva de seções até no máximo o 5º nível (seção quinária). O suporte a 8 níveis ultrapassa com folga as exigências mais complexas de editais, termos de referência e contratos públicos.
5. **Integração com Importação de Word (.docx)**:
   - Ao arrastar ou importar um arquivo `.docx`, o conversor nativo OpenXML analisa estilos, numerações multiníveis e tópicos (`Heading 1` a `Heading 8` / `Nivel 01` a `Nivel 08`), mapeando-os semanticamente para `<secao>` aninhadas e mantendo os parágrafos de texto internos estritamente como `<p>` puros.

6. **Variáveis Multilinha e Numeração Sequencial**:
   - Campos de texto com múltiplas linhas (`textarea`) respeitam a numeração do bloco onde estão contidas. Quando uma variável multilinha exibe texto em várias linhas, cada linha preenchida consome sequencialmente um subnível adicional da hierarquia sem quebrar a continuidade do documento (tanto na visualização web quanto na exportação Word e PDF). Linhas em branco não consomem numeração, preservando apenas o espaçamento vertical.

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
| `moedaPorExtenso` | `1500.50` | `mil e quinhentos reais e cinquenta centavos` |
| `numeroPorExtenso` | `42` | `quarenta e dois` |
| `data` | `2026-08-25` | `25/08/2026` |
| `dataPorExtenso` | `2026-08-25` | `25 de agosto de 2026` |
| `cpf` | `12345678900` | `123.456.789-00` |
| `cnpj` | `12345678000195` | `12.345.678/0001-95` |
| `cep` | `01001000` | `01001-000` |
| `telefone` | `11987654321` | `(11) 98765-4321` |
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

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Framework & UI** | React 19, TypeScript 7, Vite 8, Tailwind CSS v4 |
| **Ícones** | Lucide React |
| **Editor de Código** | CodeMirror 6 (`@uiw/react-codemirror`, `@codemirror/lang-xml`, `@codemirror/lang-json`) |
| **Geração e Conversão de Documentos** | `docx` 9.8.1 (Word), `pdfmake` 0.3.11 (PDF), `jszip` 3.10.2 (leitura Nativa DOCX -> XML e pacotes ZIP) — mesmas versões fixadas nas tags de CDN do `index.html` |
| **Parsing & AST** | Parser XML customizado para árvore sintática intermediária (AST) |
| **Testes** | Vitest 5 + Testing Library (jsdom) na suíte unitária; Puppeteer 25 e `pdfjs-dist` na bancada de aceitação |

---

## 📂 Estrutura do Projeto

```
/
├── src/
│   ├── components/         # Componentes da interface
│   │   ├── CodeMirrorEditor.tsx    # Wrapper reutilizável do CodeMirror
│   │   ├── DocumentViewer.tsx      # Visualizador de documento com suporte A4/Fluido
│   │   ├── DocumentViewer/         # Renderizadores modulares do documento (AST, blocos, inline, lógica)
│   │   │   ├── DocumentA4Canvas.tsx        # Canvas e container de página física A4 e modo fluido
│   │   │   ├── DocumentNodeRenderer.tsx    # Orquestrador raiz e ponto de entrada da AST
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
│   │   │       └── DocumentConditionalNode.tsx # Avaliação interativa de <if expr="...">
│   │   ├── ImportWordModal.tsx     # Modal de confirmação e conversão de arquivos Word (.docx)
│   │   ├── ModelModal.tsx          # Inspetor de variáveis e modelo AST
│   │   ├── ModelModal/             # Componentes modulares do modal de modelo
│   │   │   └── VarsTabs.tsx                # Abas de Variáveis (edição + resumo)
│   │   ├── Sidebar.tsx             # Orquestrador da barra lateral e formulário dinâmico
│   │   ├── Sidebar/                # Componentes modulares da barra lateral
│   │   │   ├── SidebarHeader.tsx       # Cabeçalho da barra lateral e busca
│   │   │   ├── SidebarGroupAccordion.tsx # Grupos colapsáveis em acordeão
│   │   │   └── fields/                 # Inputs especializados (Number, Date, Text, Choice, Select, Table, TextArea)
│   │   │       ├── ChoiceFieldInput.tsx
│   │   │       ├── DateFieldInput.tsx
│   │   │       ├── NumberFieldInput.tsx
│   │   │       ├── SelectFieldInput.tsx
│   │   │       ├── TableFieldInput.tsx
│   │   │       ├── TextAreaFieldInput.tsx
│   │   │       └── TextFieldInput.tsx
│   │   ├── SidebarToolbar.tsx      # Barra de ferramentas e ações rápidas
│   │   └── TemplateSelector.tsx    # Seletor de templates (customizados/prontos)
│   ├── docx/                       # Motor modular de conversão direta DOCX (OpenXML) -> Modelo XML
│   │   ├── converter.ts            # Ponto de entrada do conversor (converterDocxParaModeloXml)
│   │   ├── ast.ts                  # Tipos e estruturas da AST nativa DOCX
│   │   ├── document.ts             # Parser semântico de blocos do word/document.xml
│   │   ├── numbering.ts            # Parser de numerações multinível do word/numbering.xml
│   │   ├── styles.ts               # Parser de estilos e heranças do word/styles.xml
│   │   ├── generator.ts            # Gerador de XML e JSON a partir da AST DOCX
│   │   ├── word.ts                 # Extração de comentários (word/comments.xml) e metadados
│   │   ├── domText.ts              # Utilitários de texto e nós do DOM
│   │   └── types.ts                # Definições de tipos do pipeline DOCX
│   ├── hooks/                      # Hooks de estado extraídos do App
│   │   ├── usePreferencias.ts      # Preferências de interface + persistência
│   │   ├── useCamposFoco.ts        # Foco/destaque bidirecional documento↔sidebar
│   │   └── useToast.ts             # Toast simples
│   ├── hooks_App/                  # Hooks orquestradores de alto nível do App.tsx
│   │   ├── index.ts                # Barrel de exportação de hooks_App
│   │   ├── useDocumentEngine.ts    # Orquestração do template XML, AST e sincronização de dados
│   │   ├── useDocumentExporters.ts # Camada unificada de exportações (Word, PDF, JSON, ZIP)
│   │   ├── useFilePackageActions.ts# Ações de upload/download de pacotes de arquivo
│   │   ├── useFormHistory.ts       # Histórico de desfazer/refazer (Undo/Redo)
│   │   ├── useKeyboardShortcuts.ts # Gerenciador de atalhos de teclado globais
│   │   ├── useModalsManager.ts     # Gerenciamento de estado dos modais
│   │   └── useSidebarResizer.ts    # Redimensionamento dinâmico da barra lateral
│   ├── constants/
│   │   └── documentTheme.ts        # Constantes centralizadas de tipografia, cores, bordas e tabelas
│   ├── data/
│   │   ├── defaultTemplates.ts     # Catálogo de modelos padrão (barrel)
│   │   └── templates/              # Modelos padrão (bateriaTestes, catalogoCompletoTags, contratoServicos, exemploParticionado, termoReferencia)
│   ├── services/                   # Serviços desacoplados de persistência, empacotamento e API externa
│   │   ├── apiService.ts           # Consultas CNPJ/CEP com cache/debounce
│   │   ├── useCnpjCepLookup.ts     # Hook que consome apiService (loading/data/error)
│   │   ├── filePackageService.ts   # Empacotador/desempacotador ZIP, leitura e download de arquivos
│   │   └── storageService.ts       # Gerenciamento unificado de LocalStorage (preferências e dados)
│   ├── utils/                      # Motores de conversão e utilitários
│   │   ├── documentUtils.ts        # Barrel de formatacao/mascaras/validacao/listas/caminhos
│   │   ├── formatacao.ts           # Moeda, datas, números por extenso, romano
│   │   ├── mascaras.ts             # Máscaras de CPF/CNPJ/CEP/moeda e filtros de documento
│   │   ├── validacao.ts            # Validações (email/CPF/CNPJ/CEP) e validarCampo
│   │   ├── listas.ts               # CSV/foreach (formatarItemForeach, valoresDaLista)
│   │   ├── caminhos.ts             # obterValorPorCaminho e obterTipoEfetivoColuna
│   │   ├── colunasTabela.ts        # Rótulo genérico e id de coluna derivado do rótulo
│   │   ├── paragraphs.ts           # Quebra de parágrafos por \n / <br>
│   │   ├── numbering.ts            # Contexto e cálculo hierárquico puro de numeração de seções
│   │   ├── domDocumentExtractor.ts # Extrator semântico DOM para Word e PDF
│   │   ├── expressionEvaluator.ts  # Avaliador de expressões lógicas (<if expr="...">)
│   │   ├── erros.ts                # Extração segura da mensagem de erro (unknown -> texto)
│   │   ├── pdfExporter.ts          # Exportador nativo para PDF (via DOM)
│   │   ├── wordExporter.ts         # Exportador para Microsoft Word (via DOM) (.docx)
│   │   ├── wordDom.ts              # Contrato dos atributos data-word-* entre renderizador e exportadores
│   │   ├── xmlParser.ts            # Parser XML -> Modelo Intermediário (AST)
│   │   ├── xmlFormatter.ts         # Formatador e embelezador de XML
│   │   ├── xmlLinter.ts            # Linter em tempo real para validação e alertas de tags inválidas
│   │   └── xmlEditorCompletions.ts # Autocomplete inteligente de tags, atributos e variáveis
│   ├── types.ts                    # Definições de tipos TypeScript
│   ├── vite-env.d.ts               # Tipos de ambiente do Vite (import.meta.env)
│   ├── App.tsx                     # Componente raiz e gerenciador de estado
│   ├── main.tsx                    # Ponto de entrada da aplicação React
│   └── index.css                   # Estilos globais Tailwind CSS
├── index.html                      # HTML principal da aplicação
├── package.json                    # Dependências e scripts npm
├── tsconfig.json                   # Configurações do compilador TypeScript
├── vite.config.ts                  # Configuração do Vite e plugins
├── vitest.config.ts                # Configuração do Vitest (suíte unitária)
├── zip_standalone.js               # Empacota o build em app_standalone.html e .zip
├── teste/                          # Bancada de aceitação ponta a ponta e baselines de comparação
├── .github/workflows/              # CI: deploy no GitHub Pages e aceitação manual
└── AGENTS.md                       # Regras e diretrizes do projeto para agentes de IA
```

> Os testes unitários ficam ao lado do código (`*.test.ts`, `*.test.tsx`) e, por isso, não aparecem na árvore acima.

---

## 💻 Desenvolvimento e Execução

### Pré-requisitos
- **Node.js** 20.19 ou superior (ou 22.12+) — versão mínima exigida pelo Vite 8
- Gerenciador de pacotes **npm**

### Comandos Principais

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (Vite)
npm run dev

# Validar TypeScript / Linter
npm run lint

# Rodar a suíte de testes unitários (Vitest)
npm test

# Gerar build de produção otimizado
npm run build

# Visualizar build localmente
npm run preview
```

---

## 🧪 Testes e Verificação Contínua

### Suíte unitária (Vitest)

Os testes ficam ao lado do código (`*.test.ts` / `*.test.tsx`) e cobrem os motores de conversão, formatação e numeração, os serviços e os componentes principais.

```bash
# Rodar a suíte completa
npm test

# Rodar um arquivo específico
npx vitest run src/utils/formatacao.test.ts
```

### Bancada de aceitação ponta a ponta (`teste/`)

Converte o `.docx` de referência, sobe a aplicação, renderiza no Chrome (Puppeteer) e grava os artefatos de comparação na própria pasta `teste/`.

```bash
# 1. Em um terminal, suba a aplicação
npm run dev

# 2. Em outro, rode a bancada (padrão: http://127.0.0.1:3000)
npx tsx teste/gerar.js

# Para apontar para outro endereço, sobrescreva com APP_URL:
APP_URL=http://192.168.0.10:3000 npx tsx teste/gerar.js

# 3. Conferências
node teste/conferir_amostragem.js      # 15 amostras numeradas vs. teste/pdf_texto.txt
npx tsx teste/conferir_exportacoes.js  # paridade: tela x Word (arrastado e gerado) x PDF
```

> O padrão da bancada é `127.0.0.1` (IPv4 literal), e não `localhost`: o nome `localhost` resolve para `::1` antes de `127.0.0.1` (ordem `verbatim` do Node), enquanto o Vite escuta apenas em IPv4 — com `localhost`, outra aplicação na mesma porta em IPv6 responderia no lugar da sua.

> No PowerShell, a variável de ambiente é definida em linha própria: `$env:APP_URL='http://192.168.0.10:3000'; npx tsx teste/gerar.js`

Artefatos gravados em `teste/`: `output.xml`, `output_json.json`, `output_puppeteer.txt` e `output_puppeteer.html`. Junto com `pdf_texto.txt`, formam as **baselines de referência** versionadas — servem para comparar, não para sobrescrever sem intenção.

### Integração contínua (GitHub Actions)

| Workflow | Gatilho | O que executa |
|---|---|---|
| `.github/workflows/deploy.yml` | push em `main` / `master` | `npm run lint` + `npm test` + `npm run build` e publica o `dist` no GitHub Pages |
| `.github/workflows/aceitacao.yml` | manual (`workflow_dispatch`) | a bancada completa (`teste/gerar.js`) e a validação do contrato do XML: nenhum `<p>` com atributo, nenhuma `<secao>` com `numero=`, além dos limiares mínimos de linhas e seções |

---

## 📦 Distribuição

O deploy oficial roda no **GitHub Pages**, publicado pelo workflow `deploy.yml` a partir do conteúdo de `dist/`:

```text
https://edmarbatista.github.io/XML-Template-Engine/
```

### Arquivo único (`app_standalone`)

O `npm run build` encadeia `tsc -b`, o build do Vite (`vite-plugin-singlefile`) e o `zip_standalone.js`, produzindo um HTML autônomo — JS, CSS e ícones embutidos no próprio arquivo — para uso sem servidor:

| Arquivo | Tamanho aprox. | Uso |
|---|---|---|
| `app_standalone.html` | ~1,1 MB | abrir direto no navegador |
| `app_standalone.zip` | ~317 KB | mesma página, compactada para envio |

Ambos são artefatos de build e não são versionados (constam no `.gitignore`).

### Dependência de rede (importante)

Três bibliotecas de exportação são carregadas por **CDN** no `index.html`, e não pelo bundle:

| Biblioteca | Papel | CDN |
|---|---|---|
| `pdfmake` 0.3.11 + `vfs_fonts` | exportar PDF | jsdelivr |
| `docx` 9.8.1 | exportar e importar Word | unpkg |
| `jszip` 3.10.2 | pacotes `.zip` e leitura de `.docx` | cdnjs |

No `vite.config.ts` elas são marcadas como externas (`external: ['docx', 'jszip']` + `rollup-plugin-external-globals`; o `pdfmake` é lido de `window.pdfMake`). Isso mantém o arquivo único em ~1,1 MB — com elas embutidas no bundle, ele passaria de 3 MB.

Consequência prática: **exportar Word/PDF e importar `.docx`/`.zip` exigem internet**. Sem rede, a aplicação abre, edita e visualiza normalmente; apenas essas operações falham. As consultas de CEP/CNPJ (ViaCEP, OpenCNPJ) e as fontes do Google também são online por natureza.

Para uso 100% offline, é preciso remover as tags `<script>` do CDN no `index.html` e o `externalGlobals` do `vite.config.ts`, aceitando o aumento do arquivo final.

---

## 📄 Licença

Projeto distribuído sob a licença **MIT**.
