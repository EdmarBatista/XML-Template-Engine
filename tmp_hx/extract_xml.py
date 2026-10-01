# -*- coding: utf-8 -*-
# Extrai TODO o .docx para uma pasta tmp (oszip) para inspecao via xml real.
import zipfile, os
def main():
    src = 'modelo-de-termo-de-referencia-servicos-e-obras-lei-no-14-133-mai-26.docx'
    out = 'tmp_hx/oszip'
    os.makedirs(out, exist_ok=True)
    z = zipfile.ZipFile(src)
    for name in z.namelist():
        # nomes seguros: ignora ../ e barras
        safe = name.replace('\\', '/')
        if safe.startswith('/') or '..' in safe.split('/'):
            continue
        target = os.path.join(out, safe)
        os.makedirs(os.path.dirname(target), exist_ok=True) if os.path.dirname(target) else None
        with open(target, 'wb') as f:
            f.write(z.read(name))
    print('extraidos:', len(z.namelist()))
    print('\n'.join(z.namelist()))
if __name__ == '__main__':
    main()
