# -*- coding: utf-8 -*-
# Inspeciona, a partir do XML extraido (tmp_hx/oszip), os paragrafos Nivel01/niveis do final
# procurando: texto, runs com campos (instrText/SEQUENCE), numeracao literal, e o XML cru.
import re, os
BASE='tmp_hx/oszip/word'
docx=open(os.path.join(BASE,'document.xml'),encoding='utf8').read()
paras=re.findall(r'<w:p\b.*?</w:p>', docx, re.S)
def text_of(p):
    return re.sub(r'\s+',' ',''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p))).strip()
def brief(x, n=650):
    return re.sub(r'\s+',' ',x)[:n]
# 1) Algum Nivel01 contem field/SEQUENCE/instrText?
print("=== Nivel01 com instrText/SEQUENCE/referencia de numeracao ===")
for i,p in enumerate(paras):
    if '<w:instrText' in p or 'SEQUENCE' in p or 'PAGEREF' in p or 'w:fldSimple' in p:
        t=text_of(p)
        print(f"[{i}] {t[:40]!r} tem fieldcode: {', '.join(set(re.findall(r'>\s*([A-Z]+)\s',p))) or 'sim'}")
print()
# 2) XML cru dos paragrafos 800-812 (FORMALIZAÇÂO/VIGENCIA) e 970-982 (FORE)
print("=== Primeiros 200 chars do xml de cada Nivel01 no range 795-1000 ===")
for i,p in enumerate(paras):
    if not (795<=i<=1000): continue
    if '<w:t' not in p: continue
    t=text_of(p)
    if not t: continue
    mark='>>>' if i in (973,975,981) else '   '
    print(mark, i, t[:40])
print()
print("=== XML cru dos parametros 973,975,981 (DOS CASOS/ALTERAÇÕES/FORO) pPr + primeiros runs ===")
for target in (973,975,981):
    p=paras[target]
    pp=(re.search(r'<w:pPr>.*?</w:pPr>',p,re.S) or (None,'SEM pPr'))[0]
    first=pp
    print(f"\n[--- {target}: {text_of(p)[:40]} ---]")
    print(brief(pp))
