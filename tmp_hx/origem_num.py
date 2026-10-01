# -*- coding: utf-8 -*-
# Descobre a ORIGEM do número dos capítulos 1..12/FORO=9 no docx.
# Testa: o pPr do parágrafo tem w:numPr? o pStyle herda numId via cadeia? ou usa outline direto?
import re, zipfile
z=zipfile.ZipFile('modelo-de-termo-de-referencia-servicos-e-obras-lei-no-14-133-mai-26.docx')
docx=z.read('word/document.xml').decode('utf8')
ST=z.read('word/styles.xml').decode('utf8')
paras=re.findall(r'<w:p\b.*?</w:p>', docx, re.S)
def text(p): return re.sub(r'\s+',' ',''.join(re.findall(r'<w:t(?:\s[^>]*)?>([^<]*)</w:t>',p))).strip()

# styles propagados
def style_chain_tbl():
    raw={}
    for m in re.finditer(r'<w:style\b(?P<h>[^>]*?)\bw:styleId="(?P<id>[^"]*)"[^>]*>(?P<b>[\s\S]*?)</w:style>', ST):
        body=m.group('b'); ty=(re.search(r'w:type="([^"]*)"',m.group('h')) or [None,''])[1]
        raw[m.group('id')] = dict(base=(re.search(r'<w:basedOn w:val="([^"]*)"',body) or [None,None])[1],
            num=(re.search(r'<w:numId w:val="(\d+)"',body) or [None,None])[1])
    return raw
SC=style_chain_tbl()
def chain_style(sid):
    seen=set(); r={}; cur=sid
    while cur and cur in SC and cur not in seen:
        seen.add(cur); s=SC[cur]
        if r.get('num') is None: r['num']=s['num']
        cur=s['base']
    return r

targets={'condições gerais','modelo de gestão do contrato','críério de medição','infrações e sanções','estimativas','disposições finais','foro','formalização da contratação','obrigações do contratante','obrigações do contratado','alterações','dos casos omissos','vigência e prorrogação','modelo de execução do objeto','da extinção contratual'}
seen=set()
for i,p in enumerate(paras):
    t=text(p).lower()
    key=None
    for tg in targets:
        if tg in t and len(tg)>=8:
            key=tg; break
    if key is None or key in seen: 
        continue
    seen.add(key)
    body=(re.search(r'<w:pPr>([\s\S]*?)</w:pPr>',p) or [None,''])[1]
    pstyle=(re.search(r'<w:pStyle w:val="([^"]*)"',body) or [None,''])[1]
    # numPr direto?
    numpr=re.search(r'<w:numPr>([\s\S]*?)</w:numPr>',body)
    nid_direct=nil_direct=None
    if numpr:
        nid_direct=(re.search(r'<w:numId w:val="(\d+)"',numpr.group(1)) or [None,None])[1]
        nil_direct=(re.search(r'<w:ilvl w:val="(\d+)"',numpr.group(1)) or [None,None])[1]
    ol=(re.search(r'<w:outlineLvl w:val="(\d+)"',body) or [None,None])[1]
    stl=chain_style(pstyle) if pstyle else {}
    print(f"[{i}] text={t[:34]!r} pStyle={pstyle!r} numPrdirect={nid_direct,nil_direct} outlineDirect={ol} styleNum={stl.get('num')}")
    if len(seen)>=8: break
