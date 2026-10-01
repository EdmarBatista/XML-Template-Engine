# -*- coding: utf-8 -*-
from pdfminer.high_level import extract_text
txt = extract_text('modelo-de-termo-de-referencia-servicos-e-obras-lei-no-14-133-mai-26.pdf')
print("TAMANHO:", len(txt))
open('tmp_hx/pdf_texto.txt', 'w', encoding='utf8').write(txt)
# busca trechos
import re
idx_foro = txt.find('FORO')
print('primeiro FORO idx', idx_foro)
# mostrar janela
def jan(texto, termo, before=400, after=2200):
    i = texto.find(termo)
    if i < 0: 
        print('NAO ACHOU', termo); return
    s = texto[max(0,i-before): i+after]
    print('----- janela p/ ', termo, ' -----')
    print(s)
jan(txt, 'FORO')
# Registros que nao caracterizam
jan(txt, 'Registros que na')
