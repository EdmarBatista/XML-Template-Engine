const fs = require('fs');

let content = fs.readFileSync('src/docx/generator.ts', 'utf-8');

// We need to replace everything from `const sectionStack: number[] = [];` to `while (sectionStack.length > 0) {`

const newLoop = `
  interface StackItem {
    level: number;
    isHeading: boolean;
    isNumbered: boolean;
  }
  const sectionStack: StackItem[] = [];
  let tableCounter = 1;
  let lastContextLabel = '';

  for (const block of blocks) {
    if (block.type === 'table') {
      const t = block;
      const indentStr = '  '.repeat(sectionStack.length + 1);
      
      const tableRotulo = lastContextLabel ? \`Tabela: \${lastContextLabel}\` : \`Tabela \${tableCounter}\`;
      const tableId = \`tb_\${normalizarIdentificadorValido(tableRotulo, 'tabela_' + tableCounter)}\`;
      tableCounter++;
      
      const colLabels: string[] = [];
      const colIds: string[] = [];
      
      if (t.rows && t.rows.length > 0) {
        for (let c = 0; c < t.rows[0].cells.length; c++) {
          const headerText = t.rows[0].cells[c].blocks.map((b: any) => b.runs ? b.runs.map((r: any) => r.text).join('') : '').join(' ').trim() || \`Coluna \${c + 1}\`;
          colLabels.push(headerText);
          colIds.push(normalizarIdentificadorValido(headerText, \`coluna_\${c + 1}\`));
        }
      }
      
      const rowsJson: any[] = [];
      for (let r = 1; r < (t.rows?.length || 0); r++) {
        const rowData: Record<string, string> = {};
        for (let c = 0; c < t.rows[r].cells.length; c++) {
          const cId = colIds[c] || \`coluna_\${c + 1}\`;
          rowData[cId] = t.rows[r].cells[c].blocks.map((b: any) => b.runs ? b.runs.map((run: any) => run.text).join('') : '').join('\\n').trim();
        }
        rowsJson.push(rowData);
      }
      
      if (rowsJson.length === 0 && colIds.length > 0) {
        const initialEmptyRow: Record<string, string> = {};
        colIds.forEach(id => initialEmptyRow[id] = '');
        rowsJson.push(initialEmptyRow);
      }
      
      jsonInicial[tableId] = rowsJson;
      
      xml += \`\${indentStr}<tabela borda="true">\\n\`;
      xml += \`\${indentStr}  <cabecalho>\\n\`;
      xml += \`\${indentStr}    <linha>\\n\`;
      for (const label of colLabels) {
        xml += \`\${indentStr}      <coluna>\${escapeXml(label)}</coluna>\\n\`;
      }
      xml += \`\${indentStr}    </linha>\\n\`;
      xml += \`\${indentStr}  </cabecalho>\\n\`;
      xml += \`\${indentStr}  <foreach lista="\${tableId}" var="item">\\n\`;
      xml += \`\${indentStr}    <linha>\\n\`;
      for (const cId of colIds) {
        xml += \`\${indentStr}      <coluna>{{item.\${cId}}}</coluna>\\n\`;
      }
      xml += \`\${indentStr}    </linha>\\n\`;
      xml += \`\${indentStr}  </foreach>\\n\`;
      xml += \`\${indentStr}</tabela>\\n\`;
      continue;
    }

    // It's a paragraph or heading
    const p = block as DocxParagraph;
    const text = runsToHtml(p.runs).trim();
    if (!text) continue;

    const rawText = text.replace(/<[^>]+>/g, '');
    lastContextLabel = rawText.substring(0, 50);

    const isHeading = block.type === 'h';
    const isNumbered = p.numeroWord !== undefined && p.numId !== '0';
    const isList = p.ilvl !== undefined || isNumbered;

    let targetLevel = 1;
    
    if (isHeading) {
      targetLevel = p.level || 1;
    } else {
      let baseLevel = 0;
      for (let i = sectionStack.length - 1; i >= 0; i--) {
        if (sectionStack[i].isHeading) {
          baseLevel = sectionStack[i].level;
          break;
        }
      }
      if (isList) {
        const listDepth = p.ilvl !== undefined ? parseInt(p.ilvl, 10) + 1 : 1;
        targetLevel = baseLevel + listDepth;
      } else {
        // Plain paragraph goes into the current section level
        targetLevel = sectionStack.length > 0 ? sectionStack[sectionStack.length - 1].level : 1;
      }
    }

    // Pop sections that are deeper than targetLevel
    while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level > targetLevel) {
      sectionStack.pop();
      const indentStr = '  '.repeat(sectionStack.length + 1);
      xml += \`\${indentStr}</secao>\\n\`;
    }

    // Pop sections if it's the SAME level but we need to create a new one (heading always creates a new one, or if numerar status changes)
    if (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level === targetLevel) {
      const top = sectionStack[sectionStack.length - 1];
      if (isHeading || top.isHeading || top.isNumbered !== isNumbered) {
        sectionStack.pop();
        const indentStr = '  '.repeat(sectionStack.length + 1);
        xml += \`\${indentStr}</secao>\\n\`;
      }
    }

    // Push new sections to reach targetLevel
    while (sectionStack.length < targetLevel) {
      const newLevel = sectionStack.length + 1;
      const indentStr = '  '.repeat(sectionStack.length + 1);
      
      if (newLevel === targetLevel) {
        // This is the actual target level we are creating
        if (isHeading) {
          xml += \`\${indentStr}<secao titulo="\${escapeXml(text)}">\\n\`;
          sectionStack.push({ level: newLevel, isHeading: true, isNumbered: false });
        } else {
          xml += \`\${indentStr}<secao>\\n\`;
          sectionStack.push({ level: newLevel, isHeading: false, isNumbered: isNumbered });
          const contentIndent = '  '.repeat(sectionStack.length + 1);
          xml += \`\${contentIndent}<p>\${text}</p>\\n\`;
        }
      } else {
        // We are creating an intermediate level to reach targetLevel
        xml += \`\${indentStr}<secao>\\n\`;
        sectionStack.push({ level: newLevel, isHeading: false, isNumbered: false });
      }
    }
    
    // If we were already at targetLevel and didn't pop/push, we just append <p>
    // Wait, the while loops above guarantee sectionStack.length === targetLevel
    // Did we just push the current block?
    // If newLevel === targetLevel in the loop, we handled it.
    // But what if targetLevel was already reached (we didn't push a new section)?
    // Then we just need to append <p>.
    // Let's check if we just pushed the section. The easiest way is to set a flag.
  }
`;

