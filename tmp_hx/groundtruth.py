# -*- coding: utf-8 -*-
# Ground truth: para cada parágrafo NIVEL, resolve o número que o Word desenharia,
# percorrendo document.xml na ordem, respeitando numId/ilvl/abstract/start/lvlRestart.
# Sem heurística de texto. Só para entender o modelo a marcar na rota B.
import re, zipfile
FN='../modelo-de-termo-de-referencia-servicos-e-obras-lei-no-14-133-mai-26.docx'
z=zipfile.ZipFile(FN)
docx=z.read('word/document.xml').decode('utf8')
ST =z.read('word/styles.xml').decode('utf8')
NM =z.read('word/numbering.xml').decode('utf8')

def txt(p): return re.sub(r'\s+',' ',''.join(re.findall(r'<w:t(?:\s[^>]*)?>([^<]*)</w:t>',p))).strip()
# estilos
STY={}
for m in re.finditer(r'<w:style\b(?P<h>[^>]*?)w:type="paragraph"[^>]*>(?P<b>[\s\S]*?)</w:style>', ST):
    sid=(re.search(r'w:styleId="([^"]*)"',m.group('h')) or [None,None]);sid=sid[1]
    b=m.group('b')
    numid=(re.search(r'<w:numId w:val="(\d+)"',b) or [None,None])[1]
    ilvl =(re.search(r'<w:ilvl w:val="(\d+)"',b) or [None,None])[1]
    outl =(re.search(r'<w:outlineLvl w:val="(\d+)"',b) or [None,None])[1]
    base =(re.search(r'<w:basedOn w:val="([^"]*)"',b) or [None,None])[1]
    STY[sid]=dict(numId=numid,ilvl=ilvl,outl=outl,base=base)
def chain(sid):
    o={};cur=sid;seen=set()
    while cur and cur in STY and cur not in seen:
        seen.add(cur);d=STY[cur]
        for k in ('numId','ilvl','outl'):
            if o.get(k) is None:o[k]=d[k]
        cur=d['base']
    return o
# abstract info: numId->abstractId, e por abstractId: levels (start, numFmt, lvlRestart, isLgl)
ams={}
for m in re.finditer(r'<w:abstractNum w:abstractNumId="(\d+)"[^>]*>([\s\S]*?)</w:abstractNum>', NM):
    aid=int(m.group(1)); body=m.group(2)
    lv={}
    for l in re.finditer(r'<w:lvl w:ilvl="(\d+)"[^>]*>(?:<w:start w:val="(\d+)"[^>]*>)?([\s\S]*?)</w:lvl>', body):
        il=int(l.group(1)); rest=l.group(3)
        st=(l.group(2) or (re.search(r'<w:start w:val="(\d+)"',rest) or [None,'1'])[1])
        nf=(re.search(r'<w:numFmt w:val="([^"]*)"',rest) or [None,'decimal'])[1]
        rlst=(re.search(r'<w:lvlRestart w:val="(\d+)"',rest) or [None,None])[1]
        lv[il]=dict(start=int(st),numFmt=nf,lvlRestart=int(rlst) if rlst is not None else None)
    ams[aid]=lv
num2abs={}; num2starts={}
for m in re.finditer(r'<w:num w:numId="(\d+)"[^>]*>([\s\S]*?)</w:num>', NM):
    nid=int(m.group(1)); body=m.group(2)
    ab=(re.search(r'<w:abstractNumId w:val="(\d+)"',body) or [None,None])[1]
    num2abs[nid]=int(ab) if ab else None
    over={}
    for o in re.finditer(r'<w:lvlOverride w:ilvl="(\d+)"[^>]*>([\s\S]*?)</w:lvlOverride>', body):
        il=int(o.group(1))
        so=(re.search(r'<w:startOverride w:val="(\d+)"',o.group(2)) or [None,None])[1]
        over[il]=int(so) if so else None
    num2starts[nid]=over

paras=re.findall(r'<w:p\b.*?</w:p>', docx, re.S)
KEYS=('Nivel','Nvel','NIVEL','OutLine','Outline')
def direct_np(pbody):
    np=re.search(r'<w:numPr>([\s\S]*?)</w:numPr>',pbody)
    if not np: return {}
    s=np.group(1)
    return dict(numId=(re.search(r'<w:numId w:val="(\d+)"',s) or [None,None])[1],
                ilvl=(re.search(r'<w:ilvl w:val="(\d+)"',s) or [None,None])[1])

# contadores por (abstract-level-key) realmente global por abstract? use por abstract
counters={}
rows=[]
stopls={'foro','dos casos omissos','alterações','disposições finais','regiões','infrações','contratação'}
for i,p in enumerate(paras):
    t=txt(p)
    if not t: continue
    pp=(re.search(r'<w:pPr>([\s\S]*?)</w:pPr>',p) or [None,''])[1]
    ps=(re.search(r'<w:pStyle w:val="([^"]*)"',pp) or [None,None])[1]
    if not ps: continue
    isN=ps.lower().startswith('nivel') or ps.lower().startswith('nvel')
    lower=t.lower()
    # só interessam títulos de nível OU trechos marcantes
    if not (isN or any(lower.startswith(x) for x in ('foro','alterações','dos casos omissos','disposições','infrações e','obrigações','formalização'))):
        continue
    res=chain(ps)
    dnp=direct_np(pp)
    if dnp.get('numId'): res['numId']=dnp['numId']; res['ilvl']=dnp.get('ilvl') or res.get('ilvl')
    numId=res.get('numId'); ilvl=res.get('ilvl')
    il=int(ilvl) if ilvl is not None else None
    show=isN or lower.startswith(('foro',))
    if not show: continue
    numId_i=int(numId) if numId else None
    tag=''
    if numId_i in num2abs:
        ab=num2abs[numId_i]
        nf=ams.get(ab,{}).get(il,{}).get('numFmt','')
        if nf in ('bullet','') and numId_i: tag=('BULLET' if nf=='bullet' else '?fmt'+str(nf))
        # compute current value
        key=(numId_i,il)  # note: restart across abstract by abstractId new numId
        st=num2starts.get(numId_i,{}).get(il)
        astart=ams.get(ab,{}).get(il,{}).get('start',1)
        start0 = (astart if st is None else st)
        cv=counters.get(key)
        if cv is None:
            cv=start0
        row=f"{t[:52]:52s} N{ps:8s} num={numId_i} ilvl={il} ab={ab} nf={nf} start={start0} => valorAtual={cv}"
        # increment for next same-key
        counters[key]=cv+1
        print(f"[{i:>3}] {row}")
    else:
        print(f"[{i:>3}] {t[:52]:52s} N{ps:8s} num=off/sem {numId} ilvl={il}")
