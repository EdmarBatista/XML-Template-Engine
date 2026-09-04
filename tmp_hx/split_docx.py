# -*- coding: utf-8 -*-
# Divide o arquivo originário docxToXmlConverter.ts em módulos sob src/docx/,
# preservando o conteúdo byte-a-byte das funções (sem regressão).
import os, re

SRC = 'tmp_hx/_orig_docx.ts'  # backup = original intocado
orig = open(SRC, encoding='utf8').read()
lines = orig.split('\n')

def span(l0, l1):  # inclusivo 1-based, devolve texto incluindo \n\0
    # l0..l1 inclusive linha
    return '\n'.join(lines[l0-1:l1]) + '\n'

OUT = 'src/docx'
os.makedirs(OUT, exist_ok=True)

files = {}

# ===================== 1) dom/text basics  =====================
# getXmlParser(50-58), parseHtmlDoc(60-70),
# escapeXml(631-648), extrairTextoComEspacos(651-669), limparEspacos(671-673), normalizarIdentificadorValido(678-704)
parts = []
parts.append(span(50,58))   # getXmlParser
parts.append('\n') 
parts.append(span(60,70))   # parseHtmlDoc
parts.append('\n')
parts.append('''
/* ===== helpers de texto e identificadores ===== */
''')
parts.append(span(631,642)) 
parts.append('\n')
# extrairTextoComEspacos 642-669
parts.append(span(643,669))
parts.append('\n')
parts.append(span(671,673)) # limparEspacos
parts.append('\n')
parts.append(span(675,704)) # normalizarIdentificadorValido (incl. comentario header)
files['domText.ts'] = '''/* Helpers de DOM/parser e de texto usados na conversão .docx. */
export function getXmlParser(): DOMParser {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser();
  }
  if (typeof window !== 'undefined' && window.DOMParser) {
    return new window.DOMParser();
  }
  throw new Error('DOMParser is not available');
}

export function parseHtmlDoc(html: string): Document {
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }
  if (typeof window !== 'undefined' && window.DOMParser) {
    const parser = new window.DOMParser();
    return parser.parseFromString(html, 'text/html');
  }
  throw new Error('DOMParser is not available');
}

export function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export function extrairTextoComEspacos(node: Node | null): string {
  if (!node) return '';
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tag = el.nodeName.toLowerCase();
    if (tag === 'br') return ' ';
    const isBlock = ['p', 'div', 'tr', 'td', 'th', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag);
    const childTexts: string[] = [];
    for (let i = 0; i < el.childNodes.length; i++) {
      childTexts.push(extrairTextoComEspacos(el.childNodes[i]));
    }
    const joined = childTexts.join('');
    return isBlock ? ` ${joined} ` : joined;
  }
  return '';
}

export function limparEspacos(texto: string): string {
  return (texto || '').replace(/\\s+/g, ' ').trim();
}

/**
 * Normaliza um texto para um identificador válido (apenas a-z, 0-9 e sublinhados, sem começar com número)
 */
export function normalizarIdentificadorValido(texto: string, fallbackPadrao: string): string {
  if (!texto) return fallbackPadrao;

  // 1. Remove acentuação e caracteres diacríticos
  let norm = texto
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase();

  // 2. Substitui caracteres não alfanuméricos por sublinhados
  norm = norm.replace(/[^a-z0-9_]+/g, '_');

  // 3. Remove sublinhados repetidos e das pontas
  norm = norm.replace(/^_+|_+$/g, '');

  // 4. Garante que não comece com dígito
  if (/^[0-9]/.test(norm)) {
    norm = `item_${norm}`;
  }

  // 5. Validação final: se ficou vazio ou inválido, usa o fallback seguro
  if (!norm || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(norm)) {
    return fallbackPadrao;
  }

  return norm;
}
'''

# ===================== 2) extração do word (estilos, numeração, parágrafos, comentários) =====================
# extrairEstilosDoDocx 199-297; extrairNumeracaoDoDocx 299-358; extrairEstruturaParagrafosDocx 360-553;
# extrairComentariosDoZip 555-614; gerarXmlDeComentarios 616-629
block_lines = []
fns = [(199,297),(299,358),(360,553),(555,614),(616,629)]
for a,b in fns:
    block_lines.append(span(a,b))
    if a==299: block_lines.append('\n')
    block_lines.append('\n') 
body = ''.join(block_lines)

wordfile = '''import JSZip from 'jszip';
import type {
  DocxStyleInfo,
  DocxParagraphInfo,
  ExtractedComment,
  NumberingLevelInfo,
} from './types';
import { escapeXml, extrairTextoComEspacos, getXmlParser, limparEspacos } from './domText';

''' + body
# conversão de 'function ' para 'export function ' em nível top-level dessas funções:
# Como o body foi tirado intacto sem o export, adicionar export:
# (simples regex por definição exatas)
def export_top(s):
    # adiciona export antes das declarações de função topo (não indentadas)
    # funções começam no inicio de linha
    for fn in ['extrairEstilosDoDocx','extrairNumeracaoDoDocx','extrairEstruturaParagrafosDocx','extrairComentariosDoZip','gerarXmlDeComentarios']:
        s = s.replace(f'function {fn}(', f'export function {fn}(')
    return s
files['word.ts'] = wordfile  # será corrigido

# ===================== 3) HTML -> XML =====================
# coletarItensDeLista 713-758 e transformarHtmlParaEstruturaXml 760-1624
htmlparts = []
htmlparts.append(span(713,758))
htmlparts.append('\n')
htmlparts.append(span(760,1624))

htmlfile = """import { ColumnType, ListType } from '../types';
import type { DocxParagraphInfo, FormFieldDef } from './types';
import { decodificarEntidadesXml } from './expressionEvaluator';
import {
  escapeXml,
  extrairTextoComEspacos,
  limparEspacos,
  normalizarIdentificadorValido,
  parseHtmlDoc,
} from './domText';

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

""" + htmlparts[0] + '\n' + htmlparts[1]

# troca function topo -> export
htmlfile = htmlfile.replace('function extrairTextoComEspacos(', 'export function extrairTextoComEspacos(')  # nao, está no domText
# apenas marcadores topo destes arquivos:
htmlfile = htmlfile.replace('function coletarItensDeLista(', 'export function coletarItensDeLista(')
htmlfile = htmlfile.replace('function transformarHtmlParaEstruturaXml(', 'export function transformarHtmlParaEstruturaXml(')
files['htmlToXml.ts'] = htmlfile

# escrever
for fn, content in files.items():
    p = os.path.join(OUT, fn)
    open(p, 'w', encoding='utf8').write(content)
    print('Escrevi', p, len(content.split(chr(10))), 'linhas')
