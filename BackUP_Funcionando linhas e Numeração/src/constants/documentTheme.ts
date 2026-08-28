/**
 * Centralização das Constantes de Tema, Tipografia, Cores, Bordas, Espaçamentos e Configurações de Exportação (Word e PDF).
 * Garante paridade absoluta entre a Pré-visualização na tela (HTML/DOM), Microsoft Word (.docx) e Adobe PDF (.pdf).
 */

import { WordExportOptions } from '../types';

export interface PdfExportOptions {
  fonte?: string;
  tamanhoFonte?: number;
  corTexto?: string;
  corVariavel?: string;
  variaveisVermelhas?: boolean;
  alinhamento?: string;
  margemSuperiorPt?: number;
  margemInferiorPt?: number;
  margemEsquerdaPt?: number;
  margemDireitaPt?: number;
  ativarNumeracaoDocumento?: boolean;
}

export const DOCUMENT_THEME = {
  // 1. Tipografia e Fontes
  typography: {
    fontFamily: 'Calibri, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    wordFont: 'Calibri',
    pdfFont: 'Roboto',
    sizes: {
      titlePt: 14,
      subtitlePt: 11,
      sectionTitlePt: 11.5,
      bodyPt: 10.5,
      tableHeaderPt: 10,
      tableBodyPt: 9.5,
      listPt: 10.5,
      footerPt: 9,
    },
    lineHeights: {
      body: 1.35,
      table: 1.15,
      compact: 1.2,
    },
  },

  // 2. Paleta de Cores e Contraste
  colors: {
    text: '#0F172A',
    textHex: '0F172A',
    textSecondary: '#475569',
    textSecondaryHex: '475569',
    textMuted: '#94A3B8',
    textMutedHex: '94A3B8',
    tableHeaderBg: '#E2E8F0',
    tableHeaderBgHex: 'E2E8F0',
    tableBorder: '#CBD5E1',
    tableBorderHex: 'CBD5E1',
    variableRed: '#DC2626',
    variableRedHex: 'DC2626',
    primaryBlue: '#2563EB',
    primaryBlueHex: '2563EB',
    cardBg: '#FFFFFF',
  },

  // 3. Bordas e Linhas Divisórias
  borders: {
    tableBorderWidthPt: 0.5,
    tableBorderWidthWord: 4, // 1/8 pt unidades docx (4 = 0.5pt)
    tableBorderStyleWord: 'single',
    tableBorderColor: '#CBD5E1',
    tableBorderColorHex: 'CBD5E1',
    hrBorderColor: '#CBD5E1',
    hrBorderColorHex: 'CBD5E1',
    hrBorderWidthPt: 0.5,
  },

  // 4. Configurações de Tabelas (Word, PDF e Visualizador)
  table: {
    cellPadding: {
      topPt: 3,
      bottomPt: 3,
      leftPt: 5,
      rightPt: 5,
      topTwips: 85,
      bottomTwips: 85,
      leftTwips: 140,
      rightTwips: 140,
    },
    margin: {
      topPt: 6,
      bottomPt: 8,
      leftPt: 0,
      rightPt: 0,
    },
    headerRows: 1,
    cantSplit: true,
    tableHeader: true,
  },

  // 5. Espaçamentos Verticais e Margens dos Parágrafos (pt)
  spacing: {
    title: { beforePt: 0, afterPt: 8 },
    subtitle: { beforePt: 0, afterPt: 12 },
    sectionTitle: { beforePt: 10, afterPt: 4 },
    paragraph: { beforePt: 2, afterPt: 4 },
    list: { beforePt: 4, afterPt: 6 },
    hr: { beforePt: 6, afterPt: 6 },
  },

  // 6. Margens da Página e Recuos Hierárquicos
  margins: {
    indentation: {
      stepCm: 0.5,
      stepPt: 14.17,
      stepTwips: 283,
      listIndentCm: 0.5,
      listIndentPt: 14.17,
      listIndentTwips: 283,
      firstLineCm: 1.25,
    },
  },

  // 7. Opções Padrão de Exportação para Microsoft Word (.docx)
  word: {
    defaultOptions: {
      fonte: 'Calibri',
      tamanhoFonte: 10.5,
      corTexto: '#0F172A',
      corVariavel: '#DC2626',
      variaveisVermelhas: false,
      alinhamento: 'justificado',
      recuoPrimeiraLinha: 1.25,
      recuoEsquerdo: 0,
      espacoAntes: 2,
      espacoDepois: 4,
      entreLinhas: 1.15,
      pagina: 'A4',
      margemSuperiorCm: 2.0,
      margemInferiorCm: 2.0,
      margemEsquerdaCm: 2.0,
      margemDireitaCm: 2.0,
      ativarNumeracaoDocumento: false,
      nivelMaximoNumeracao: 9,
      tituloTamanhoFonte: 14,
      tituloNegrito: true,
      tituloSublinhado: false,
      secaoTamanhoFonte: 11.5,
      secaoNegrito: true,
      secaoSublinhado: false,
      cabecalhoDistancia: 0.8,
      rodapeDistancia: 0.5,
      recuoLista: 0.5,
    } as Required<WordExportOptions>,
  },

  // 8. Opções Padrão de Exportação para Adobe PDF (.pdf)
  pdf: {
    defaultOptions: {
      fonte: 'Roboto',
      tamanhoFonte: 10.5,
      corTexto: '#0F172A',
      corVariavel: '#DC2626',
      variaveisVermelhas: false,
      alinhamento: 'justify',
      margemSuperiorPt: 56.7,
      margemInferiorPt: 56.7,
      margemEsquerdaPt: 56.7,
      margemDireitaPt: 56.7,
      ativarNumeracaoDocumento: false,
    } as Required<PdfExportOptions>,
  },
} as const;
