# Refatoração do `docxToXml` (Conversor DOCX → XML do sistema)

Este documento descreve a refatoração do antigo conversor monolítico
(`src/utils/docxToXmlConverter.ts`, ~1.624 linhas) para uma **pasta de módulos**
em `src/docx/`, com responsabilidades separadas, sem alterar a API pública nem o
comportamento de saída (há prova de byte-paridade no momento da refatoração).

> **Compatibilidade preservada:** a maioria dos consumidores (ex.: `App.tsx`) importa
> via `await import('./utils/docxToXmlConverter')`. Para não quebrar esse caminho,
> o antigo arquivo passou a ser uma **fachada (facade)** que apenas re-exporta a
> função pública do novo módulo orquestrador.

---

## 1. Visão geral da mudança

| Antes (monolítico) | Depois (modular) |
|---|---|
| `src/utils/docxToXmlConverter.ts` (tudo em um arquivo) | `src/docx/` (5 módulos + fachada) |
| Difícil testar e manter | Cada concern isolado com exports públicos testáveis |

A numeração de capítulos **igual ao Word/PDF** (rota B) foi implementada em cima
dessa estrutura: `word.ts` detecta os `numId` que reiniciam a numeração
(`startOverride`), calcula o número exibido real por capítulo e `htmlToXml.ts`
emite o atributo `numero="X"` no `<secao>`; o render honra esse atributo.

---

## 2. Estrutura de pastas

```
D:\EDM\nginxOracle\XML Template Engine\
│
├─ src\
│  ├─ docx\                      ← NOVA pasta (refatorada)
│  │  ├─ types.ts                (tipos compartilhados entre os módulos)
│  │  ├─ domText.ts              (utilidades DOM/texto/XML)
│  │  ├─ word.ts                 (leitura nativa de parts do .docx: estilos, numeração, estrutura, comentários)
│  │  ├─ htmlToXml.ts            (transformação HTML(mammoth)→XML do sistema + JSON inicial + formulários)
│  │  └─ converter.ts            (orquestrador: reunir tudo e produzir o XML final)
│  │
│  └─ utils\
│     └─ docxToXmlConverter.ts   ← fachada de compatibilidade (re-exporta converter.ts)
│
├─ backup_docxToXmlConverter_original.ts  (cópia do monólito original, na raiz)
└─ modelo-de-termo-de-referencia-...-mai-26.docx  (arquivo .docx real usado nos testes)
```

---

## 3. Arquivo por arquivo

### 3.1 `src/docx/types.ts` — Tipos compartilhados

Contém apenas **declarações de tipos/contratos** usadas pelos demais módulos.

| Export | Descrição |
|---|---|
| `NumberingLevelInfo` | Definição de um nível de numeração do `word/numbering.xml` (`numFmt`, `lvlText`, `outlineLvl`, `isBullet`). |
| `DocxStyleInfo` | Estilo de parágrafo/título do `styles.xml`: nível, série `outlineLvl`, numeração associada (`numId`/`ilvl`). |
| `DocxParagraphInfo` | Parágrafo do `document.xml`: texto, nível, flags de heading/subtítulo/lista, numeração resolvida e o novo `exibido?` (número exibido pelo Word por capítulo). |
| `ExtractedComment` | Comentário nativo extraído (`id`, `trecho`, `texto`). |

---

### 3.2 `src/docx/domText.ts` — Utilidades de DOM / texto / XML

Utilidades puras e reutilizáveis de XML/DOM e limpeza de texto. Não dependem dos dados do `.docx`.

| Export | Descrição |
|---|---|
| `getXmlParser()` | Retorna um `DOMParser` disponível (browser/window); compatível com ambiente JS do navegador. |
| `parseHtmlDoc(html)` | Converte HTML em documento DOM (`text/html`) para o pipeline da transformação. |
| `escapeXml(unsafe)` | Escapa caracteres especiais XML/HTML de um texto. |
| `extrairTextoComEspacos(node)` | Extrai o texto de um nó preservando espaços. |
| `limparEspacos(texto)` | Normaliza espaços em branco (colapsa múltiplos). |
| `normalizarIdentificadorValido(texto, fallback)` | Gera um identificador/nome-de-arquivo seguro a partir de um texto. |

---

### 3.3 `src/docx/word.ts` — Leitura nativa das parts do `.docx`

Lê diretamente do `.zip` do `.docx` (via JSZip) as parts relevantes para estrutura,
estilos, numeração e comentários — informações que o Mammoth não fornece.

