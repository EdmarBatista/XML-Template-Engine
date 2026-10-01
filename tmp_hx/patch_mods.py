# -*- coding: utf-8 -*-
import re, io

def read(p): return open(p, encoding='utf8').read()
def write(p, c): open(p, 'w', encoding='utf8', newline='').write(c)

# 1) types.ts: garantir export nas interfaces (top-level)
p='src/docx/types.ts'
c=read(p)
lines=c.split('\n')
out=[]
for i,l in enumerate(lines):
    if l.startswith('interface ') and not l.startswith('export interface '):
        out.append('export '+l)
    else:
        out.append(l)
# remover eventuais prefixos 'export export'
c='\n'.join(out).replace('export export ','export ')
# as interfaces vieram sem export original? completaremos também adicionar ao bloco comentado inicial.
write(p,c)

# 3) domText: adicionar constantes
p='src/docx/domText.ts'
c=read(p)
if '\nconst TEXT_NODE' not in c:
    c=c.replace('export function getXmlParser',"const TEXT_NODE = 3;\nconst ELEMENT_NODE = 1;\n\nexport function getXmlParser",1)
write(p,c)

# 4) htmlToXml: import escapeXml e consome TextNode definicoes p/ constants ja; e retirar exports inválidos
# Regenerar mais simples: garantir bodies não tenham 'export ' indevidos (nós!) exceto funções desejadas.
p='src/docx/htmlToXml.ts'
c=read(p)
# garantir import escapeXml
if "escapeXml" not in c.split('from ./domText')[0] and "escapeXml} " not in c:
    c=c.replace("import { extrairTextoComEspacos, limparEspacos, normalizarIdentificadorValido, parseHtmlDoc } from './domText';",
                "import { escapeXml, extrairTextoComEspacos, limparEspacos, normalizarIdentificadorValido, parseHtmlDoc } from './domText';")
# garantir export só nas duas funções alvo; qualquer outro 'export ' em linha (col!=?) remover
def norm_exports(txt, targets):
    ls=[]
    for l in txt.split('\n'):
        stripped=l.lstrip()
        if l.startswith('export ') and not any(l.startswith('export function '+t) for t in targets):
            ls.append(l[len('export '):])  # sem export
        else:
            if not l.startswith('export ') and (l.startswith('function ') or l.startswith('async function ')) and l.strip().startswith(('function ','async function ')):
                # somente targets export
                for t in targets:
                    if l.startswith(t+'\u0028') or l.startswith('async function '+t+'\u0028'):
                        ls.append('export '+l)
                        break
                else:
                    ls.append(l)
            else:
                ls.append(l)
            if False: pass
    return '\n'.join(ls)
c=norm_exports(c, ['coletarItensDeLista','transformarHtmlParaEstruturaXml'])
write(p,c)

# word: garantir imports de tipos exportados + limparPossível export duplicado; as funções alvo de export
p='src/docx/word.ts'
c=read(p)
c=norm_exports(c, ['extrairEstilosDoDocx','extrairNumeracaoDoDocx','extrairEstruturaParagrafosDocx','extrairComentariosDoZip','gerarXmlDeComentarios'])
write(p,c)

# converter: precisa de tipos import type (em anotações retorno) - adiciona import type
p='src/docx/converter.ts'
c=read(p)
if "import type" not in c:
    # inserir após imports existentes
    c=c.replace("import { transformarHtmlParaEstruturaXml } from './htmlToXml';",
                "import { transformarHtmlParaEstruturaXml } from './htmlToXml';\nimport type { DocxStyleInfo, NumberingLevelInfo } from './types';")
write(p,c)

print('patched')
