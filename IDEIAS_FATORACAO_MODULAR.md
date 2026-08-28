# Distribuição de funções entre arquivos — versão antiga vs. atual (sugestões de modularização)

Este documento compara como a versão antiga (monólito + módulos `js/`) distribuía as responsabilidades
entre arquivos e como o projeto atual (`src/**` React + TypeScript) distribui hoje, e sugere melhorias
de divisão de atribuições.

---

## 1. Mapa de responsabilidades

### Versão antiga (`funcoes-documento.js` + `funcoes-word.js` + `js/`)
| Arquivo | Responsabilidade | Linhas |
|---|---|---|
| `funcoes-documento.js` | Máscaras/formatações (moeda, CPF, CNPJ, CEP) + parse XML | 1374 |
| `funcoes-word.js` | Exportador Word (.docx) + parâmetros | 2607 |
| `js/avaliador/expressoes.js` | Avaliação de expressões `<if>` | 47 |
| `js/avaliador/filtros-mascaras.js` | Filtros + máscaras + validação de campo | 98 |
| `js/xml/parser.js` | Parse XML → campos/estado inicial | 86 |
| `js/xml/modelo.js` | XML → AST/modelo intermediário | 77 |
| `js/core/utils.js` | Utilitários genéricos (escape, chaves, download, toast) | 85 |
| `js/core/api.js` | Consultas externas (CNPJ, CEP) + cache + debounce | 115 |
| `js/core/storage.js` | persistência localStorage | 158 |
| `js/core/eventos.js` | Event bus/aop de interação | 22 |
| `js/ui/render/renderizador.js` | Renderização DOM/AST + quebras de linha | 674 |
| `js/ui/painel-variaveis.js` | Edição de variáveis/JSON (HTML injetado) | 301 |
| `js/ui/drag-drop.js` | Drag & drop arquivos | 91 |
| `js/src/App.jsx` | Orquestrador | 285 |
| `js/src/PainelCampos.jsx` | Formulário + consultas CNPJ/CEP + Word | 311 |
| `js/src/realce.jsx` | Variável interativa inline + destaque | 324 |
| `js/src/VisualizadorDocumento.jsx` | Visualizador + destaque/scroll | 84 |
| `js/src/config-context.jsx` | Contexto de foco | 81 |

### Versão atual (`src/**`, React + TS)
| Arquivo | Responsabilidade | Linhas |
|---|---|---|
| `App.tsx` | Orquestrador raiz + estado + handlers | 968 |
| `components/Sidebar.tsx` | Formulário lateral + acordeões + busca + consultas CNPJ/CEP + colabsibilidade | 690 |
| `components/SidebarToolbar.tsx` | Barra de ferramentas + dropdown templates | 330 |
| `components/ModelModal.tsx` | Painel de Variáveis (vars/JSON/XML/modelo) | 1011 |
| `components/XmlEditorModal.tsx` | Editor XML/JSON (CodeMirror) | 449 |
| `components/DocumentViewer/` | Visualizador (A4/fluido) + render AST + células + tabelas + variável inline | ~2550 (soma) |
| &nbsp;&nbsp;`DocumentNodeRenderer.tsx` | Dispatcher + quebras de linha + tabela auto + if/foreach | 1030 |
| `utils/documentUtils.ts` | Máscaras + filtros + validação + listas + valores por caminho | 708 |
| `utils/xmlParser.ts` | Parse XML → campos + AST | 330 |
| `utils/expressionEvaluator.ts` | Expressões `<if>` | 127 |
| `utils/domDocumentExtractor.ts` | Extração semântica DOM p/ Word/PDF | 277 |
| `utils/pdfExporter.ts` | Exportador PDF + impressão | 537 |
| `utils/wordExporter.ts` | Exportador Word | 633 |
| `services/storageService.ts` | persistência localStorage | 155 |
| `services/filePackageService.ts` | Zip/leitura/download arquivos | 134 |
| `constants/documentTheme.ts` | Constantes centralizadas | 171 |
| `data/defaultTemplates.ts` | Modelos padrão | 975 |
| `types.ts` | Tipos TS | 136 |

---

