import JSZip from 'jszip';
import { DocxStyleInfo } from './types';

function parseXml(xmlString: string): Document {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(xmlString, 'application/xml');
  }
  throw new Error("DOMParser not available");
}

export async function parseStyles(zip: JSZip): Promise<Map<string, DocxStyleInfo>> {
  const stylesMap = new Map<string, DocxStyleInfo>();
  const stylesXmlFile = zip.file('word/styles.xml');
  if (!stylesXmlFile) return stylesMap;

  const stylesXmlStr = await stylesXmlFile.async('text');
  const doc = parseXml(stylesXmlStr);
  const styleNodes = doc.getElementsByTagName('w:style');

  // First pass: extract raw properties and basedOn
  const rawStyles = new Map<string, {
    styleId: string;
    name: string;
    outlineLvl?: number;
    numId?: string;
    ilvl?: number;
    isItalic?: boolean;
    isBold?: boolean;
    isUnderline?: boolean;
    color?: string;
    basedOn?: string;
  }>();

  for (let i = 0; i < styleNodes.length; i++) {
    const styleNode = styleNodes[i];
    const styleId = styleNode.getAttribute('w:styleId') || '';
    
    let name = '';
    const nameNode = styleNode.getElementsByTagName('w:name')[0];
    if (nameNode) name = nameNode.getAttribute('w:val') || '';

    let basedOn = '';
    const basedOnNode = styleNode.getElementsByTagName('w:basedOn')[0];
    if (basedOnNode) basedOn = basedOnNode.getAttribute('w:val') || '';

    let outlineLvl: number | undefined;
    const outlineLvlNode = styleNode.getElementsByTagName('w:outlineLvl')[0];
    if (outlineLvlNode) {
      const val = outlineLvlNode.getAttribute('w:val');
      if (val !== null) outlineLvl = parseInt(val, 10);
    }

    let numId: string | undefined;
    let ilvl: number | undefined;
    const numPrNode = styleNode.getElementsByTagName('w:numPr')[0];
    if (numPrNode) {
      const nIdNode = numPrNode.getElementsByTagName('w:numId')[0];
      if (nIdNode) numId = nIdNode.getAttribute('w:val') || undefined;
      const ilvlNode = numPrNode.getElementsByTagName('w:ilvl')[0];
      if (ilvlNode) {
        const iVal = ilvlNode.getAttribute('w:val');
        if (iVal !== null) ilvl = parseInt(iVal, 10);
      }
    }

    let isItalic: boolean | undefined;
    let isBold: boolean | undefined;
    let isUnderline: boolean | undefined;
    let color: string | undefined;

    const rPrNode = styleNode.getElementsByTagName('w:rPr')[0];
    if (rPrNode) {
      const iNode = rPrNode.getElementsByTagName('w:i')[0];
      if (iNode) {
        const val = iNode.getAttribute('w:val');
        isItalic = val !== '0' && val !== 'false';
      }
      const bNode = rPrNode.getElementsByTagName('w:b')[0];
      if (bNode) {
        const val = bNode.getAttribute('w:val');
        isBold = val !== '0' && val !== 'false';
      }
      const uNode = rPrNode.getElementsByTagName('w:u')[0];
      if (uNode) {
        const val = uNode.getAttribute('w:val');
        isUnderline = val !== 'none' && val !== '0' && val !== 'false';
      }
      const colorNode = rPrNode.getElementsByTagName('w:color')[0];
      if (colorNode) {
        const val = colorNode.getAttribute('w:val');
        if (val) color = val; // Store 'auto' to prevent parent inheritance
      }
    }

    rawStyles.set(styleId, { styleId, name, outlineLvl, numId, ilvl, isItalic, isBold, isUnderline, color, basedOn });
  }

  // Second pass: resolve inheritance
  for (const [styleId, raw] of rawStyles.entries()) {
    let current: any = raw;
    let finalOutlineLvl = raw.outlineLvl;
    let finalNumId = raw.numId;
    let finalIlvl = raw.ilvl;
    let finalIsItalic = raw.isItalic;
    let finalIsBold = raw.isBold;
    let finalIsUnderline = raw.isUnderline;
    let finalColor = raw.color;
    const visited = new Set<string>();

    while (current && current.basedOn && !visited.has(current.styleId)) {
      visited.add(current.styleId);
      current = rawStyles.get(current.basedOn);
      if (current) {
        if (finalOutlineLvl === undefined) finalOutlineLvl = current.outlineLvl;
        if (finalNumId === undefined) finalNumId = current.numId;
        if (finalIlvl === undefined) finalIlvl = current.ilvl;
        if (finalIsItalic === undefined) finalIsItalic = current.isItalic;
        if (finalIsBold === undefined) finalIsBold = current.isBold;
        if (finalIsUnderline === undefined) finalIsUnderline = current.isUnderline;
        if (finalColor === undefined) finalColor = current.color;
      }
    }
    
    if (finalColor === 'auto') {
      finalColor = undefined;
    }

    // Fallback de outlineLvl via nomenclatura se não especificado explicitamente na hierarquia do estilo
    // Apenas para Heading / Título explícitos, nunca para estilos de parágrafo com recuo numérico ("Nível 1..N")
    const lowerName = (raw.name || '').toLowerCase();
    const lowerId = (styleId || '').toLowerCase();
    if (finalOutlineLvl === undefined) {
      if (/heading|t[íi]tulo/i.test(lowerName) || /heading|t[íi]tulo/i.test(lowerId)) {
        const match = (lowerName + ' ' + lowerId).match(/(?:heading|t[íi]tulo)\s*0*(\d+)/i);
        if (match) finalOutlineLvl = parseInt(match[1], 10) - 1;
        else if (lowerName === 'title' || lowerName === 'title 1' || lowerName === 'título') finalOutlineLvl = 0;
        else if (lowerName === 'subtitle' || lowerName === 'subtítulo') finalOutlineLvl = 1;
      }
    }

    const isSub =
      /semnum|semblack|sem\s*num/i.test(lowerName) ||
      /semnum|semblack|sem\s*num/i.test(lowerId) ||
      /^subt[íi]tulo$|^subtitle$/i.test(lowerName) ||
      /^subt[íi]tulo$|^subtitle$/i.test(lowerId);

    const isBodyOrOptional = /opcional|corpo|normal|char|corpodotexto/i.test(lowerName) || /opcional|corpo|normal|char/i.test(lowerId);
    
    let isHeading = false;
    let level: number | undefined = undefined;
    let paragraphLevel: number | undefined = undefined;

    if (finalNumId === '0') {
      // Explicitamente sem numeração
      level = undefined;
      isHeading = false;
    } else if (isSub) {
      // Subtítulo
      level = undefined;
      isHeading = false;
    } else if (!isBodyOrOptional && finalOutlineLvl !== undefined) {
      if (finalOutlineLvl === 0) {
        isHeading = true;
        level = 1;
      } else {
        // Títulos de subnível ou parágrafos multiníveis
        const matchHeading = (lowerName + ' ' + lowerId).match(/(?:heading|t[íi]tulo|titulo)\s*0?(\d+)/i);
        if (matchHeading) {
          const hLevel = parseInt(matchHeading[1], 10);
          if (hLevel <= 3) {
            isHeading = true;
            level = hLevel;
          } else {
            paragraphLevel = hLevel;
          }
        } else {
          paragraphLevel = finalOutlineLvl + 1;
        }
      }
    }

    stylesMap.set(styleId, {
      styleId,
      name: raw.name,
      outlineLvl: finalOutlineLvl,
      level,
      paragraphLevel,
      isHeading,
      isSubtitle: isSub,
      numId: finalNumId,
      ilvl: finalIlvl,
      isItalic: finalIsItalic,
      isBold: finalIsBold,
      isUnderline: finalIsUnderline,
      color: finalColor
    });
    if (raw.name && raw.name !== styleId) {
      stylesMap.set(raw.name.toLowerCase(), stylesMap.get(styleId)!);
    }
  }

  return stylesMap;
}