// Let's refine the script to just string replace properly
let startIdx = content.indexOf('const sectionStack: number[] = [];');
if (startIdx === -1) {
    startIdx = content.indexOf('const sectionStack:');
}
let endIdx = content.indexOf('while (sectionStack.length > 0) {', startIdx);

if (startIdx > -1 && endIdx > -1) {
  let before = content.substring(0, startIdx);
  let after = content.substring(endIdx);
  
  // Refined new loop logic
  const refinedLoop = `
  interface StackItem {
    level: number;
    isHeading: boolean;
    isNumbered: boolean;
  }
  const sectionStack: StackItem[] = [];
  let tableCounter = 1;
  let lastContextLabel = '';

  for (const block of blocks) {
    if (block.type === 'table') {
      const t = block as DocxTable;
      const indentStr = '  '.repeat(sectionStack.length + 1);
      
      const tableRotulo = lastContextLabel ? \`Tabela: \${lastContextLabel}\` : \`Tabela \${tableCounter}\`;
      const tableId = \`tb_\${normalizarIdentificadorValido(tableRotulo, 'tabela_' + tableCounter)}\`;
      tableCounter++;
      
      const colLabels: string[] = [];
      const colIds: string[] = [];
      
      if (t.rows && t.rows.length > 0) {
        for (let c = 0; c < t.rows[0].cells.length; c++) {
          const headerText = t.rows[0].cells[c].blocks.map((b: any) => b.runs ? b.runs.map((r: any) => r.text).join('') : '').join(' ').trim() || \`Coluna \${c + 1}\`;
          colLabels.push(headerText);
          colIds.push(normalizarIdentificadorValido(headerText, \`coluna_\${c + 1}\`));
        }
      }
      
      const rowsJson: any[] = [];
      for (let r = 1; r < (t.rows?.length || 0); r++) {
        const rowData: Record<string, string> = {};
        for (let c = 0; c < t.rows[r].cells.length; c++) {
          const cId = colIds[c] || \`coluna_\${c + 1}\`;
          rowData[cId] = t.rows[r].cells[c].blocks.map((b: any) => b.runs ? b.runs.map((run: any) => run.text).join('') : '').join('\\n').trim();
        }
        rowsJson.push(rowData);
      }
      
      if (rowsJson.length === 0 && colIds.length > 0) {
        const initialEmptyRow: Record<string, string> = {};
        colIds.forEach(id => initialEmptyRow[id] = '');
        rowsJson.push(initialEmptyRow);
      }
      
      jsonInicial[tableId] = rowsJson;
      
      xml += \`\${indentStr}<tabela borda="true">\\n\`;
      xml += \`\${indentStr}  <cabecalho>\\n\`;
      xml += \`\${indentStr}    <linha>\\n\`;
      for (const label of colLabels) {
        xml += \`\${indentStr}      <coluna>\${escapeXml(label)}</coluna>\\n\`;
      }
      xml += \`\${indentStr}    </linha>\\n\`;
      xml += \`\${indentStr}  </cabecalho>\\n\`;
      xml += \`\${indentStr}  <foreach lista="\${tableId}" var="item">\\n\`;
      xml += \`\${indentStr}    <linha>\\n\`;
      for (const cId of colIds) {
        xml += \`\${indentStr}      <coluna>{{item.\${cId}}}</coluna>\\n\`;
      }
      xml += \`\${indentStr}    </linha>\\n\`;
      xml += \`\${indentStr}  </foreach>\\n\`;
      xml += \`\${indentStr}</tabela>\\n\`;
      continue;
    }

    const p = block as DocxParagraph;
    const text = runsToHtml(p.runs).trim();
    if (!text) continue;

    const rawText = text.replace(/<[^>]+>/g, '');
    lastContextLabel = rawText.substring(0, 50);

    const isHeading = block.type === 'h';
    const isNumbered = p.numeroWord !== undefined && p.numId !== '0';
    const isList = p.ilvl !== undefined || isNumbered;

    let targetLevel = 1;
    
    if (isHeading) {
      targetLevel = p.level || 1;
    } else {
      let baseLevel = 0;
      for (let i = sectionStack.length - 1; i >= 0; i--) {
        if (sectionStack[i].isHeading) {
          baseLevel = sectionStack[i].level;
          break;
        }
      }
      if (isList) {
        const listDepth = p.ilvl !== undefined ? parseInt(p.ilvl, 10) + 1 : (isNumbered ? 1 : 0);
        targetLevel = baseLevel + listDepth;
      } else {
        targetLevel = sectionStack.length > 0 ? sectionStack[sectionStack.length - 1].level : 1;
      }
    }

    // Pop sections deeper than targetLevel
    while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level > targetLevel) {
      sectionStack.pop();
      const indentStr = '  '.repeat(sectionStack.length + 1);
      xml += \`\${indentStr}</secao>\\n\`;
    }

    // Pop sections at the same level if they shouldn't group
    // We break group if: new is heading OR old is heading OR numerar status differs
    if (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level === targetLevel) {
      const top = sectionStack[sectionStack.length - 1];
      if (isHeading || top.isHeading || top.isNumbered !== isNumbered) {
        sectionStack.pop();
        const indentStr = '  '.repeat(sectionStack.length + 1);
        xml += \`\${indentStr}</secao>\\n\`;
      }
    }

    // Push new sections to reach targetLevel
    let pushedNew = false;
    while (sectionStack.length < targetLevel) {
      const newLevel = sectionStack.length + 1;
      const indentStr = '  '.repeat(sectionStack.length + 1);
      
      if (newLevel === targetLevel) {
        pushedNew = true;
        if (isHeading) {
          xml += \`\${indentStr}<secao titulo="\${escapeXml(text)}">\\n\`;
          sectionStack.push({ level: newLevel, isHeading: true, isNumbered: false });
        } else {
          xml += \`\${indentStr}<secao>\\n\`;
          sectionStack.push({ level: newLevel, isHeading: false, isNumbered: isNumbered });
          const contentIndent = '  '.repeat(sectionStack.length + 1);
          xml += \`\${contentIndent}<p>\${text}</p>\\n\`;
        }
      } else {
        xml += \`\${indentStr}<secao>\\n\`;
        sectionStack.push({ level: newLevel, isHeading: false, isNumbered: false });
      }
    }
    
    // If we didn't push a new section at targetLevel, we just append <p>
    if (!pushedNew && !isHeading) {
      const contentIndent = '  '.repeat(sectionStack.length + 1);
      xml += \`\${contentIndent}<p>\${text}</p>\\n\`;
    }
  }

  `;
  
  fs.writeFileSync('src/docx/generator.ts', before + refinedLoop + after);
}
