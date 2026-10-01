# -*- coding: utf-8 -*-
# Extração por coordenadas: para cada página, obtém as linhas de texto (LTTextLine)
# e seu conteúdo. Localiza linhas cujo texto 'significativo' casa com um alvo e captura
# o primeiro token numérico no começo DA MESMA linha (número do item), evitando linha anterior.
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextContainer, LTTextLine, LTChar

def norm(s):
    return ' '.join(s.split()).lower()

target_tokens = ['foro', 'das cláusulas do contrato', 'obrigações do contratante',
                 'responsabilidades do ...', 'registros', 'anexo ii', 'disposições finais',
                 'vigência e prorrogação', 'da extinção contratual', 'fica definido o foro',
                 'conforme art. 92', 'sessão judiciária', 'pagamento', 'recebimento']

def lines_map():
    seen=0
    out=[]
    pages=list(extract_pages('modelo-de-termo-de-referencia-servicos-e-obras-lei-no-14-133-mai-26.pdf'))
    for pno,page in enumerate(pages):
        for el in page:
            if isinstance(el, LTTextContainer):
                for line in el:
                    if isinstance(line, LTTextLine):
                        t=line.get_text()
                        if t.strip():
                            out.append((pno, round(line.y0,1), round(line.x0,1), norm(t)))
    return out

lines=lines_map()
print('linhas extraidas:', len(lines))
# imprime vizinhança textual de cada interesse (todos caps nivel1 convertidas para comparar)
interests=[
 'condições gerais da contratação','fundamentação e descrição da necessidade','modelo de execução do objeto',
 'modelo de gestão do contrato','critérios de medição e pagamento','infrações e sanções administrativas',
 'estimativas do valor da contratação','disposições finais','formalização da contratação',
 'obrigações do contratante','alterações','foro','anexo ii','fora','dos casos omissos',
 'registros que não caracterizam alterações','fica definido o foro']
for it in interests:
    hits=[L for L in lines if norm(it)[:20] in L[3]]
    # pegue primeira a um casamento razoável de linha que começa
    if not hits:
        print(f'--- {it[:30]}: não achado ---'); continue
    p,y,x,n= hits[0]
    print(f'--- {it[:34]}  (p{p+1} y{y} x{x}) :: {n[:90]}')
