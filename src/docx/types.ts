/* Tipos compartilhados da conversão .docx → XML. */

export interface DocxStyleInfo {
  styleId: string;
  name: string;
  outlineLvl?: number; // 0 for Level 1, 1 for Level 2, etc.
  isHeading: boolean;
  isSubtitle?: boolean;
  level?: number;
  paragraphLevel?: number;
  numId?: string;
  ilvl?: number;
  isItalic?: boolean;
  isBold?: boolean;
  isUnderline?: boolean;
  color?: string;
}

export interface ExtractedComment {
  id: string;
  texto: string;
  trecho: string;
}
