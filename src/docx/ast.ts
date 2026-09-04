export type TextRun = {
  text: string;
  b?: boolean;
  i?: boolean;
  u?: boolean;
  strike?: boolean;
  color?: string;
};

export type DocxParagraph = {
  type: 'p' | 'h' | 'li' | 'subtitulo';
  level?: number;
  numId?: string;
  ilvl?: string;
  numFmt?: string;
  lvlText?: string;
  styleId?: string;
  runs: TextRun[];
  numeroWord?: string; // Explicit number text from Word if computed
  isTitle?: boolean;
  isDocumentTitle?: boolean;
  isNumbered?: boolean; // True se o parágrafo possui numeração explícita/decimal no Word
  isSpecial?: boolean;
  specialKind?: string;
  restartNumbering?: boolean;
};

export type DocxTable = {
  type: 'table';
  rows: DocxTableRow[];
};

export type DocxTableRow = {
  cells: DocxTableCell[];
};

export type DocxTableCell = {
  blocks: DocxBlock[];
  colSpan?: number;
  rowSpan?: number;
  vMerge?: 'restart' | 'continue';
  isMergedContinuation?: boolean;
};

export type DocxBlock = DocxParagraph | DocxTable;

export type DocxDocument = {
  blocks: DocxBlock[];
};
