# -*- coding: utf-8 -*-
# Inspeciona word/numbering.xml deste doc: abstractNum -> níveis, num -> abstract, startOverride
import re, zipfile
z=zipfile.ZipFile('modelo-de-termo-de-referencia-servicos-e-obras-lei-no-14-133-mai-26.docx')
NM=z.read('word/numbering.xml').decode('utf8')
def just(x): return x or ''

def show():
    # abstractNum
    for m in re.finditer(r'<w:abstractNum\b([^>]*)w:abstractNumId="(\d+)"[^>]*>([\s\S]*?)</w:abstractNum>', NM):
        attrs=m.group(1); aid=m.group(2); body=m.group(3)
        absId = (re.search(r'w:abstractNumId="(\d+)"', attrs) or [None, aid])
        abs_ = absId[1] if isinstance(absId,list) else absId
        print('abstractNum', abs_)
        for l in re.finditer(r'<w:lvl\b[^>]*w:ilvl="(\d+)"[^>]*>([\s\S]*?)</w:lvl>', body):
            il=l.group(1); lb=l.group(2)
            start=(re.search(r'<w:start w:val="(\d+)"',lb) or [None,'1'])[1]
            fmt=(re.search(r'<w:numFmt w:val="([^"]*)"',lb) or [None,'?'])[1]
            txt=(re.search(r'<w:lvlText w:val="([^"]*)"',lb) or [None,''])[1]
            lgl=(re.search(r'<w:isLgl',lb) or None)
            linkNull= bool(re.search(r'<w:lvlText',lb)) 
            print(f'   ilvl={il} start={start} fmt={fmt} txt={just(txt)} lgl={"Y" if lgl else "-"}')
    print('== num -> abstract + overrides ==')
    for m in re.finditer(r'<w:num\b[^>]*w:numId="(\d+)"[^>]*>([\s\S]*?)</w:num>', NM):
        nid=m.group(1); body=m.group(2)
        absid=(re.search(r'<w:abstractNumId w:val="(\d+)"',body) or [None,None])[1]
        lvlover=re.findall(r'<w:lvlOverride\b[^>]*>([\s\S]*?)</w:lvlOverride>', body)
        extra=''
        ov=[]
        for lo in lvlover:
            il=(re.search(r'<w:lvlOverride\b[^>]*w:ilvl="(\d+)"', '<w:lvlOverride w:ilvl=x>') or [None,None])[1]
        # captura ilvl+start de overrides
        for m2 in re.finditer(r'<w:lvlOverride\b[^>]*?w:ilvl="(\d+)"[^>]*>(?:[^>]*?)<w:startOverride w:val="(\d+)"', body):
            ov.append((m2.group(1), m2.group(2)))
        print(f' num {nid} -> abstract {absid} overrides={ov}')

show()
