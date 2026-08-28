# Handover — Correção de Quebras de Linha e Numeração no Documento (Word/PDF)

## Resumo

Este documento descreve a correção aplicada para restaurar as **quebras de linha (parágrafos)** e a **numeração automática de parágrafos** no documento gerado (tela, Word `.docx` e PDF), que voltaram a funcionar como na versão de backup.

**Problema relatado:** Ao adicionar a funcionalidade de tabela, os parágrafos do documento "colaram" numa única linha, ex.:

> Órgão/Entidade: DNIT. Unidade Administrativa: DNIT MG. Responsável pela elaboração: Edmar Batista. Processo Administrativo nº {{processo}}. ...

Além disso, a numeração dos parágrafos deixou de ser aplicada.

---

## Causa raiz

O componente **`src/components/DocumentViewer/DocumentNodeRenderer.tsx`** foi reescrito e **perdeu a função `renderizarParagrafosInline`** que existia na pasta de backup `BackUP_Funcionando linhas e Numeração/`.

- **Versão antiga (funcionando):** o texto inline dentro de uma `<secao>` (cujas linhas estão separadas por quebras literal `\n` no XML) era **dividido em parágrafos separados** a cada `\n` ou `<br>`. Cada linha virava um `<div data-word-type="paragrafo">`. Com numeração ativa, cada parágrafo recebia um **número progressivo** (prefixo da seção + contador) via `<span data-word-num>`.
- **Versão atual (com bug):** todo o texto inline era acumulado num `inlineBuffer` e despejado num **único** `<div data-word-type="paragrafo">`, ignorando os `\n`. Resultado: todas as frases viravam um bloco contínuo (uma linha) no documento — tanto na tela quanto no Word/PDF — e a numeração por parágrafo era perdida.

Os exportadores de Word (`wordExporter.ts`) e PDF (`pdfExporter.ts`) **não foram a causa**: eles já criam um parágrafo por elemento DOM `data-word-type="paragrafo"`. A falha estava em o DOM não gerar múltiplos desses elementos.

---

## Correção aplicada

Arquivo alterado: **`src/components/DocumentViewer/DocumentNodeRenderer.tsx`**

Foram adicionadas duas novas funções auxiliares dentro de `renderAstBlocos`:

### `dividirEmLinhas(nos: AstNode[]): AstNode[][]`
Divide um conjunto de nós inline em grupos (linhas/parágrafos):
- Cada texto com `\n` literal é quebrado (cada parte vira uma linha).
- Cada `<br>` força uma quebra de linha.
- Mantém os demais nós inline (variáveis, `<b>`, `<i>`, `<u>`, etc.) agrupados na linha atual.

### `renderParagrafosNumerados(nos, pPath, ctxLocal, alinhamentoPadrao)`
Para cada linha dividida:
- Cria um `<div data-word-type="paragrafo" data-word-level=... data-word-align=...>`.
- **Com numeração ativa** (`ctxNum.habilitado && ctxNum.numerarBlocos`), insere o número automático no início via `<span data-word-num>` (prefixo da seção + contador local, ex.: `1.`, `1.1.`, ...).
- Renderiza os filhos com `renderInlineNodes` (preservando **todas** as features atuais de formatação/variável).

### Pontos de uso atualizados
1. **`flushInlineBuffer`** — agora chama `renderParagrafosNumerados` no lugar de emitir um único `<div>`.
2. **Bloco `<paragrafo>`/`<p>`** — agora passa pelo mesmo `renderParagrafosNumerados` (mantendo o atributo `alinhamento`), em vez de emitir um único parágrafo sem numeração.

---

## O que NÃO foi alterado

- **`wordExporter.ts`** e **`pdfExporter.ts`** — intactos; consomem múltiplos parágrafos do DOM corretamente.
- **Renderização de tabelas** (`DocumentTableNode.tsx`, `DocumentTableCell.tsx`, tabela automática via `{{tabela}}`) — intacta e compatível: a tabela continua gerando `data-word-type="tabela-container"`/`"tabela"`, tratada como bloco e não afetada pela divisão de parágrafos.
- **`DocumentSectionNode.tsx`** — intacto; a numeração de seções (`<secao>`) continua como estava.

---

## Como testar

1. Inicie o app: `npm run dev` (porta 3000).
2. Abra o template com o texto de identificação (ex.: template padrão > seção "IDENTIFICAÇÃO DA CONTRATAÇÃO").
3. Verifique que cada linha do XML virou um parágrafo separado (tela, modo A4 e fluido).
4. Verifique a numeração dos parágrafos dentro de seções numeradas.
5. **Exportar Word (.docx)** e **PDF**: confirme que os parágrafos aparecem quebrados corretamente e com a numeração.
6. Teste com um template que usa `<tabela>`/`{{tabela}}`: confirme que a tabela continua renderizando e exportando normalmente.

> Nota: dentro de um elemento formatado aninhado (ex.: `<b>texto\nmais</b>`) a quebra de linha ainda não é dividida em parágrafos — apenas os `\n` no nível do texto entre elementos são tratados. Isso atende aos templates atuais.

---

## Comandos de validação

```bash
npm install      # instala dependências (TypeScript não estava instalado)
npm run lint     # tsc --noEmit  ->  sem erros
npm run build    # tsc -b && vite build  ->  sucesso
```

---

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/components/DocumentViewer/DocumentNodeRenderer.tsx` | Dividir texto em parágrafos por `\n`/`<br>` + numeração por parágrafo |
