import { DocxBlock, DocxParagraph, DocxTable, TextRun } from './ast';
import { escapeXml, normalizarIdentificadorValido } from './domText';

function runsToHtml(runs: TextRun[]): string {
  let out = '';
  for (const r of runs) {
    let t = escapeXml(r.text);
    if (r.b) t = `<b>${t}</b>`;
    if (r.i) t = `<i>${t}</i>`;
    if (r.u) t = `<u>${t}</u>`;
    if (r.strike) t = `<s>${t}</s>`;
    out += t;
  }
  return out;
}

export function generateXmlFromAst(blocks: DocxBlock[], fileName: string): { xml: string, jsonInicial: Record<string, any> } {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<documento>\n  <!-- Convertido de ${escapeXml(fileName)} -->\n`;
  const jsonInicial: Record<string, any> = {};
  
  
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
      
      const tableRotulo = lastContextLabel ? `Tabela: ${lastContextLabel}` : `Tabela ${tableCounter}`;
      const tableId = `tb_${normalizarIdentificadorValido(tableRotulo, 'tabela_' + tableCounter)}`;
      tableCounter++;
      
      const colLabels: string[] = [];
      const colIds: string[] = [];
      
      if (t.rows && t.rows.length > 0) {
        for (let c = 0; c < t.rows[0].cells.length; c++) {
          const headerText = t.rows[0].cells[c].blocks.map((b: any) => b.runs ? b.runs.map((r: any) => r.text).join('') : '').join(' ').trim() || `Coluna ${c + 1}`;
          colLabels.push(headerText);
          colIds.push(normalizarIdentificadorValido(headerText, `coluna_${c + 1}`));
        }
      }
      
      const rowsJson: any[] = [];
      for (let r = 1; r < (t.rows?.length || 0); r++) {
        const rowData: Record<string, string> = {};
        for (let c = 0; c < t.rows[r].cells.length; c++) {
          const cId = colIds[c] || `coluna_${c + 1}`;
          rowData[cId] = t.rows[r].cells[c].blocks.map((b: any) => b.runs ? b.runs.map((run: any) => run.text).join('') : '').join('\n').trim();
        }
        rowsJson.push(rowData);
      }
      
      if (rowsJson.length === 0 && colIds.length > 0) {
        const initialEmptyRow: Record<string, string> = {};
        colIds.forEach(id => initialEmptyRow[id] = '');
        rowsJson.push(initialEmptyRow);
      }
      
      jsonInicial[tableId] = rowsJson;
      
      xml += `${indentStr}<tabela borda="true">\n`;
      xml += `${indentStr}  <cabecalho>\n`;
      xml += `${indentStr}    <linha>\n`;
      for (const label of colLabels) {
        xml += `${indentStr}      <coluna>${escapeXml(label)}</coluna>\n`;
      }
      xml += `${indentStr}    </linha>\n`;
      xml += `${indentStr}  </cabecalho>\n`;
      xml += `${indentStr}  <foreach lista="${tableId}" var="item">\n`;
      xml += `${indentStr}    <linha>\n`;
      for (const cId of colIds) {
        xml += `${indentStr}      <coluna>{{item.${cId}}}</coluna>\n`;
      }
      xml += `${indentStr}    </linha>\n`;
      xml += `${indentStr}  </foreach>\n`;
      xml += `${indentStr}</tabela>\n`;
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
      xml += `${indentStr}</secao>\n`;
    }

    // Pop sections at the same level if they shouldn't group
    // We break group if: new is heading OR old is heading OR numerar status differs
    if (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level === targetLevel) {
      const top = sectionStack[sectionStack.length - 1];
      if (isHeading || top.isHeading || top.isNumbered !== isNumbered) {
        sectionStack.pop();
        const indentStr = '  '.repeat(sectionStack.length + 1);
        xml += `${indentStr}</secao>\n`;
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
          xml += `${indentStr}<secao titulo="${escapeXml(text)}">\n`;
          sectionStack.push({ level: newLevel, isHeading: true, isNumbered: false });
        } else {
          xml += `${indentStr}<secao>\n`;
          sectionStack.push({ level: newLevel, isHeading: false, isNumbered: isNumbered });
          const contentIndent = '  '.repeat(sectionStack.length + 1);
          xml += `${contentIndent}<p>${text}</p>\n`;
        }
      } else {
        xml += `${indentStr}<secao>\n`;
        sectionStack.push({ level: newLevel, isHeading: false, isNumbered: false });
      }
    }
    
    // If we didn't push a new section at targetLevel, we just append <p>
    if (!pushedNew && !isHeading) {
      const contentIndent = '  '.repeat(sectionStack.length + 1);
      xml += `${contentIndent}<p>${text}</p>\n`;
    }
  }

  while (sectionStack.length > 0) {
    sectionStack.pop();
    const indentStr = '  '.repeat(sectionStack.length + 1);
    xml += `${indentStr}</secao>\n`;
  }
  
  xml += `</documento>`;
  
  return { xml, jsonInicial };
}