## 2. Boas práticas que a versão antiga já tinha (e que hoje se perderam / podem melhorar)

1. **Separação por camadas com nomes claros**: a antiga tinha `avaliador/`, `xml/`, `core/`, `ui/`, `ui/render/`.
   Hoje isso está razoável (`utils/`, `services/`, `components/`), mas os arquivos **cresceram muito**.

2. **Eventos desacoplados** (`core/eventos.js` / AOP): hoje a comunicação doc↔sidebar é via props/estado em
   `App.tsx`. A versão antiga usava um event-bus (`EDM_AOP`) — mais fácil de estender sem incha o `App`.

3. **Consultas externas isoladas** (`core/api.js` + cache + debounce): hoje as consultas de CNPJ/CEP estão
   **dentro** de `Sidebar.tsx`. Isolá-las (cache, timeout, debounce) reduziria `Sidebar`.

---

## 3. Ideias de melhoria — dividir os arquivos "gordos" do projeto atual

### A. `App.tsx` (968 linhas) — o maior problema de atribuição
Abriga estado do app + persistência + handlers de foco/scroll + carregamento de arquivos + exportação +
toasts. Sugestão: **extrair hooks dedicados**:
- `useModeloState`/`useTemplateState` → carregar/selecionar/guardar templates e modelo;
- `useCamposFoco` → estado de foco bidirecional documento↔sidebar e scroll;
- `usePreferencias` → carga/persistência unificada de preferências de UI;
- `useArquivos` → upload (XML/JSON/ZIP), download, import/export;
- `useExportacao` → Word/PDF/impressão/copiar texto.
Isso reduziria `App.tsx` a um orquestrador fino (~250–350 linhas).

### B. `components/Sidebar.tsx` (690 linhas) — mistura formulário + consultas + colapso
Sugestões:
- Extrair **consultas CNPJ/CEP** para `services/apiService.ts` (com cache + debounce, como na versão antiga);
- Extrair o **layout de colapso/barra-lateral** (estados `collapsed`/`toolbarLateral`) para um `SidebarLayout`
  ou componentes menores; deixar `Sidebar` focado em renderizar grupos/campos;
- Extrair a parte de **validação de campo** para `utils/validacao.ts` (hoje métodos como `isValido`,
  `campoVisivel` dentro de `Sidebar`).

### C. `components/ModelModal.tsx` (1011 linhas) — 5 abas num único arquivo
Sugestão: separar por aba em `components/ModelModal/`:
- `ModelModal.tsx` (shell + tabs),
- `VarsTabEditor.tsx` (edição de variáveis + tabela),
- `VarsTableResumo.tsx` (tabela resumo),
- `JsonDadosTab.tsx`,
- `XmlEditTab.tsx`,
- `JsonModeloTab.tsx`.
Cada aba ~150–250 linhas, mais fácil de manter e testar.

### D. `components/DocumentViewer/DocumentNodeRenderer.tsx` (940 linhas) — "faz tudo" do documento
Mistura: renderização de blocos, quebras de linha, tabela automática (`{{tabela}}`), `if`/`foreach`,
parágrafos numerados. Sugestões:
- Extrair a **tabela automática** (bloco `isArrayOfObjects`, hoje ~170 linhas) para `resolveAutoTable.tsx`
  ou `DocumentAutoTable.tsx`;
- Extrair o **processamento de expressões** `if`/`foreach` de blocos para `renderers` dedicados
  (`DocumentIfBlock.tsx`, `DocumentForeach.tsx`);
- Extrair a lógica de **parágrafos/quebras** (`dividirEmLinhas`, `renderParagrafosNumerados`) para
  `utils/paragraphs.ts`;
- Manter `DocumentNodeRenderer` como dispatcher fino (switch de nós).

### E. `utils/documentUtils.ts` (708 linhas) — várias responsabilidades num só util
Agrupa moeda/extenso, datas, CPF/CNPJ/CEP, validação, máscaras, listas CSV, acesso por caminho e tipo de coluna.
Sugestão — subdividir em:
- `utils/formatacao.ts` (moeda, extenso, datas, romano);
- `utils/mascaras.ts` (CPF/CNPJ/CEP/CPF/CNPJ/moeda aplicação de máscara);
- `utils/validacao.ts` (email/CPF/CNPJ/CEP);
- `utils/listas.ts` (CSV/foreach, `formatarItemForeach`, `valoresDaLista`);
- `utils/caminhos.ts` (`obterValorPorCaminho`, `obterTipoEfetivoColuna`).

