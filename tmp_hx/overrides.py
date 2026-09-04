# -*- coding: utf-8 -*-
# Imprime o XML de numbering p/ os <w:num numId="26"> e numId="9"> (detalhe de lvlOverride/start)
# e tambem o <w:abstractNum abstractNumId="3"> niveis 0..9 (start/numFmt/lvlRestart/isLgl/lvlText)
import re, os
NZ=open('tmp_hx/oszip/word/numbering.xml',encoding='utf8').read()
def brief(x,n=800):return re.sub(r'\s+',' ',x)[:n]
for m in re.finditer(r'<w:num w:numId="(\d+)"[^>]*>[\s\S]*?</w:num>', NZ):
    if m.group(1) in ('9','26'):
        print(f"--- <num numId={m.group(1)}> ---")
        print(brief(m.group(0)))
for ab in re.finditer(r'<w:abstractNum w:abstractNumId="(3)"[\s\S]*?</w:abstractNum>', NZ):
    print('\n=== abstractNumId=3 ===')
    seg=re.findall(r'<w:lvl w:ilvl="(\d+)"[^>]*>[\s\S]*?</w:lvl>', ab.group(0))
    # imprimir detalhe chamado lvl 0 e 1
    for l in re.finditer(r'<w:lvl w:ilvl="(\d+)"[^>]*>(?:<w:start w:val="(\d+)"[^>]*/>)?([\s\S]*?)</w:lvl>', ab.group(0)):
        il=int(l.group(1)); st=l.group(2); rest=l.group(3)
        if il in (0,1):
            st2=re.search(r'<w:start w:val="(\d+)"',rest)
            print(f" lvl{il}: start={st or ('?' )} lvlText={brief(re.search(r'<w:lvlText w:val="([^"]*)"',rest).group(1)) if re.search(r'<w:lvlText w:val="([^"]*)"',rest) else ''} fmt={brief(re.search(r'<w:numFmt w:val="([^"]*)"',rest).group(1) if re.search(r'<w:numFmt w:val="([^"]*)"',rest) else '')} lvlRestart={re.search(r'<w:lvlRestart w:val="(\d+)"',rest).group(1) if re.search(r'<w:lvlRestart w:val="(\d+)"',rest) else None} isLgl={re.search(r'<w:isLgl w:val="(\d+)"',rest).group(1) if re.search(r'<w:isLgl w:val="(\d+)"',rest) else None}")
