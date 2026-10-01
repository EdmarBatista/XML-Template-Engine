# -*- coding: utf-8 -*-
# Modelo FINAL (regex-> correcto): numeração num nível = percorre o doc; mantém (abstract) atual.
# Para cada Nivel01 (lvl0 decimal): se sem numId => não incrementa nem mostra número.
#   senão: ab=abstract do seu numId (com override de nível->startOverride se existir).
#   se ab != corrente(abAtivo) => reseta: contador global-level e abre novo "lista"? Mas note
#   que o PDF rompe em ANEXO: passa para FORMALIZAÇÃO=1. Então reset quando muda abstract
#   destes headings-0 que marcam novo grande bloco? Além disso contrato com abstract A todo contínuo.
#   Anexo: todos parecem abstract distinto B -> FORMALIZAÇÂO(nid26?) e seguintes nid9? Precisamos ver
#   se os nids da região anexo NÃO são o mesmo abstract A (nid9-contrado) : se são => sem reset.
Comandos = '''
Será impresso: para cada Nivel01 (em ordem) com active abstract corriado; count local.
'''
# (escreveu se...)
import re, os, sys
docx=open('tmp_hx/oszip/word/document.xml',encoding='utf8').read()
ST =open('tmp_hx/oszip/word/styles.xml',encoding='utf8').read()
NZ =open('tmp_hx/oszip/word/numbering.xml',encoding='utf8').read()
def dig(s,p):
    m=re.search(p,s); return m.group(1) if m else None
paras=re.findall(r'<w:p\b.*?</w:p>', docx, re.S)
def text_of(p): return re.sub(r'\s+',' ',''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p))).strip()

sty={}
for m in re.finditer(r'<w:style\b(?P<a>[\s\S]*?)</w:style>', ST):
    a=m.group('a'); sid=dig(a,r'w:styleId="([^"]*)"')
    if sid:
        sty[sid]=dict(numId=dig(a,r'<w:numId w:val="(\d+)"'),
                      ilvl=dig(a,r'<w:ilvl w:val="(\d+)"'),
                      base=dig(a,r'<w:basedOn w:val="([^"]*)"'))
def resolve(sid):
    o={};cur=sid;seen=set()
    while cur and cur in sty and cur not in seen:
        seen.add(cur);d=sty[cur]
        for k in ('numId','ilvl'):
            if o.get(k) is None:o[k]=d[k]
        cur=d['base']
    return o

n2a={}; noverride={}
for m in re.finditer(r'<w:num w:numId="(\d+)"[^>]*>([\s\S]*?)</w:num>', NZ):
    nid=int(m.group(1)); b=m.group(2)
    ab=dig(b,r'<w:abstractNumId w:val="(\d+)"')
    if ab is not None: n2a[nid]=int(ab)
    ov={}
    for o in re.finditer(r'<w:lvlOverride w:ilvl="(\d+)"[^>]*>([\s\S]*?)</w:lvlOverride>', b):
        so=dig(o.group(2),r'<w:startOverride w:val="(\d+)"')
        ov[int(o.group(1))]= (int(so) if so else None)
    noverride[nid]=ov

rows=[]
for i,p in enumerate(paras):
    pp=(re.search(r'<w:pPr>(.*?)</w:pPr>',p,re.S) or (None,''))[1]
    ps=dig(pp,r'<w:pStyle w:val="([^"]*)"')
    if ps not in ('Nivel01','NNivel01'): continue
    t=text_of(p)
    if not t: continue
    r=resolve(ps)
    nid=r['numId']; il=0
    dn=dig(pp,r'<w:numId w:val="(\d+)"'); di=dig(pp,r'<w:ilvl w:val="(\d+)"')
    if dn: nid=dn
    if di: il=int(di)
    rows.append((i,t,nid,il))

# Sim1: rotulo numero continuo por abstract do nivel (sem reset) p/ enxergar Abstract por regiao
def label_abstract_lv(i,nid):
    return n2a.get(int(nid)) if nid is not None and str(nid)!='0' else None

print("Sequencia Nivel01 : idx, abstract(nid), e texto; para ver blocos de abstract")
prev=None
for idx,t,nid,il in rows:
    ab=label_abstract_lv(idx,nid)
    nids = nid
    print(f"#{idx:>4} nid={str(nids):>4} ab={ab} :: {t[:38]}")
