// Split src/docx/converter.ts (orchestrator fonte atual) em módulos via AST do TypeScript.
// Único modo confiável para obter spans exatos de funções/interfaces grandes.
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const SRC = 'tmp_hx/fullconverter.ts';
const srcText = fs.readFileSync(SRC, 'utf8');
const lines = srcText.split('\n');
function toText(startPos, endPos, endInclusive = true) {
  // usar posições: linha 1-based conforme arquivo
  const ss = ts.getLineAndCharacterOfPosition(sf, startPos);
  const se = ts.getLineAndCharacterOfPosition(sf, endPos);
  return lines.slice(ss.line, se.line + (endInclusive ? 1 : 0)).join('\n') ;
}
const sf = ts.createSourceFile(SRC, srcText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const outDir = 'src/docx';
function write(name, content) { fs.writeFileSync(path.join(outDir, name), content); }

// coleto declarations nomeados topo (statement-level do arquivo)
// Todas as funções/interfaces de interesse são statements de topo do arquivo.
const declsTop = [];
for (const st of sf.statements) {
  if (ts.isFunctionDeclaration(st)) {
    declsTop.push({ kind: 'function', name: st.name && st.name.text, start: st.getStart(sf), end: st.end });
  } else if (ts.isInterfaceDeclaration(st)) {
    declsTop.push({ kind: 'interface', name: st.name.text, start: st.getStart(sf), end: st.end });
  } else if (ts.isTypeAliasDeclaration(st)) {
    declsTop.push({ kind: 'type', name: st.name.text, start: st.getStart(sf), end: st.end });
  }
}
const decls = declsTop;

const fun = {};
decls.forEach(d => { if (d.kind === 'function') fun[d.name] = d; });

function blockToText(startPos, endPos) {
  const ss = ts.getLineAndCharacterOfPosition(sf, startPos).line; // 0-based
  const se = ts.getLineAndCharacterOfPosition(sf, endPos).line;
  return lines.slice(ss, se + 1).join('\n') + '\n';
}

// caminho relativo para converter (a partir de src/docx)
function addExportPrefix(txt) {
  return txt.split('\n').map(ln => {
    const s = ln.trim();
    if (!s.startsWith('export ') && (s.startsWith('function ') || s.startsWith('async function '))) {
      return 'export ' + ln.trimStart();
    }
    return ln;
  }).join('\n');
}

const isName = ['NumberingLevelInfo','DocxStyleInfo','DocxParagraphInfo','ExtractedComment'];
// interfaces span dentro de blocos de statements (toText)
let typesText = '/* Tipos compartilhados da conversão .docx → XML. */\n\n';
for (const nm of isName) {
  const d = decls.find(x => x.kind === 'interface' && x.name === nm);
  typesText += toText(d.start, d.end) + '\n\n';
}
write('types.ts', typesText);

function funcText(nm) {
  return toText(fun[nm].start, fun[nm].end) + '\n';
}

// domText inclui text help
write('domText.ts',
"/* Helpers de DOM/parser e texto usados na pipeline. */\n\n" +
addExportPrefix(['getXmlParser','parseHtmlDoc','escapeXml','extrairTextoComEspacos','limparEspacos','normalizarIdentificadorValido'].map(funcText).join('\n')));

const wordFns = ['extrairEstilosDoDocx','extrairNumeracaoDoDocx','extrairEstruturaParagrafosDocx','extrairComentariosDoZip','gerarXmlDeComentarios'];
write('word.ts',
"import JSZip from 'jszip';\n" +
"import type { DocxParagraphInfo, DocxStyleInfo, ExtractedComment, NumberingLevelInfo } from './types';\n" +
"import { escapeXml, extrairTextoComEspacos, getXmlParser, limparEspacos } from './domText';\n\n" +
addExportPrefix(wordFns.map(funcText).join('\n')));

// htmlToXml: FormFieldDef type + coletar + transform
let typeTf = '';
let tfDecl;
for (const st of sf.statements) { if (ts.isTypeAliasDeclaration(st) && st.name.text === 'FormFieldDef') tfDecl = st; }
const tfText = tfDecl ? toText(tfDecl.getStart(sf), tfDecl.end) : '';
const htmlFns = ['coletarItensDeLista','transformarHtmlParaEstruturaXml'];
write('htmlToXml.ts',
"import { ColumnType, ListType } from '../types';\n" +
"import type { DocxParagraphInfo } from './types';\n" +
"import { decodificarEntidadesXml } from '../utils/expressionEvaluator';\n" +
"import { extrairTextoComEspacos, limparEspacos, normalizarIdentificadorValido, parseHtmlDoc } from './domText';\n\n" +
"const TEXT_NODE = 3;\nconst ELEMENT_NODE = 1;\n\n" +
(tfText ? tfText + '\n\n' : '') +
addExportPrefix(htmlFns.map(funcText).join('\n')));

// ---- orquestrador converter.ts ----
const cBody = funcText('converterDocxParaModeloXml'); // já exporta (é 'export async function' no original não? era export async)
let conv = "import mammoth from 'mammoth';\nimport JSZip from 'jszip';\n\n" +
"import {\n  extrairEstilosDoDocx,\n  extrairNumeracaoDoDocx,\n  extrairEstruturaParagrafosDocx,\n  extrairComentariosDoZip,\n  gerarXmlDeComentarios,\n} from './word';\n" +
"import { transformarHtmlParaEstruturaXml } from './htmlToXml';\n\n" +
cBody.replace('export async function converterDocxParaModeloXml', 'export async function converterDocxParaModeloXml');
write('converter.ts', conv);

console.log('ok done');
