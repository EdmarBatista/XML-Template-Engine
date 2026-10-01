# -*- coding: utf-8 -*-
# Procura nos w:t literal prefixos numericos (ex '8.1 ', '9. FORO', '9.1 ') nos paragrafos,
# para saber se o numero ja esta digitado no texto (e o app/PDF usa esse) vs numero automatico.
import re, os
docx=open('tmp_hx/oszip/word/document.xml',encoding='utf8').read()
paras=re.findall(r'<w:p\b.*?</w:p>', docx, re.S)
def text_of(p):
    return re.sub(r'\s+',' ',''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p))).strip()
# imprime parágrafos que comecam com digitos/ponto (candidato numero manual) nos intervalos finais
for lo,hi,label in ((780,1000,'FINAL'),(0,300,'INICIO')):
    print(f'=== parágrafos com prefixo numerico no intervalos [{lo}-{hi}] ===')
    for i,p in enumerate(paras):
        if not(lo<=i<=hi): continue
        t=text_of(p)
        if not t: continue
        if re.match(r'^(\d+([\.\-\)]|\s+$)|(\d+)\.(\d+)[\.\-–—\s)]|^[a-z][\.\)])',t):
            print(f'[{i:>4}] {t[:60]}')
