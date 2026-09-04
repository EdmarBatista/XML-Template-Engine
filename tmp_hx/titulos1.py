# -*- coding: utf-8 -*-
# Determina, para cada parágrafo com estilo de "nível" (Nivel01/Nivel..), qual número o Word mostra
# Simula apenas os elementos "fonte da verdade" lendo o numbering real. Vamos construir:
#  - por parágrafo: estilo + (numId,ilvl) resolvido via base do estilo
#  - sequência real do documento
import re, zipfile
z = zipfile.ZipFile('modelo-de-termo-de-referencia-servicos-e-obras-lei-no-14-133-mai-26.docx')
docx = z.read('word/document.xml').decode('utf8')
ST  = z.read('word/styles.xml').decode('utf8')
NM  = z.read('word/numbering.xml').decode('utf8')

paras = re.findall(r'<w:p\b.*?</w:p>', docx, re.S)
def text(p): return re.sub(r'\s+',' ',''.join(re.findall(r'<w:t(?:\s[^>]*)?>([^<]*)</w:t>',p))).strip()

# Estilos com resolved chain
raw={}
for m in re.finditer(r'<w:style\b(?P<h>[^>]*?)w:type="paragraph"[^>]*>(?P<b>[\s\S]*?)</w:style>', ST):
    sid=(re.search(r'w:styleId="([^"]*)"',m.group('h')) or [None,None])
    sid=sid[1]
    body=m.group('b')
    base=(re.search(r'<w:basedOn w:val="([^"]*)"',body) or [None,None])[1]
    np_=re.search(r'<w:numPr>([\s\S]*?)</w:numPr>',body)
    numid=ilvl=None
    if np_:
        seq=np_.group(1)
        numid=(re.search(r'<w:numId w:val="(\d+)"',seq) or [None,None])[1]
        ilvl=(re.search(r'<w:ilvl w:val="(\d+)"',seq) or [None,None])[1]
    olvl=(re.search(r'<w:outlineLvl w:val="(\d+)"',body) or [None,None])[1]
    raw[sid]=dict(base=base,numId=numid,ilvl=ilvl,outl=olvl)
STY=raw
def chain(sid):
    out={}
    cur=sid; seen=set()
    while cur and cur in STY and cur not in seen:
        seen.add(cur)
        d=STY[cur]
        for k in ('numId','ilvl','outl'):
            if out.get(k) is None: out[k]=d[k]
        cur=d['base']
    return out

def showrows(label, pred):
    print('-----',label,'-----')
    cnt={}
    for i,p in enumerate(paras):
        ms=re.search(r'<w:pPr>([\s\S]*?)</w:pPr>',p)
        body=ms.group(1) if ms else ''
        ps=(re.search(r'<w:pStyle w:val="([^"]*)"',body) or [None,None])[1]
        if not ps: continue
        t=text(p)
        if not t: continue
        res=chain(ps)
        if pred(ps,t,res):
            print(f"[{i:>3}] {ps:14s} numId={res.get('numId')} ilvl={res.get('ilvl')} outl={res.get('outl')} :: {t[:55]}")

# só Níveis que não exijam "SemNum"
import re as R
showrows("títulos nível-1 estilo (fora SemNum) ATÉ FORO/ANEXOII",
         lambda ps,t,res: R.search(r'Nivel\s*01|Nivel1$|Nvel1', ps) and not R.search(r'SemNum|SemBlack',ps, R.I))
