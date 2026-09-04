export type TextRun = {
  text: string;
  b?: boolean;
  i?: boolean;
  u?: boolean;
  strike?: boolean;
};

export type DocxParagraph = {
  type: 'p' | 'h' | 'li';
  level?: number;
  numId?: string;
  ilvl?: string;
  numFmt?: string;
  styleId?: string;
  runs: TextRun[];
  numeroWord?: string; // Explicit number text from Word if computed
  isTitle?: boolean;
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
};

export type DocxBlock = DocxParagraph | DocxTable;

export type DocxDocument = {
  blocks: DocxBlock[];
};