| Export | Descrição |
|---|---|
| `extrairEstilosDoDocx(zip)` | Lê `word/styles.xml` → `Map<styleId, DocxStyleInfo>` (cabeçalhos, outline, numeração). |
| `extrairNumeracaoDoDocx(zip)` | Lê `word/numbering.xml` → `Map<numId, Map<ilvl, NumberingLevelInfo>>` (definições de lista/numeração). |
| `detectarReiniciosDeNumeracao(zip)` | Lê `word/numbering.xml` e devolve os `numId` que têm `lvlOverride`/`startOverride` — sinal de início/reinício de capítulo (rota B da numeração). |
| `NumberingOverrideInfo` | Tipo de retorno do acima (`reiniciaNumIds: Set<string>`). |
| `extrairEstruturaParagrafosDocx(zip, styles, numbering, reiniciaNumIds?)` | Lê `word/document.xml` → `DocxParagraphInfo[]`; resolve estilo+numeração de cada parágrafo e, no pós-processo, calcula o `exibido` (número real de capítulo) reiniciando nos `reiniciaNumIds`. |
| `extrairComentariosDoZip(zip)` | Lê `word/comments.xml` → `ExtractedComment[]`. |
| `gerarXmlDeComentarios(comentarios)` | Serializa os comentários em XML `<comentarios>` para embeber no modelo. |

---

### 3.4 `src/docx/htmlToXml.ts` — HTML → XML do sistema + JSON inicial + formulários

Recebe o **HTML produzido pelo Mammoth** (+ a estrutura nativa do Word) e o converte
na sintaxe XML própria do editor (`<documento>`, `<conteudo>`, `<secao>`, `<p>`,
`<subtitulo>`, listas, formulários/tabelas etc.). Também gera o **JSON de
preenchimento inicial** dos campos.

| Export | Descrição |
|---|---|
| `coletarItensDeLista(rootEl)` | Coleta os `<li>` de `ul/ol` recursivamente, com `depth` e flag ordenado. |
| `transformarHtmlParaEstruturaXml(html, nomeArquivo, docxParagraphs?)` | Função central: percorre os blocos do HTML e emite o XML do sistema e o `jsonInicial`. É aqui que o atributo `numero="X"` (número Word por capítulo) é colocado no `<secao>` e que parágrafos não-numerados no Word (ex.: `numId="0"`) saem **sem** `nivel`. |

**Helpers internos (não exportados) de destaque:**
- `processText(text)` — limpa/normaliza texto de um bloco.
- `serializeInner(node)` — serializa descendentes de um nó em XML com escape.
- `extrairInfoCabecalho(el, isFirstBlock)` — detecta se o bloco é cabeçalho/título/autor e seu nível.
- `closeSectionsDownTo(level)` / `closeAllSections()` — fecham tags `<secao>` conforme aninhamento.
- `capsNormalize(s)` / `numeroDeCapitulo(titulo)` — casam o título do capítulo ao documento real para injetar `numero="X"`.

---

### 3.5 `src/docx/converter.ts` — Orquestrador (entrada pública)

Reúne todos os módulos e devolve o XML final. É a única função pública exportada do pipeline.

| Export | Descrição |
|---|---|
| `converterDocxParaModeloXml(file)` | `File` (`.docx`) → `{ xml, jsonInicial, comentariosXml, nomeSugerido }`. Executa, em ordem: abrir zip → extrair comentários→estilos→numeração→reinícios→estrutura de parágrafos → montar `dynamicStyleMap` do Mammoth → `mammoth.convertToHtml` → `transformarHtmlParaEstruturaXml` → embeber comentários no XML final. |

---

### 3.6 `src/utils/docxToXmlConverter.ts` — Fachada de compatibilidade

```ts
export { converterDocxParaModeloXml } from '../docx/converter';
```

Mantém estável o caminho de import utilizado pelos consumidores (ex.: `App.tsx`).
Não contém lógica — apenas reexporta.

---

## 4. Como o fluxo se encaixa

```
.docx (File)
   │  file.arrayBuffer()
   ▼
converter.ts  ◄── importa ──  word.ts + domText.ts + htmlToXml.ts + types.ts
   │  1. JSZip.open → extrair comments (extrairComentariosDoZip)
   │  2. extrairEstilosDoDocx / extrairNumeracaoDoDocx / detectarReiniciosDeNumeracao
   │  3. extrairEstruturaParagrafosDocx(paras nativos + exibido por capítulo)
   │  4. monta dynamicStyleMap do Mammoth
   │  5. mammoth.convertToHtml
   ▼
htmlToXml.ts
   │  percorre blocos; emite <secao numero=…>, <p nivel=…>, listas, formulários;
   │  NÃO numera quem o Word não numera (numId="0")
   ▼
XML do sistema (+ jsonInicial)
   │
   ▼
render (DocumentSectionNode / DocumentParagraphNode) — honra numero= e nivel= ...
```

---

## 5. Notas de comportamento preservado/novo (resumo)

- **Byte-paridade** da conversão preservada na refatoração (o split foi validado por
  spans do compilador TS e conferido gerando o mesmo XML).
- **Numeração de capítulos** agora segue o Word/PDF, com marcação de reinício
  (`startOverride`) e atributo `numero="X"` no `<secao>` (rota B).
- **Parágrafos sem numeração no Word** (ex.: `numId="0"`) saem sem `nivel`, para não
  exibirem prefixo `X.Y` (ex.: o rodapé de assinatura `[Local], [dia]...` não vira `12.2`).
- **Níveis multinível legítimos** (ex.: `Nivel3` → `ilvl=2`) continuam virando `nivel="3"`
  e recebendo número `X.Y.Z`, como o Word/PDF mostra (ex.: `4.1.36`).
