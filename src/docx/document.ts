import JSZip from 'jszip';
import { DocxParagraph, DocxBlock, TextRun, DocxTable, DocxTableRow, DocxTableCell } from './ast';
import { DocxStyleInfo } from './types';
import { computeNextNumber, NumberingState } from './numbering';

function parseXml(xmlString: string): Document {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(xmlString, 'application/xml');
  }
  throw new Error("DOMParser not available");
}

function processRuns(pNode: Element): TextRun[] {
  const runs: TextRun[] = [];
  const rNodes = pNode.getElementsByTagName('w:r');
  for (let i = 0; i < rNodes.length; i++) {
    const rNode = rNodes[i];
    let b = false, iFlag = false, u = false, strike = false;
    const rPr = rNode.getElementsByTagName('w:rPr')[0];
    if (rPr) {
      if (rPr.getElementsByTagName('w:b').length > 0) b = true;
      if (rPr.getElementsByTagName('w:i').length > 0) iFlag = true;
      if (rPr.getElementsByTagName('w:u').length > 0) u = true;
      if (rPr.getElementsByTagName('w:strike').length > 0) strike = true;
    }
    
    let text = '';
    const tNodes = rNode.getElementsByTagName('w:t');
    for (let t = 0; t < tNodes.length; t++) {
      text += tNodes[t].textContent || '';
    }
    
    if (text) {
      runs.push({ text, b, i: iFlag, u, strike });
    }
  }
  
  // smushInlines: fuse adjacent runs with exact same formatting
  const smushed: TextRun[] = [];
  for (const run of runs) {
    if (smushed.length > 0) {
      const prev = smushed[smushed.length - 1];
      if (prev.b === run.b && prev.i === run.i && prev.u === run.u && prev.strike === run.strike) {
        prev.text += run.text;
        continue;
      }
    }
    smushed.push(run);
  }
  
  return smushed;
}

export async function parseDocument(zip: JSZip, stylesMap: Map<string, DocxStyleInfo>, numberingMap: Map<string, NumberingState>): Promise<DocxBlock[]> {
  const blocks: DocxBlock[] = [];
  const docFile = zip.file('word/document.xml');
  if (!docFile) return blocks;

  const xmlStr = await docFile.async('text');
  const doc = parseXml(xmlStr);
  const body = doc.getElementsByTagName('w:body')[0];
  if (!body) return blocks;

  for (let i = 0; i < body.children.length; i++) {
    const node = body.children[i];
    if (node.tagName === 'w:p') {
      const pPr = node.getElementsByTagName('w:pPr')[0];
      let styleId = '';
      let numId = '';
      let ilvl = '';
      let outlineLvl: number | undefined = undefined;

      if (pPr) {
        const pStyle = pPr.getElementsByTagName('w:pStyle')[0];
        if (pStyle) styleId = pStyle.getAttribute('w:val') || '';

        const numPr = pPr.getElementsByTagName('w:numPr')[0];
        if (numPr) {
          const numIdNode = numPr.getElementsByTagName('w:numId')[0];
          if (numIdNode) numId = numIdNode.getAttribute('w:val') || '';
          const ilvlNode = numPr.getElementsByTagName('w:ilvl')[0];
          if (ilvlNode) ilvl = ilvlNode.getAttribute('w:val') || '0';
        }
      }

      const styleInfo = stylesMap.get(styleId);
      if (styleInfo) {
        if (styleInfo.level !== undefined && outlineLvl === undefined) {
          outlineLvl = styleInfo.level;
        }
        if (!numId && styleInfo.numId) {
          numId = styleInfo.numId;
        }
        if (!ilvl && styleInfo.ilvl !== undefined) {
          ilvl = String(styleInfo.ilvl);
        }
      }

      // Pandoc logic: Heading > List > Paragraph
      let type: 'p' | 'h' | 'li' = 'p';
      let level = undefined;
      let numeroWord = undefined;

      if (outlineLvl !== undefined) {
        type = 'h';
        level = outlineLvl;
        if (numId && numId !== '0') {
           numeroWord = computeNextNumber(numberingMap, numId, ilvl);
        }
      } else if (numId && numId !== '0') {
        type = 'li';
        numeroWord = computeNextNumber(numberingMap, numId, ilvl);
      }
      


      // Some documents explicitly turn off numbering using numId="0"
      if (numId === '0') {
        numeroWord = undefined;
      }

      const runs = processRuns(node);
      const plainText = runs.map(r => r.text).join('').trim();
      
      // Prevent signature blocks from becoming sections or getting numbered
      if (plainText.startsWith('[Local],') || /^[_.\s]+$/.test(plainText) || plainText.startsWith('Identificação e assinatura')) {
        type = 'p';
        outlineLvl = undefined;
        level = undefined;
        numeroWord = undefined;
        numId = undefined;
      } else if (type === 'h' && (plainText.length > 100 || /[;:]\s*(e\s*)?$/.test(plainText.trim()) || /^[a-z]/.test(plainText.trim()))) {
        // If a heading is very long, it's likely a misformatted paragraph
        // Treat it as a regular paragraph/list item so it doesn't create a section hierarchy
        type = 'p';
        outlineLvl = undefined;
        level = undefined;
      }


      blocks.push({ type, level, numId, ilvl, styleId, runs, numeroWord });

    } else if (node.tagName === 'w:tbl') {
      // Very basic table parser
      blocks.push({ type: 'table', rows: [] }); 
      // Fully implementing table isn't strictly necessary for the POC, but let's do a basic walk
      const tbl = blocks[blocks.length - 1] as DocxTable;
      const trNodes = node.getElementsByTagName('w:tr');
      for (let r = 0; r < trNodes.length; r++) {
        const row: DocxTableRow = { cells: [] };
        const tcNodes = trNodes[r].getElementsByTagName('w:tc');
        for (let c = 0; c < tcNodes.length; c++) {
           // We extract text content inside TC for simplicity as a single paragraph
           const runs = processRuns(tcNodes[c]);
           row.cells.push({ blocks: [{ type: 'p', runs }] });
        }
        tbl.rows.push(row);
      }
    }
  }

  return blocks;
}
