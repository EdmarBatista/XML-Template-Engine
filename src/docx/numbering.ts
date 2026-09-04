import JSZip from 'jszip';

function parseXml(xmlString: string): Document {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(xmlString, 'application/xml');
  }
  throw new Error("DOMParser not available");
}

export type NumberingLevel = {
  start: number;
  numFmt: string;
  lvlText: string;
};

export type NumberingState = {
  abstractNumId: string;
  levels: Record<string, NumberingLevel>;
  counters: Record<string, number>;
  overrides: Record<string, number>;
  seen?: boolean;
};

export async function parseNumbering(zip: JSZip): Promise<Map<string, NumberingState>> {
  const numberingMap = new Map<string, NumberingState>();
  const numFile = zip.file('word/numbering.xml');
  if (!numFile) return numberingMap;

  const xmlStr = await numFile.async('text');
  const doc = parseXml(xmlStr);

  const abstractNums = new Map<string, Record<string, NumberingLevel>>();
  const absNodes = doc.getElementsByTagName('w:abstractNum');
  for (let i = 0; i < absNodes.length; i++) {
    const absNode = absNodes[i];
    const absId = absNode.getAttribute('w:abstractNumId') || '';
    const levels: Record<string, NumberingLevel> = {};

    const lvlNodes = absNode.getElementsByTagName('w:lvl');
    for (let j = 0; j < lvlNodes.length; j++) {
      const lvlNode = lvlNodes[j];
      const ilvl = lvlNode.getAttribute('w:ilvl') || '';
      
      let start = 1;
      const startNode = lvlNode.getElementsByTagName('w:start')[0];
      if (startNode) start = parseInt(startNode.getAttribute('w:val') || '1', 10);
      
      let numFmt = '';
      const numFmtNode = lvlNode.getElementsByTagName('w:numFmt')[0];
      if (numFmtNode) numFmt = numFmtNode.getAttribute('w:val') || '';
      
      let lvlText = '';
      const lvlTextNode = lvlNode.getElementsByTagName('w:lvlText')[0];
      if (lvlTextNode) lvlText = lvlTextNode.getAttribute('w:val') || '';

      levels[ilvl] = { start, numFmt, lvlText };
    }
    abstractNums.set(absId, levels);
  }

  const numNodes = doc.getElementsByTagName('w:num');
  // Initialize counters per abstractNumId, not per numId
  const sharedCounters = new Map<string, Record<string, number>>();
  
  for (let i = 0; i < numNodes.length; i++) {
    const numNode = numNodes[i];
    const numId = numNode.getAttribute('w:numId') || '';
    const absRefNode = numNode.getElementsByTagName('w:abstractNumId')[0];
    if (absRefNode) {
      const absId = absRefNode.getAttribute('w:val') || '';
      const levels = abstractNums.get(absId) || {};
      
      if (!sharedCounters.has(absId)) {
        const counters: Record<string, number> = {};
        for (const [ilvl, lvl] of Object.entries(levels)) {
          counters[ilvl] = lvl.start - 1;
        }
        sharedCounters.set(absId, counters);
      }
      
      
      const overrides: Record<string, number> = {};
      const overrideNodes = numNode.getElementsByTagName('w:lvlOverride');
      for (let k = 0; k < overrideNodes.length; k++) {
        const ilvlOverride = overrideNodes[k].getAttribute('w:ilvl');
        const startOverrideNode = overrideNodes[k].getElementsByTagName('w:startOverride')[0];
        if (ilvlOverride && startOverrideNode) {
          overrides[ilvlOverride] = parseInt(startOverrideNode.getAttribute('w:val') || '1', 10);
        }
      }

      numberingMap.set(numId, {
        abstractNumId: absId,
        levels,
        counters: sharedCounters.get(absId)!,
        overrides
      });
    }
  }

  return numberingMap;
}

const ROMAN_NUMERALS: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I']
];

export function toRoman(counter: number): string {
  if (counter <= 0 || counter >= 4000) return counter.toString();
  let result = '';
  let val = counter;
  for (const [num, str] of ROMAN_NUMERALS) {
    while (val >= num) {
      result += str;
      val -= num;
    }
  }
  return result;
}

export function toLetter(counter: number): string {
  if (counter <= 0) return counter.toString();
  let result = '';
  let n = counter;
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

export function formatNumber(counter: number, format: string): string {
  if (format === 'decimal') return counter.toString();
  if (format === 'lowerLetter') return toLetter(counter).toLowerCase();
  if (format === 'upperLetter') return toLetter(counter);
  if (format === 'lowerRoman') return toRoman(counter).toLowerCase();
  if (format === 'upperRoman') return toRoman(counter);
  if (format === 'bullet') return '•';
  return counter.toString();
}

export function computeNextNumber(numberingMap: Map<string, NumberingState>, numId: string, ilvl: string): string {
  if (!numberingMap.has(numId)) return '';

  const state = numberingMap.get(numId)!;
  if (!state.levels[ilvl]) return '';

  if (!state.seen) {
    state.seen = true;
    for (const [lvl, startVal] of Object.entries(state.overrides)) {
      state.counters[lvl] = startVal - 1;
      for (const l in state.levels) {
        if (parseInt(l) > parseInt(lvl)) {
          state.counters[l] = Math.max(0, state.levels[l].start - 1);
        }
      }
    }
  }


  // Increment current level
  state.counters[ilvl] = (state.counters[ilvl] || 0) + 1;
  
  // Reset all deeper levels
  for (const l in state.levels) {
    if (parseInt(l) > parseInt(ilvl)) {
      state.counters[l] = Math.max(0, state.levels[l].start - 1);
    }
  }

  let text = state.levels[ilvl].lvlText;
  
  // Replace placeholders like %1, %2 with formatted counters
  for (const l in state.levels) {
    const levelIdx = parseInt(l) + 1;
    const format = state.levels[l].numFmt;
    const count = state.counters[l] || 1;
    const formattedCount = formatNumber(count, format);
    text = text.replace(new RegExp(`%${levelIdx}`, 'g'), formattedCount);
  }
  
  return text;
}
