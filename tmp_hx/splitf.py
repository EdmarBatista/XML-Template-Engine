# -*- coding: utf-8 -*-
import os, re
L = open('src/docx/converter.ts', encoding='utf8').read().split('\n')
def s(a, b):  # 1-based incl
    return '\n'.join(L[a-1:b]) + '\n'
def col0_end(a1):
    for j in range(a1, len(L)+1):
        if L[j-1].strip() == '}':
            return j
    raise SystemExit('fim? ' + str(a1))
def locatefn(nm):
    for a in range(1, len(L)+1):
        if re.match(r'^(export )?(async )?function ' + re.escape(nm) + r'\(', L[a-1]):
            return a, col0_end(a)
    raise SystemExit('fn?' + nm)
def locate_if(nm):
    for a in range(1, len(L)+1):
        if L[a-1].startswith('interface ' + nm):
            return a, col0_end(a)
    raise SystemExit('if? ' + nm)

O = 'src/docx'
def delfrom(name):
    p = os.path.join(O, name)
    if os.path.exists(p): os.remove(p)
def exportify(txt):
    out = []
    for ln in txt.split('\n'):
        stripped = ln.lstrip()
        starts_fn = (stripped.startswith('function ') or stripped.startswith('async function ')) \
                    and not stripped.startswith('export ')
        if starts_fn:
            ln = ('' if ln == stripped else ln[:len(ln)-len(stripped)]) + 'export ' + stripped
        out.append(ln)
    return '\n'.join(out)

def w(n, c):
    open(os.path.join(O, n), 'w', encoding='utf8').write(c)

ifaces = ['NumberingLevelInfo', 'DocxStyleInfo', 'DocxParagraphInfo', 'ExtractedComment']
w('types.ts', '/* Tipos compartilhados da conversão .docx → XML. */\n\n'
  + ''.join(s(*locate_if(x)) + '\n' for x in ifaces))

# ---- domText via slices ----
r_dom = {n: locatefn(n) for n in ['getXmlParser', 'parseHtmlDoc', 'escapeXml', 'extrairTextoComEspacos', 'limparEspacos', 'normalizarIdentificadorValido']}
w('domText.ts', exportify(
    ''.join(s(*r_dom[k]) + '\n\n' for k in ['getXmlParser', 'parseHtmlDoc'])))

# ---- word.ts: extraction functions ----
wfns = ['extrairEstilosDoDocx', 'extrairNumeracaoDoDocx', 'extrairEstruturaParagrafosDocx', 'extrairComentariosDoZip', 'gerarXmlDeComentarios']
# estes vieram em lacunas; conservar usando ranges conhecidos (intervalos) mesmo
ranges = {n: locatefn(n) for n in wfns}
# ordenar por Início
orders = sorted(ranges.items(), key=lambda kv: kv[1][0])
seg_word = ''.join(s(*ranges[n]) + '\n\n' for n, _ in orders)
w('word.ts',
  "import JSZip from 'jszip';\n"
  "import type { DocxParagraphInfo, DocxStyleInfo, ExtractedComment, NumberingLevelInfo } from './types';\n"
  "import { escapeXml, extrairTextoComEspacos, getXmlParser, limparEspacos } from './domText';\n\n"
  + exportify(seg_word))

# ---- htmlToXml.ts ----
hf = {n: locatefn(n) for n in ['coletarItensDeLista', 'transformarHtmlParaEstruturaXml']}
# inclui type FormFieldDef que está entre 706.. antes coletar; localizar type e definir header.
# ach par: entre coment de FormFieldDef (tipo) até coletar. Simples: pegamos bloco 706..transform end, porém 706 incl FormFieldDef.
# localizar início 'type FormFieldDef' (1-based).
for a in range(1, len(L)+1):
    if L[a-1].strip().startswith('type FormFieldDef'):
        start_tf = a
        break
end_tf = None
for j in range(start_tf, len(L)+1):
    if L[j-1].strip() == '};':
        end_tf = j
        break
start_c = hf['coletarItensDeLista'][0]
body_html = s(end_tf, hf['transformarHtmlParaEstruturaXml'][1])
w('htmlToXml.ts',
  "import { ColumnType, ListType } from '../types';\n"
  "import type { DocxParagraphInfo } from './types';\n"
  "import { decodificarEntidadesXml } from '../utils/expressionEvaluator';\n"
  "import { extrairTextoComEspacos, limparEspacos, normalizarIdentificadorValido, parseHtmlDoc } from './domText';\n"
  "\nconst TEXT_NODE = 3;\nconst ELEMENT_NODE = 1;\n\n"
  + exportify(body_html))

# ---- rewrite converter.ts as orchestrator ----
imports_header = """import mammoth from 'mammoth';
import JSZip from 'jszip';

import {
  extrairComentariosDoZip,
  extrairEstilosDoDocx,
  extrairNumeracaoDoDocx,
  extrairEstruturaParagrafosDocx,
  gerarXmlDeComentarios,
} from './word';
import { transformarHtmlParaEstruturaXml } from './htmlToXml';

"""
core = s(locatefn('converterDocxParaModeloXml')[0], locatefn('converterDocxParaModeloXml')[1])
w('converter.ts', imports_header + '\n' + core + '\n')
print('pronto')
