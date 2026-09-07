import re

with open('README.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace mammoth
content = content.replace(", `mammoth` (Conversão DOCX -> XML)", " (Leitura Nativa DOCX -> XML)")

# Match block to extract
pattern = r"(---\n+## 🛠️ Stack Tecnológica.*?\n)---\n+## 📋 Schema do Template XML"
match = re.search(pattern, content, re.DOTALL)
if match:
    extracted_block = match.group(1)
    
    # Remove from original
    content = content[:match.start()] + "---\n\n## 📋 Schema do Template XML" + content[match.end():]
    
    insert_pattern = r"---\n+## 💻 Desenvolvimento e Execução"
    insert_match = re.search(insert_pattern, content)
    
    if insert_match:
        content = content[:insert_match.start()] + extracted_block + content[insert_match.start():]
        with open('README.md', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Success")
    else:
        print("Could not find dev section")
else:
    print("Could not find stack section")
