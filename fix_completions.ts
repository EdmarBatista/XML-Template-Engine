import fs from 'fs';
let content = fs.readFileSync('src/utils/xmlEditorCompletions.ts', 'utf-8');

const listSnippet = "  {\n    label: 'lista_numerada',\n    type: 'class',\n    detail: 'Lista Numerada',\n    info: 'Lista ordenada numericamente (1., 2., 3...)',\n    apply: snippet('<lista_numerada>\\n\\t<item>${1:Texto do item 1}</item>\\n\\t<item>${2:Texto do item 2}</item>\\n</lista_numerada>'),\n  },\n  {\n    label: 'lista',";

content = content.replace("  {\n    label: 'lista',", listSnippet);

fs.writeFileSync('src/utils/xmlEditorCompletions.ts', content);
