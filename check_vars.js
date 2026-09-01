import fs from 'fs';

const content = fs.readFileSync('src/data/templates/catalogoCompletoTags.ts', 'utf8');
const xmlMatch = content.match(/xml:\s*`([\s\S]+?)`/);
if (xmlMatch) {
  const xml = xmlMatch[1];
  console.log("Found XML, length:", xml.length);
  
  const declared = new Set();
  const idRegex = /id="([^"]+)"/g;
  let match;
  while ((match = idRegex.exec(xml)) !== null) {
    declared.add(match[1]);
  }
  
  const used = new Set();
  const varRegex = /\{\{([a-zA-Z0-9_]+)[^{}]*\}\}/g;
  while ((match = varRegex.exec(xml)) !== null) {
    used.add(match[1]);
  }
  
  const exprRegex = /expr="([^"]+)"/g;
  while ((match = exprRegex.exec(xml)) !== null) {
    const expr = match[1];
    const varsInExpr = expr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    for (const v of varsInExpr) {
      if (v !== 'true' && v !== 'false' && v !== 'and' && v !== 'or' && v !== 'null') {
        used.add(v);
      }
    }
  }

  const foreachRegex = /<foreach[^>]+lista="([^"]+)"/g;
  while ((match = foreachRegex.exec(xml)) !== null) {
    used.add(match[1]);
  }

  const notDeclared = [];
  for (const u of used) {
    if (!declared.has(u) && u !== 'it' && u !== 'item' && u !== 'loop') {
      notDeclared.push(u);
    }
  }

  console.log("Usadas e não declaradas:", notDeclared);
  console.log("Declaradas:", Array.from(declared).sort());
}
