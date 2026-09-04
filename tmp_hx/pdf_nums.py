# -*- coding: utf-8 -*-
# Extrai do PDF, ao redor dos títulos de capítulo, o número que antecede (numeração verdadeira).
import re
txt = open('tmp_hx/pdf_texto.txt', encoding='utf8').read()
# normalizar preservando quebras
titles = ['CONDIÇÕES GERAIS DA CONTRATAÇÃO','FUNDAMENTAÇÃO E DESCRIÇÃO DA NECESSIDADE',
          'MODELO DE EXECUÇÃO DO OBJETO','MODELO DE GESTÃO DO CONTRATO','CRITÉRIOS DE MEDIÇÃO E PAGAMENTO',
          'INFRAÇÕES E SANÇÕES ADMINISTRATIVAS','ESTIMATIVAS DO VALOR DA CONTRATAÇÃO',
          'DISPOSIÇÕES FINAIS','FORMALIZAÇÃO DA CONTRATAÇÃO','OBRIGAÇÕES DO CONTRATANTE','FORO',
          'ALTERAÇÕES','DOS CASOS OMISSOS','FLUXO MÁQUINAS','DESCRIÇÃO DA SOLUÇÃO']
def jan(t, needle, before=120, after=40):
    i=t.find(needle)
    if i<0: return None
    return t[max(0,i-before):i+after]
for tt in titles:
    seg=jan(txt, tt)
    if seg is None:
        print(f'—— {tt[:30]}  -> não achado no pdf'); continue
    # captura número no fim da janela-before
    m=re.search(r'([IVXLCDM]+\.|\d+(?:\.\d+)*\.|ANEXO\s+[IVXLC]+)\s*$', seg[:seg.find(tt)].strip())
    num = m.group(1) if m else '(?)'
    print(f'{num:10s} | {tt[:45]}  [txt:{seg.find(tt)}]')
