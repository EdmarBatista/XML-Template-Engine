# -*- coding: utf-8 -*-
# Validar a rota A: em ordem no docx, que parágrafos 'Nivel01' têm numeração decimal automática
# contínua (numId resolvido !=0) e quantos chegam ANTES do FORO. A rota A faria numerar=false nos
# Nivel01 que o Word não numera (SemNum) => deixa os que contam gerar 1..N para FORO.
import re, zipfile
z = zipfile.ZipFile('modelo-de-termo-de-referencia-servicos-e-obras-lei-no-14-133-mai-26.docx')
docx = z.read('word/document.xml').decode('utf8')
ST = z.read('word/styles.xml').decode('utf8')
NM = z.read('word/numbering.xml').decode('utf8')

paras = re.findall(r'<w:p\b.*?</w:p>', docx, re.S)
def text(p): return re.sub(r'\s+',' ',''.join(re.findall(r'<w:t(?:\s[^>]*)?>([^<]*)</w:t>',p))).strip()

# styles -> numId/ilvl resolvido por base
raw={}
for m in re.finditer(r'<w:style\b[^>]*w:styleId="([^"]*)"[^>]*>([\s\S]*?)</w:style>', ST):
    sid, body = m.group(1), m.group(2)
    ty=(re.search(r'w:type="([^"]*)"', m.group(0)) or [None,'par1'])[1]
    # se tiver tipo == character não importa
    raw[sid]=dict(base=(re.search(r'<w:basedOn w:val="([^"]*)"',body) or [None,None])[1],
                  num=(re.search(r'<w:numPr>[\s\S]*?<w:numId w:val="(\d+)"',body) or [None,None])[1],
                  il=(re.search(r'<w:numPr>[\s\S]*?<w:ilvl w:val="(\d+)"',body) or [None,None])[1])
def resolve(sid, seen=None):
    seen=seen or set()
    if sid in seen or sid not in raw: return None,None
    seen.add(sid)
    d=raw[sid]
    num,il=d['num'],d['il']
    if d['base']:
        bn,bi=resolve(d['base'], seen)
        num = num or bn
        il = il or bi
    return num,il
# num->abstract e start de ilvl0 e fmt
abs_start={}; num_abs={}
# abstracts
for m in re.finditer(r'<w:abstractNum\b[^>]*?w:abstractNumId="(\d+)"[^>]*>([\s\S]*?)</w:abstractNum>', NM):
    absid, body = m.group(1), m.group(2)
    lv=(re.search(r'<w:lvl w:ilvl="0"[^>]*>[\s\S]*?<w:start w:val="(\d+)"', body) or [None,'1'])[1]
    fmt=(re.search(r'<w:lvl w:ilvl="0"[^>]*>[\s\S]*?<w:numFmt w:val="([^"]*)"', body) or [None,'decimal'])[1]
    txt=(re.search(r'<w:lvl w:ilvl="0"[^>]*>[\s\S]*?<w:lvlText w:val="([^"]*)"', body) or [None,''])[1]
    abs_start[absid]=(int(lv), fmt, txt)
for m in re.finditer(r'<w:num\b[^>]*?w:numId="(\d+)"[^>]*>([\s\S]*?)</w:num>', NM):
    nid, body = m.group(1), m.group(2)
    a=(re.search(r'<w:abstractNumId w:val="(\d+)"',body) or [None,None])[1]
    num_abs[nid]=a

# Para cada parágrafo com pStyle Nivel01 na ordem: imprime estilo, numId resolvido, semNum?
print("Nivel01 em ordem até FORO, destacando se tem numeração decimal automática:")
counter_abs=0
prev_fmt=None
rows=[]
for i,p in enumerate(paras):
    body=(re.search(r'<w:pPr>([\s\S]*?)</w:pPr>',p) or [None,''])[1]
    ps=(re.search(r'<w:pStyle w:val="([^"]*)"',body) or [None,''])[1]
    t=text(p)
    if not ps or not re.search(r'Nivel0?1$|Nivel1$', ps) or re.search(r'SemNum|SemBlack', ps, re.I):
        continue
    num,il=resolve(ps)
    if (not num) or num=='0':
        semnum=True; dstart,fmt,ltx=None,None,None
    else:
        semnum=False
        a=num_abs.get(num)
        st=(abs_start.get(a) if a is not None else None)
        if st: dstart,fmt,ltx=st
        else: dstart,fmt,ltx=1,'decimal','%1.'
    rows.append((i,ps,t,num,il,dstart,fmt,ltx))
    print(f"[{i:>3}] {ps:8s} num={num} il={il} start={dstart} fmt={fmt} :: {t[:45]}")
# re-init contador de fluxo: precisamos simular como word continua por abstract quando SAME num.
# Simplificação da rota A: cada Nivel01 é cap numerado se tiver fmt decimal e não SemNum.
numerados=[r for r in rows if r[4] not in (None,'0') and (r[6]=='decimal' or r[6]=='decimalZero')]
print("\nTotal Nivel01 decimal numerados:", len(numerados))
print("Destes, antes de FORO:", len([r for r in numerados if 'foro' not in r[3].lower()]))
# Para dar FORO=9 precisamos exatamente 8 cap anteriores numerados no MESMO fluxo contínuo;
# se numéricos de estilo compartilharem num com incremento automático isso vale.
# imprime os números se fossem 1..N sequenciais e o corte.
for n,row in enumerate(numerados, start=1):
    mark=' <== FORO' if 'foro' in row[3].lower() else ''
    print(f"  seq#{n} :: {row[3][:40]}{mark}")
