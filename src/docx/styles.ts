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
    } else {
      const lowerName = name.toLowerCase();
      if (/heading|t[íi]tulo|n[íi]vel/i.test(lowerName)) {
        const match = lowerName.match(/(?:heading|t[íi]tulo|n[íi]vel)\s*0*(\d+)/i);
        if (match) outlineLvl = parseInt(match[1], 10) - 1;
        else if (lowerName === 'title' || lowerName === 'title 1' || lowerName === 'título') outlineLvl = 0;
        else if (lowerName === 'subtitle' || lowerName === 'subtítulo') outlineLvl = 1;
      }
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

    rawStyles.set(styleId, { styleId, name, outlineLvl, numId, ilvl, basedOn });
  }

  // Second pass: resolve inheritance
  for (const [styleId, raw] of rawStyles.entries()) {
    let current: any = raw;
    let finalOutlineLvl = raw.outlineLvl;
    let finalNumId = raw.numId;
    let finalIlvl = raw.ilvl;
    const visited = new Set<string>();

    while (current && current.basedOn && !visited.has(current.styleId)) {
      visited.add(current.styleId);
      current = rawStyles.get(current.basedOn);
      if (current) {
        if (finalOutlineLvl === undefined) finalOutlineLvl = current.outlineLvl;
        if (finalNumId === undefined) finalNumId = current.numId;
        if (finalIlvl === undefined) finalIlvl = current.ilvl;
      }
    }

    stylesMap.set(styleId, {
      styleId,
      name: raw.name,
      outlineLvl: finalOutlineLvl,
      level: finalOutlineLvl !== undefined ? finalOutlineLvl + 1 : undefined,
      isHeading: finalOutlineLvl !== undefined,
      isSubtitle: finalOutlineLvl === 1 && raw.name.toLowerCase().includes('sub'),
      numId: finalNumId,
      ilvl: finalIlvl
    });
  }

  return stylesMap;
}
