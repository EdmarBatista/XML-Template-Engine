export interface TextRun {
  text: string;
  b?: boolean;
  i?: boolean;
  u?: boolean;
  strike?: boolean;
  color?: string;
  sz?: number;
  highlight?: string;
  font?: string;
}

export interface DocxParagraph {
  type: 'p' | 'h' | 'li' | 'subtitulo';
  level?: number;
  numId?: string;
  ilvl?: string;
  numFmt?: string;
  lvlText?: string;
  styleId?: string;
  runs: TextRun[];
  numeroWord?: string;
  isTitle?: boolean;
  isDocumentTitle?: boolean;
  isNumbered?: boolean;
  restartNumbering?: boolean;
}

export interface DocxTableCell {
  blocks: DocxParagraph[];
  colSpan?: number;
  vMerge?: 'restart' | 'continue';
  rowSpan?: number;
  isMergedContinuation?: boolean;
}

export interface DocxTableRow {
  cells: DocxTableCell[];
}

export interface DocxTable {
  type: 'table';
  rows: DocxTableRow[];
}

export type DocxBlock = DocxParagraph | DocxTable;
