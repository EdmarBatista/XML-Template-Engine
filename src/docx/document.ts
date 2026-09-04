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

function processRuns(
  pNode: Element,
  stylesMap: Map<string, import('./types').DocxStyleInfo>,
  defaultFormatting?: { isItalic?: boolean; isBold?: boolean; isUnderline?: boolean; color?: string }
): TextRun[] {
  const runs: TextRun[] = [];
  const rNodes = pNode.getElementsByTagName('w:r');

  // Verifica se o parágrafo possui <w:pPr><w:rPr> definindo propriedades padrão
  const pPr = pNode.getElementsByTagName('w:pPr')[0];
  const pRPr = pPr ? pPr.getElementsByTagName('w:rPr')[0] : null;
  let pItalic = defaultFormatting?.isItalic;
  let pBold = defaultFormatting?.isBold;
  let pUnderline = defaultFormatting?.isUnderline;

  if (pRPr) {
    const pI = pRPr.getElementsByTagName('w:i')[0];
    if (pI) {
      const val = pI.getAttribute('w:val');
      pItalic = val !== '0' && val !== 'false';
    }
    const pB = pRPr.getElementsByTagName('w:b')[0];
    if (pB) {
      const val = pB.getAttribute('w:val');
      pBold = val !== '0' && val !== 'false';
    }
    const pU = pRPr.getElementsByTagName('w:u')[0];
    if (pU) {
      const val = pU.getAttribute('w:val');
      pUnderline = val !== 'none' && val !== '0' && val !== 'false';
    }
  }

  for (let i = 0; i < rNodes.length; i++) {
    const rNode = rNodes[i];
    let b = pBold || false;
    let iFlag = pItalic || false;
    let u = pUnderline || false;
    let strike = false;
    const rPr = rNode.getElementsByTagName('w:rPr')[0];
    if (rPr) {
      // Verifica rStyle primeiro para herança de estilo de caractere
      const rStyleNode = rPr.getElementsByTagName('w:rStyle')[0];
      if (rStyleNode) {
        const styleId = rStyleNode.getAttribute('w:val');
        if (styleId) {
          const charStyle = stylesMap.get(styleId);
          if (charStyle) {
            if (charStyle.isItalic !== undefined) iFlag = charStyle.isItalic;
            if (charStyle.isBold !== undefined) b = charStyle.isBold;
            if (charStyle.isUnderline !== undefined) u = charStyle.isUnderline;
          }
        }
      }

      const bEl = rPr.getElementsByTagName('w:b')[0];
      if (bEl) {
        const val = bEl.getAttribute('w:val');
        b = val !== '0' && val !== 'false';
      }
      const iEl = rPr.getElementsByTagName('w:i')[0];
      if (iEl) {
        const val = iEl.getAttribute('w:val');
        iFlag = val !== '0' && val !== 'false';
      }
      const uEl = rPr.getElementsByTagName('w:u')[0];
      if (uEl) {
        const val = uEl.getAttribute('w:val');
        u = val !== 'none' && val !== '0' && val !== 'false';
      }
      if (rPr.getElementsByTagName('w:strike').length > 0) strike = true;
    }
    
    let text = '';
    for (let c = 0; c < rNode.childNodes.length; c++) {
      const child = rNode.childNodes[c] as Element;
      if (child.nodeName === 'w:t') {
        text += child.textContent || '';
      } else if (child.nodeName === 'w:br') {
        text += '\n';
      } else if (child.nodeName === 'w:tab') {
        text += ' ';
      }
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

  let firstTextBlockSeen = false;

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

        const directOutline = pPr.getElementsByTagName('w:outlineLvl')[0];
        if (directOutline) {
          const val = directOutline.getAttribute('w:val');
          if (val !== null) outlineLvl = parseInt(val, 10);
        }
      }

      const styleInfo = stylesMap.get(styleId) || stylesMap.get(styleId.toLowerCase());
      if (styleInfo) {
        if (styleInfo.outlineLvl !== undefined && outlineLvl === undefined) {
          outlineLvl = styleInfo.outlineLvl;
        }
        if (!numId && styleInfo.numId) {
          numId = styleInfo.numId;
        }
        if (!ilvl && styleInfo.ilvl !== undefined) {
          ilvl = String(styleInfo.ilvl);
        }
      }

      const runs = processRuns(node, stylesMap, styleInfo);
      const plainText = runs.map(r => r.text).join('').trim();
      if (!plainText) continue;

      let type: 'p' | 'h' | 'li' | 'subtitulo' = 'p';
      let level: number | undefined = undefined;
      let numeroWord: string | undefined = undefined;
      let numFmt: string | undefined = undefined;
      let lvlText: string | undefined = undefined;
      let isDocumentTitle = false;
      let restartNumbering = false;

      if (numId && numId !== '0') {
        const numState = numberingMap.get(numId);
        if (numState && numState.levels[ilvl]) {
          numFmt = numState.levels[ilvl].numFmt;
          lvlText = numState.levels[ilvl].lvlText;
          if (numState.overrides && numState.overrides[ilvl] !== undefined) {
            restartNumbering = true;
          }
        }
        numeroWord = computeNextNumber(numberingMap, numId, ilvl);
      }

      // Determina se o parágrafo possui numeração explícita no Word ou prefixo decimal digitado
      const hasWordNumbering = Boolean(numId && numId !== '0');
      const hasManualDecimalPrefix = /^\d+(?:\.\d+)+\.?\s+/.test(plainText);
      const isNumbered = hasWordNumbering || hasManualDecimalPrefix;

      // 1. Título do Documento (primeiro bloco de destaque em negrito ou estilo Title)
      if (
        !firstTextBlockSeen &&
        (/title|t[íi]tulo/i.test(styleId) ||
          /title|t[íi]tulo/i.test(styleInfo?.name || '') ||
          (runs.every(r => r.b || !r.text.trim()) && plainText.length < 130 && !/[;:]$/.test(plainText)))
      ) {
        isDocumentTitle = true;
        type = 'h';
        level = 1;
      }
      // 2. Headings reais de capítulo principal de seção (Nível 1)
      // Título de capítulo deve ter numeração ativa no Word (numId !== '0') ou ser ANEXO/APÊNDICE.
      // Se numId for '0', a numeração foi explicitamente desligada no Word para este parágrafo, caracterizando subtítulo/tópico interno.
      else if (
        /^(?:ANEXO|AP[ÊE]NDICE)\s+[I|V|X\d]+/i.test(plainText) ||
        (styleInfo?.isHeading && (styleInfo.level === 1 || outlineLvl === 0) && numId !== '0' && !plainText.endsWith('.') && !plainText.endsWith(';'))
      ) {
        type = 'h';
        level = 1;
      }
      // 3. Subtítulos do Word (inclui estilos de subtítulo/sem numeração OU títulos com numeração desligada numId="0")
      else if (
        styleInfo?.isSubtitle ||
        (numId === '0' && (styleInfo?.isHeading || outlineLvl !== undefined)) ||
        /semnum|semblack|subtitle|subt[íi]tulo/i.test(styleId)
      ) {
        type = 'subtitulo';
        if (outlineLvl !== undefined) {
          level = outlineLvl + 1;
        } else if (styleInfo?.paragraphLevel !== undefined) {
          level = styleInfo.paragraphLevel;
        } else if (styleInfo?.level !== undefined) {
          level = styleInfo.level;
        } else {
          level = 2;
        }
      }
      // 4. Listas reais (romanos, letras, bullets, parágrafos de lista)
      else if (
        styleId === 'PargrafodaLista' ||
        /list/i.test(styleId) ||
        numFmt === 'upperRoman' ||
        numFmt === 'lowerRoman' ||
        numFmt === 'lowerLetter' ||
        numFmt === 'upperLetter' ||
        numFmt === 'bullet' ||
        (numeroWord && (numeroWord === '•' || (numeroWord.endsWith(')') && !numeroWord.includes('.')))) ||
        (!hasWordNumbering && /^(?:[a-zA-Z]\)|[ivxlcdm]+\)|•|\-)\s+/i.test(plainText))
      ) {
        type = 'li';
      } else {
        // 5. Parágrafo comum de texto
        // Se isNumbered for true, será numerado; se false, é tratado como texto normal sem numeração (<p numerado="false">)
        type = 'p';
      }

      firstTextBlockSeen = true;

      blocks.push({
        type,
        level,
        numId: numId || undefined,
        ilvl: ilvl || undefined,
        numFmt,
        lvlText,
        styleId: styleId || undefined,
        runs,
        numeroWord,
        isTitle: type === 'h',
        isDocumentTitle,
        isNumbered,
        restartNumbering,
      });

    } else if (node.tagName === 'w:tbl') {
      const tbl: DocxTable = { type: 'table', rows: [] };
      const trNodes = node.getElementsByTagName('w:tr');

      for (let r = 0; r < trNodes.length; r++) {
        const row: DocxTableRow = { cells: [] };
        const tcNodes = trNodes[r].getElementsByTagName('w:tc');
        for (let c = 0; c < tcNodes.length; c++) {
          const tc = tcNodes[c];
          let colSpan: number | undefined = undefined;
          let vMerge: 'restart' | 'continue' | undefined = undefined;

          // Propriedades da célula (w:tcPr)
          const tcPr = tc.getElementsByTagName('w:tcPr')[0];
          if (tcPr) {
            const gridSpanNode = tcPr.getElementsByTagName('w:gridSpan')[0];
            if (gridSpanNode) {
              const gsVal = parseInt(gridSpanNode.getAttribute('w:val') || '1', 10);
              if (gsVal > 1) colSpan = gsVal;
            }

            const vMergeNode = tcPr.getElementsByTagName('w:vMerge')[0];
            if (vMergeNode) {
              const vmVal = vMergeNode.getAttribute('w:val');
              if (vmVal === 'restart') {
                vMerge = 'restart';
              } else {
                // <w:vMerge/> sem val ou com val="continue" significa continuidade vertical
                vMerge = 'continue';
              }
            }
          }

          const runs = processRuns(tc, stylesMap);
          row.cells.push({
            blocks: [{ type: 'p', runs }],
            colSpan,
            vMerge,
            rowSpan: vMerge === 'restart' ? 1 : undefined,
            isMergedContinuation: vMerge === 'continue',
          });
        }
        tbl.rows.push(row);
      }

      // Calcula o rowSpan efetivo para as células que iniciaram com vMerge="restart"
      for (let r = 0; r < tbl.rows.length; r++) {
        for (let c = 0; c < tbl.rows[r].cells.length; c++) {
          const cell = tbl.rows[r].cells[c];
          if (cell.vMerge === 'restart') {
            let span = 1;
            for (let nextR = r + 1; nextR < tbl.rows.length; nextR++) {
              const nextCell = tbl.rows[nextR].cells[c];
              if (nextCell && nextCell.vMerge === 'continue') {
                span++;
                nextCell.isMergedContinuation = true;
              } else {
                break;
              }
            }
            cell.rowSpan = span > 1 ? span : undefined;
          }
        }
      }

      blocks.push(tbl);
    }
  }

  return blocks;
}
