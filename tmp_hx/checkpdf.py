mods = ['pdfminer', 'PyPDF2', 'pypdf', 'fitz', 'pdfplumber', 'pymupdf']
for m in mods:
    try:
        __import__(m)
        print('OK ', m)
    except Exception:
        print('--  ', m)