### F. `data/defaultTemplates.ts` (975 linhas) — só strings XML
OK manter como "conteúdo", mas considere separar cada modelo em seu próprio arquivo
(`data/templates/contrato.ts`, `data/templates/testes.ts`, ...) para diffs menores.

### G. `components/SidebarToolbar.tsx` (330 linhas) — barra + dropdown
Extrair o **dropdown de seleção de template** para `components/TemplateSelector.tsx`; a toolbar fica
focada em botões/ações.

---

## 4. Prioridade sugerida (maior retorno / menor risco)

1. **Extrair hooks de `App.tsx`** (A) — ataque o arquivo de maior impacto no acoplamento.
2. **Isolar consultas CNPJ/CEP** (B) — repete padrão da versão antiga (`core/api.js`), reduz `Sidebar`.
3. **Quebrar `ModelModal` por abas** (C) — diminui muito a complexidade de um arquivo de 1000 linhas.
4. **Subdividir `documentUtils`** (E) — unidades testáveis por função.
5. **Quebrar `DocumentNodeRenderer`** (D) — depois de estabilizar destaque/foreach (mais recente).

---

## 5. Observações

- Já há pontos fortes preservados: `services/` (storage/arquivos), `domDocumentExtractor.ts`,
  `documentTheme.ts` (constantes centralizadas) e `types.ts` — mantenha-os.
- A versão antiga tinha `eventos.js`/event-bus que a atual não tem; se a bidirecionalidade
  doc↔sidebar crescer, reintroduzir um bus leve pode reduzir acoplamento em `App.tsx`.

---

## 6. Status da fatoração (aplicada)

| Fase | O que foi feito | Status |
|---|---|---|
| **E** — `documentUtils.ts` | Dividido em `utils/formatacao.ts`, `mascaras.ts`, `validacao.ts`, `listas.ts`, `caminhos.ts`; `documentUtils.ts` virou barrel | ✅ |
| **G** — `SidebarToolbar` | Dropdown de templates extraído para `components/TemplateSelector.tsx` | ✅ |
| **B** — `Sidebar` | Consultas CNPJ/CEP → `services/apiService.ts` + `services/useCnpjCepLookup.ts`; validação → `utils/validacao.ts` (`validarCampo`) | ✅ |
| **A** — `App.tsx` | Estado de preferências/foco/toast movidos para `src/hooks/` (`usePreferencias`, `useCamposFoco`, `useToast`) | ✅ (arquivos/handlers de upload/exportação permanecem no App) |
| **C** — `ModelModal` | Abas `vars-edit` e `vars-readonly` extraídas para `components/ModelModal/VarsTabs.tsx` | ✅ (abas JSON/XML/modelo permanecem no ModelModal) |
| **D** — `DocumentNodeRenderer` | Lógica de quebra de parágrafos → `utils/paragraphs.ts` (`dividirEmLinhas`) | ✅ (tabela automática permanece inline) |
| **F** — `defaultTemplates` | Dividido em `data/templates/{termoReferencia,bateriaTestes,contratoServicos}.ts` | ✅ |

### Ajuste de prioridade (novo)
A extração dos **hooks** e dos **services** trouxe o maior ganho por risco. Próximos passos pendentes
(menor urgência, manter em mente):
- completar `useArquivos`/`useExportacao` (mover os handlers de upload/download/exportação que ainda
  estão no `App.tsx`);
- extrair a **tabela automática** do `DocumentNodeRenderer` para `DocumentAutoTable.tsx`;
- completar a divisão do `ModelModal` (abas JSON Dados / XML / Modelo) se o arquivo voltar a crescer.

A sugestão de reintroduzir um **event-bus** foi **descartada** pelo usuário; a comunicação
doc↔sidebar permanece via estado/hook (`useCamposFoco`) em `App.tsx`.
