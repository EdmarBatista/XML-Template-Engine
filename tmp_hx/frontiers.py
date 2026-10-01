# -*- coding: utf-8 -*-
# Localiza, CONSTRUTURALMENTE (sem heuristic de texto), onde o Word reinicia a numeração
# de nivel 1: procura por mudancas de tipo/grupo de fluxo corrente => fronteiras.
# Olha cada paragrafo com pStyle Nivel01 e o estado numId/ilvl/outl RESOLVIDO alem de
# presenca de paragrafos "normais" grandes (h2 bodies) e divisórios, em torno de 0-1000
# para achar onde comeca um novo ciclo (numeracao reinicia).
import re, os
docx=open('tmp_hx/oszip/word/document.xml',encoding='utf8').read()
ST =open('tmp_hx/oszip/word/styles.xml',encoding='utf8').read()
NZ =open('tmp_hx/oszip/word/numbering.xml',encoding='utf8').read()
def dig(s,p): m=re.search(p,s); return m.group(1) if m else None
paras=re.findall(r'<w:p\b.*?</w:p>', docx, re.S)
def text_of(p): return re.sub(r'\s+',' ',''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p))).strip()

# estilos: numId/ilvl/outline/ base
sty={}
for m in re.finditer(r'<w:style\b(?P<a>[\s\S]*?)</w:style>', ST):
    a=m.group('a'); sid=dig(a,r'w:styleId="([^"]*)"')
    if sid:
        sty[sid]=dict(numId=dig(a,r'<w:numId w:val="(\d+)"'),ilvl=dig(a,r'<w:ilvl w:val="(\d+)"'),
                      outl=dig(a,r'<w:outlineLvl w:val="(\d+)"'),base=dig(a,r'<w:basedOn w:val="([^"]*)"'))
def resolve(sid):
    o={};cur=sid;seen=set()
    while cur and cur in sty and cur not in seen:
        seen.add(cur);d=sty[cur]
        for k in ('numId','ilvl','outl'):
            if o.get(k) is None:o[k]=d[k]
        cur=d['base']
    return o

def lvl_of(ps):
    r=resolve(ps)
    # nivel do titulo (map-style): segue Nivel<N> padrão numérico p/ cada grupo N1,N2...
    m=re.search(r'N[ivI]?el0?(\d+)',ps) or re.search(r'Nivel(\d+)',ps)
    return int(m.group(1)) if m else None

print("== parágrafos Nivel/rôr com id do run de fluxo e outline + entorno 790-1005 ==")
for i,p in enumerate(paras):
    pp=(re.search(r'<w:pPr>([\s\S]*?)</w:pPr>',p) or (None,''))[1]
    ps=dig(pp,r'<w:pStyle w:val="([^"]*)"')
    t=text_of(p)
    if not t: continue
    # mostra se e Nivel de TI ou tem fluxo
    isN= bool(ps) and bool(re.match(r'(Nivel0?\d+|N[Aa]?vel0?\d+|Nvel0?\d+)',ps or '')) if ps else False
    isTitulo = (ps or '') in ('Nivel01',) 
    shown= text_of(p)[:32]
    if isTitulo and i<300:
        r=resolve(ps); dnum=dig(pp,r'<w:numId w:val="(\d+)"'); ilv=dig(pp,r'<w:ilvl w:val="(\d+)"')
        out=dig(pp,r'<w:outlineLvl w:val="(\d+)"')
        print(f"#{i} ps={ps:9s} res.nid={r['numId']} ddir.nid={dnum} ilvl={ilv or r['ilvl']} out={out or r['outl']} :: {shown}")
