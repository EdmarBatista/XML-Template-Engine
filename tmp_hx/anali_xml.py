# -*- coding: utf-8 -*-
# Analisa o .docx e simula a numeração automática do Word (outline/nível) do trecho FORO
# e adjacências, para servir de "verdade" para comparar com o HTML convertido.
import re, zipfile, sys

DOCX = 'modelo-de-termo-de-referencia-servicos-e-obras-lei-no-14-133-mai-26.docx'
z = zipfile.ZipFile(DOCX)
docx = z.read('word/document.xml').decode('utf8')
styles = z.read('word/styles.xml').decode('utf8') if 'word/styles.xml' in z.namelist() else ''
numbering = z.read('word/numbering.xml').decode('utf8') if 'word/numbering.xml' in z.namelist() else ''

paras = re.findall(r'<w:p\b.*?</w:p>', docx, re.S)

def text(p):
    return re.sub(r'\s+', ' ', ''.join(re.findall(r'<w:t(?:\s[^>]*)?>([^<]*)</w:t>', p))).strip()

def attr(p_or_el, tag):
    m = re.search(r'<w:' + tag + r'\b[^>]*?w:val="([^"]*)"', p_or_el)
    return m.group(1) if m else None

# ---- Styles: estilo -> (numId, ilvl, outlineLvl, basedOn) resolvidos recursivamente ----
raw = {}
for m in re.finditer(r'<w:style\b(?P<head>[^>]*)w:type="paragraph"[^>]*>(?P<body>[\s\S]*?)</w:style>', styles):
    head, body = m.group('head'), m.group('body')
    sid = (re.search(r'w:styleId="([^"]*)"', head) or [None, None])
    sid = sid[1] if isinstance(sid, list) else sid
    name = (re.search(r'<w:name w:val="([^"]*)"', body) or [None, ''])[1]
    based = (re.search(r'<w:basedOn w:val="([^"]*)"', body) or [None, None])[1]
    numpr = re.search(r'<w:numPr>([\s\S]*?)</w:numPr>', body)
    nid = il = ol = None
    if numpr:
        seq = numpr.group(1)
        il = (re.search(r'<w:ilvl w:val="(\d+)"', seq) or [None, None])[1]
        nid = (re.search(r'<w:numId w:val="(\d+)"', seq) or [None, None])[1]
    ol = (re.search(r'<w:outlineLvl w:val="(\d+)"', body) or [None, None])[1]
    raw[sid] = dict(name=name, numId=nid, ilvl=il, outlineLvl=ol, basedOn=based)

STY = raw

def resolve_style(sid, seen=None):
    seen = seen or set()
    if sid in seen or sid not in STY:
        return {}
    seen.add(sid)
    info = {'numId': STY[sid]['numId'], 'ilvl': STY[sid]['ilvl'], 'outlineLvl': STY[sid]['outlineLvl']}
    base = STY[sid]['basedOn']
    if base:
        bi = resolve_style(base, seen)
        for k in ('numId', 'ilvl', 'outlineLvl'):
            if info[k] is None:
                info[k] = bi.get(k)
    return info

def para_outline(p):
    """Retorna outlineLvl (0..8) resolvido; None se bloqueado/inexistente."""
    # numId 0 desliga numeração
    pr = re.search(r'<w:pPr>([\s\S]*?)</w:pPr>', p)
    body = pr.group(1) if pr else ''
    numpr = re.search(r'<w:numPr>([\s\S]*?)</w:numPr>', body)
    direct_num = None
    if numpr:
        dnum = (re.search(r'<w:numId w:val="(\d+)"', numpr.group(1)) or [None, None])[1]
        direct_num = dnum
    sid = (re.search(r'<w:pStyle w:val="([^"]*)"', body) or [None, None])[1]
    selvl = (re.search(r'<w:outlineLvl w:val="(\d+)"', body) or [None, None])[1]
    if selvl is not None:
        return int(selvl), None
    ri = resolve_style(sid) if sid else {}
    if direct_num == '0':
        return None, sid
    if ri.get('outlineLvl') is not None:
        return int(ri['outlineLvl']), sid
    # sem outline -> parágrafo comum (None) ou herdado numeração decimal p/ lista
    return None, sid

# para_itens de lista (numeração própria) - não confundir com níveis de seção
out = []
for i, p in enumerate(paras):
    t = text(p)
    sid = (re.search(r'<w:pPr>([\s\S]*?)<w:pStyle w:val="([^"]*)"', p) or [None, None, None])
    # simplificação: pegar pStyle
    ms = re.search(r'<w:pPr>([\s\S]*?)</w:pPr>', p)
    body = ms.group(1) if ms else p
    ps = (re.search(r'<w:pStyle w:val="([^"]*)"', body) or [None, None])[1]
    if not ps:
        continue
    out.append((i, ps, text(p)))

# Escolhe referências a título com estilo Nivel01 (a numeração de capitulo vem do nivel do estilo)
print("Paragrafos com estilo Nivel01 (capitulos/titulos de topo) no docx:")
cap = [(i, ps, t) for (i, ps, t) in out if ps and re.search(r'Nivel01|Nivel1$|Nvel1', ps) and 'SemNum' not in ps]
for i, ps, t in cap[:40]:
    print(f"  [{i}] {ps!r}: {t[:60]}")
print("Total:", len(cap))
