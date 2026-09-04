/* Tipos compartilhados da conversão .docx → XML. */

export interface NumberingLevelInfo {
  numFmt: string;
  lvlText: string;
  outlineLvl?: number;
  isBullet: boolean;
}

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

export interface DocxParagraphInfo {
  index: number;
  text: string;
  normalizedText: string;
  level?: number;
  isHeading?: boolean;
  isSubtitle?: boolean;
  paragraphLevel?: number;
  isAutomaticNumbered: boolean;
  numId?: string;
  ilvl?: number;
  styleId?: string;
  styleName?: string;
  numFmt?: string;
  lvlText?: string;
  isBullet?: boolean;
  isListParagraph?: boolean;
  /**
   * Número EXIBIDO pelo Word para este parágrafo quando ele é um nível de capítulo
   * (nível de numeração %1.). É calculado na passagem de pós-processamento aplicando
   * o reinício de numeração (startOverride) — SÓ a estrutura do Word, sem ler o texto.
   */
  exibido?: number;
}

export interface ExtractedComment {
  id: string;
  texto: string;
  trecho: string;
}

