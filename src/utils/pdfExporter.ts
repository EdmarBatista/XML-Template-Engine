/**
 * Motor de Exportação para Adobe PDF (.pdf) e Impressão Isolada
 * Gera documentos PDF vetoriais com fidelidade tipográfica e estrutural a partir do HTML/DOM renderizado,
 * utilizando as constantes centralizadas de DOCUMENT_THEME.
 */

import { DOCUMENT_THEME, PdfExportOptions } from '../constants/documentTheme';
import {
  calcularLargurasColunasTabela,
  calcularRecuoHierarquicoCm,
  cmParaPt,
  extrairSegmentosDeDom,
  normalizarSegmentos,
  paraHexCorComHash,
  SegmentoDom,
} from './domDocumentExtractor';

// Re-exporta tipo de opções para compatibilidade
export type { PdfExportOptions };

/**
 * Resolve a instância do pdfmake.
 *
 * =====================================================================
 * POR QUE VIA CDN (e não importado do npm):
 * Para reduzir o index.html gerado pelo vite-plugin-singlefile, as libs
 * `pdfmake` + `vfs_fonts` deixaram de ser importadas aqui e passaram a ser
 * carregadas via <script> CDN no index.html, expostas em `window.pdfMake`.
 *   - Antes: index.html ≈ 3,26 MB  (gzip ≈ 1,24 MB)
 *   - Depois: index.html ≈ 1,39 MB (gzip ≈ 414 KB)  -> redução ~57%
 * Isso só é viável porque o app usa <script> externo (ver index.html),
 * o que é compatível com o bundle singlefile.
 *
 * SE VOLTAR PARA 100% OFFLINE: restaure os imports e remova os <script>
 * de CDN do index.html:
 *   import pdfMake from 'pdfmake/build/pdfmake';
 *   import pdfFonts from 'pdfmake/build/vfs_fonts';
 *   (pdfMake as any).vfs = pdfFonts?.pdfMake?.vfs || pdfFonts;
 * =====================================================================
 */
function getPdfMake() {
  const inst = (window as any).pdfMake;
  if (!inst) {
    console.warn(
      'pdfmake não está disponível. Verifique se os scripts CDN (pdfmake.min.js + vfs_fonts.js) foram carregados no index.html.'
    );
    return null;
  }
  return inst;
}

const PDF_PADROES: Required<PdfExportOptions> = {
  ...DOCUMENT_THEME.pdf.defaultOptions,
};

function segmentosParaPdfText(segmentos: SegmentoDom[], corPadrao?: string): any[] {
  return (segmentos || []).map(seg => {
    const decorations = [];
    if (seg.underline) decorations.push('underline');
    if (seg.strike) decorations.push('lineThrough');
    const cor = seg.cor ? paraHexCorComHash(seg.cor) : (corPadrao ? paraHexCorComHash(corPadrao) : undefined);
    return {
      text: seg.texto,
      fontSize: seg.tamanhoFonte,
      bold: seg.bold,
      italics: seg.italic,
      decoration: decorations.length > 0 ? decorations : undefined,
      background: seg.mark ? 'yellow' : undefined,
      color: cor,
    };
  });
}

/**
 * Converte tabela HTML em estrutura de tabela vetorial do pdfMake.
 */
function converterTabelaDomPdf(
  tabelaEl: HTMLElement,
  opcoes: Required<PdfExportOptions>
): any {
  const trElements = Array.from(tabelaEl.querySelectorAll('tr'));
  if (!trElements.length) return null;

  const cellTexts: string[][] = [];

  const body = trElements.map((tr, rIdx) => {
    const cellElements = Array.from(tr.querySelectorAll('th, td')).filter(
      c => c.getAttribute('data-ignore-export') !== 'true' &&
           c.getAttribute('data-word-ignore') !== 'true'
    );
    const isHeaderRow = tr.querySelector('th') !== null || rIdx === 0;
    const rowTexts: string[] = [];

    const cells = cellElements.map(cell => {
      const isHeader = cell.tagName.toLowerCase() === 'th' || isHeaderRow;
      const rawText = cell.textContent?.trim() || '';
      rowTexts.push(rawText);

      const segmentos = extrairSegmentosDeDom(
        cell,
        {
          bold: isHeader,
          tamanhoFonte: isHeader ? DOCUMENT_THEME.typography.sizes.tableHeaderPt : DOCUMENT_THEME.typography.sizes.tableBodyPt,
          cor: isHeader ? DOCUMENT_THEME.colors.text : undefined,
        },
        isHeader ? { ...opcoes, variaveisVermelhas: false } : opcoes
      );
      const normalizados = normalizarSegmentos(segmentos);
      const textRuns = segmentosParaPdfText(normalizados);

      return {
        text: textRuns.length ? textRuns : rawText,
        fontSize: isHeader ? DOCUMENT_THEME.typography.sizes.tableHeaderPt : DOCUMENT_THEME.typography.sizes.tableBodyPt,
        bold: isHeader,
        fillColor: isHeader ? DOCUMENT_THEME.colors.tableHeaderBg : undefined,
        lineHeight: DOCUMENT_THEME.typography.lineHeights.table,
      };
    });

    cellTexts.push(rowTexts);
    return cells;
  }).filter(row => row.length > 0);

  if (!body.length) return null;

  const maxCols = Math.max(...body.map(r => r?.length || 0), 1);
  const widths = calcularLargurasColunasTabela(cellTexts, maxCols);

  return {
    table: {
      headerRows: DOCUMENT_THEME.table.headerRows,
      widths,
      body,
    },
    layout: {
      hLineWidth: () => DOCUMENT_THEME.borders.tableBorderWidthPt,
      vLineWidth: () => DOCUMENT_THEME.borders.tableBorderWidthPt,
      hLineColor: () => DOCUMENT_THEME.borders.tableBorderColor,
      vLineColor: () => DOCUMENT_THEME.borders.tableBorderColor,
      paddingLeft: () => DOCUMENT_THEME.table.cellPadding.leftPt,
      paddingRight: () => DOCUMENT_THEME.table.cellPadding.rightPt,
      paddingTop: () => DOCUMENT_THEME.table.cellPadding.topPt,
      paddingBottom: () => DOCUMENT_THEME.table.cellPadding.bottomPt,
    },
    margin: [
      DOCUMENT_THEME.table.margin.leftPt,
      DOCUMENT_THEME.table.margin.topPt,
      DOCUMENT_THEME.table.margin.rightPt,
      DOCUMENT_THEME.table.margin.bottomPt,
    ],
  };
}

/**
 * Converte recursivamente os blocos do DOM em nós estruturados do pdfMake,
 * aplicando com exatidão numeração hierárquica e recuos calculados.
 */
function converterElementosBlocoDomPdf(
  container: HTMLElement,
  opcoes: Required<PdfExportOptions>,
  nivelSecao = 0,
  recuoSecaoCm = 0
): any[] {
  const resultado: any[] = [];
  const filhos = Array.from(container.children) as HTMLElement[];

  filhos.forEach(el => {
    if (!el || el.getAttribute('data-ignore-export') === 'true') return;

    const wordType = el.getAttribute('data-word-type');
    const tag = el.tagName.toLowerCase();

    // 1. Título do Documento (<titulo> ou <h1 data-word-type="titulo">)
    if (wordType === 'titulo' || tag === 'h1') {
      const opcoesTitulo: Required<PdfExportOptions> = {
        ...opcoes,
        corTexto: DOCUMENT_THEME.colors.text,
        corVariavel: DOCUMENT_THEME.colors.text,
        variaveisVermelhas: false,
      };
      const segmentos = extrairSegmentosDeDom(el, {
        bold: true,
        tamanhoFonte: DOCUMENT_THEME.typography.sizes.titlePt,
        cor: DOCUMENT_THEME.colors.text,
      }, opcoesTitulo);
      const textRuns = segmentosParaPdfText(normalizarSegmentos(segmentos));

      resultado.push({
        text: textRuns.length > 0 ? textRuns : (el.textContent?.trim() || ''),
        fontSize: DOCUMENT_THEME.typography.sizes.titlePt,
        bold: true,
        alignment: 'center',
        margin: [0, DOCUMENT_THEME.spacing.title.beforePt, 0, DOCUMENT_THEME.spacing.title.afterPt],
        color: DOCUMENT_THEME.colors.text,
      });
      return;
    }

    // 2. Subtítulo (<subtitulo> ou <h2 data-word-type="subtitulo">)
    if (wordType === 'subtitulo' || tag === 'h2') {
      const segmentos = extrairSegmentosDeDom(el, {
        italic: true,
        tamanhoFonte: DOCUMENT_THEME.typography.sizes.subtitlePt,
        cor: DOCUMENT_THEME.colors.textSecondary,
      }, opcoes);
      const textRuns = segmentosParaPdfText(normalizarSegmentos(segmentos));

      resultado.push({
        text: textRuns.length > 0 ? textRuns : (el.textContent?.trim() || ''),
        fontSize: DOCUMENT_THEME.typography.sizes.subtitlePt,
        italics: true,
        alignment: 'center',
        margin: [0, DOCUMENT_THEME.spacing.subtitle.beforePt, 0, DOCUMENT_THEME.spacing.subtitle.afterPt],
        color: DOCUMENT_THEME.colors.textSecondary,
      });
      return;
    }

    // 3. Container de Seção (<div data-word-type="secao">)
    if (wordType === 'secao') {
      const rawLevel = el.getAttribute('data-word-level');
      const currentLevel = rawLevel !== null ? parseInt(rawLevel, 10) : nivelSecao;
      const numerarAttr = el.getAttribute('data-word-numerar');
      const numerarSecao = numerarAttr !== 'false';

      const tituloH3 = el.querySelector(':scope > [data-word-type="secao-titulo"], :scope > h3') as HTMLElement | null;

      if (tituloH3) {
        const opcoesTitulo: Required<PdfExportOptions> = {
          ...opcoes,
          corTexto: DOCUMENT_THEME.colors.text,
          corVariavel: DOCUMENT_THEME.colors.text,
          variaveisVermelhas: false,
        };

        const segmentos = extrairSegmentosDeDom(tituloH3, {
          bold: true,
          tamanhoFonte: currentLevel === 0 ? DOCUMENT_THEME.typography.sizes.sectionTitlePt : opcoes.tamanhoFonte,
          cor: DOCUMENT_THEME.colors.text,
        }, opcoesTitulo);
        const textRuns = segmentosParaPdfText(normalizarSegmentos(segmentos));

        const recuoTituloCm = calcularRecuoHierarquicoCm(currentLevel);
        const recuoTituloPt = cmParaPt(recuoTituloCm);

        resultado.push({
          text: textRuns.length > 0 ? textRuns : (tituloH3.textContent?.trim() || ''),
          fontSize: currentLevel === 0 ? DOCUMENT_THEME.typography.sizes.sectionTitlePt : opcoes.tamanhoFonte,
          bold: true,
          alignment: 'left',
          margin: [recuoTituloPt, currentLevel === 0 ? DOCUMENT_THEME.spacing.sectionTitle.beforePt : DOCUMENT_THEME.spacing.sectionTitle.afterPt, 0, DOCUMENT_THEME.spacing.sectionTitle.afterPt],
          color: DOCUMENT_THEME.colors.text,
        });
      }

      const proximoNivel = numerarSecao ? currentLevel + 1 : currentLevel;
      const recuoConteudoCm = calcularRecuoHierarquicoCm(proximoNivel);

      const conteudoContainer = (el.querySelector(':scope > [data-word-type="secao-conteudo"]') || el) as HTMLElement;
      const filhosAProcessar = conteudoContainer === el
        ? Array.from(el.children).filter(child => child !== tituloH3) as HTMLElement[]
        : Array.from(conteudoContainer.children) as HTMLElement[];

      const wrapperVirtual = document.createElement('div');
      filhosAProcessar.forEach(c => wrapperVirtual.appendChild(c.cloneNode(true)));

      resultado.push(
        ...converterElementosBlocoDomPdf(
          wrapperVirtual,
          opcoes,
          proximoNivel,
          recuoConteudoCm
        )
      );
      return;
    }

    // 4. Título de Seção isolado (<h3 data-word-type="secao-titulo">)
    if (wordType === 'secao-titulo' || (tag === 'h3' && !el.closest('[data-word-type="secao"]'))) {
      const rawLevel = el.getAttribute('data-word-level');
      const currentLevel = rawLevel !== null ? parseInt(rawLevel, 10) : nivelSecao;

      const opcoesTitulo: Required<PdfExportOptions> = {
        ...opcoes,
        corTexto: DOCUMENT_THEME.colors.text,
        corVariavel: DOCUMENT_THEME.colors.text,
        variaveisVermelhas: false,
      };

      const segmentos = extrairSegmentosDeDom(el, {
        bold: true,
        tamanhoFonte: currentLevel === 0 ? DOCUMENT_THEME.typography.sizes.sectionTitlePt : opcoes.tamanhoFonte,
        cor: DOCUMENT_THEME.colors.text,
      }, opcoesTitulo);
      const textRuns = segmentosParaPdfText(normalizarSegmentos(segmentos));

      const recuoTituloCm = calcularRecuoHierarquicoCm(currentLevel);
      const recuoTituloPt = cmParaPt(recuoTituloCm);

      resultado.push({
        text: textRuns.length > 0 ? textRuns : (el.textContent?.trim() || ''),
        fontSize: currentLevel === 0 ? DOCUMENT_THEME.typography.sizes.sectionTitlePt : opcoes.tamanhoFonte,
        bold: true,
        alignment: 'left',
        margin: [recuoTituloPt, currentLevel === 0 ? DOCUMENT_THEME.spacing.sectionTitle.beforePt : DOCUMENT_THEME.spacing.sectionTitle.afterPt, 0, DOCUMENT_THEME.spacing.sectionTitle.afterPt],
        color: DOCUMENT_THEME.colors.text,
      });
      return;
    }

    // 5. Parágrafo (<p> ou <div data-word-type="paragrafo">)
    if (wordType === 'paragrafo' || tag === 'p') {
      const rawLevel = el.getAttribute('data-word-level');
      const levelPara = rawLevel !== null ? parseInt(rawLevel, 10) : nivelSecao;

      const tableInside = el.querySelector('table, [data-word-type="tabela-container"]');
      if (tableInside) {
        const childNodes = Array.from(el.childNodes);
        let bufferNodes: Node[] = [];

        const flushBufferAsPdfParagraph = () => {
          if (bufferNodes.length === 0) return;
          const tempDiv = document.createElement('div');
          bufferNodes.forEach(n => tempDiv.appendChild(n.cloneNode(true)));
          const segmentos = extrairSegmentosDeDom(tempDiv, {}, opcoes);
          const normalizados = normalizarSegmentos(segmentos);
          bufferNodes = [];

          if (normalizados.length > 0) {
            const recuoCalculadoCm = calcularRecuoHierarquicoCm(levelPara);
            const recuoFinalCm = recuoSecaoCm > 0 ? recuoSecaoCm : recuoCalculadoCm;
            const recuoFinalPt = cmParaPt(recuoFinalCm);

            resultado.push({
              text: segmentosParaPdfText(normalizados),
              fontSize: opcoes.tamanhoFonte,
              alignment: opcoes.alinhamento || 'justify',
              margin: [recuoFinalPt, DOCUMENT_THEME.spacing.paragraph.beforePt, 0, DOCUMENT_THEME.spacing.paragraph.afterPt],
              lineHeight: DOCUMENT_THEME.typography.lineHeights.body,
              color: opcoes.corTexto,
            });
          }
        };

        for (const child of childNodes) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const childEl = child as HTMLElement;
            if (
              childEl.tagName === 'TABLE' ||
              childEl.getAttribute('data-word-type') === 'tabela-container' ||
              childEl.querySelector('table')
            ) {
              flushBufferAsPdfParagraph();
              const actualTable = childEl.tagName === 'TABLE' ? childEl : childEl.querySelector('table');
              if (actualTable) {
                const tabela = converterTabelaDomPdf(actualTable as HTMLElement, opcoes);
                if (tabela) resultado.push(tabela);
              }
              continue;
            }
          }
          bufferNodes.push(child);
        }
        flushBufferAsPdfParagraph();
        return;
      }

      const segmentos = extrairSegmentosDeDom(el, {}, opcoes);
      const normalizados = normalizarSegmentos(segmentos);

      if (normalizados.length > 0) {
        const recuoCalculadoCm = calcularRecuoHierarquicoCm(levelPara);
        const recuoFinalCm = recuoSecaoCm > 0 ? recuoSecaoCm : recuoCalculadoCm;
        const recuoFinalPt = cmParaPt(recuoFinalCm);

        resultado.push({
          text: segmentosParaPdfText(normalizados),
          fontSize: opcoes.tamanhoFonte,
          alignment: opcoes.alinhamento || 'justify',
          margin: [recuoFinalPt, DOCUMENT_THEME.spacing.paragraph.beforePt, 0, DOCUMENT_THEME.spacing.paragraph.afterPt],
          lineHeight: DOCUMENT_THEME.typography.lineHeights.body,
          color: opcoes.corTexto,
        });
      }
      return;
    }

    // 6. Listas (<ol>, <ul>, <div data-word-type="lista">)
    if (wordType === 'lista' || tag === 'ol' || tag === 'ul') {
      const isOl = tag === 'ol' || el.getAttribute('data-word-numerada') === 'true';
      const tipoLista = (el.getAttribute('data-word-tipo-lista') || '').toLowerCase();
      const itensEl = Array.from(el.querySelectorAll(':scope > li, :scope > [data-word-type="item"]'));

      const itens = itensEl.map(item => {
        const segs = extrairSegmentosDeDom(item, {}, opcoes);
        const norm = normalizarSegmentos(segs);
        return norm.length > 0 ? { text: segmentosParaPdfText(norm) } : item.textContent?.trim() || '';
      });

      const recuoPt = cmParaPt(recuoSecaoCm > 0 ? recuoSecaoCm : DOCUMENT_THEME.margins.indentation.listIndentCm);

      if (isOl) {
        let pdfListType: any = undefined;
        if (tipoLista === 'upper-roman' || tipoLista === 'romano') pdfListType = 'upper-roman';
        else if (tipoLista === 'lower-roman' || tipoLista === 'romano_minusculo') pdfListType = 'lower-roman';
        else if (tipoLista === 'lower-alpha' || tipoLista === 'letra') pdfListType = 'lower-alpha';
        else if (tipoLista === 'upper-alpha' || tipoLista === 'letra_maiuscula') pdfListType = 'upper-alpha';

        resultado.push({
          ol: itens,
          ...(pdfListType ? { type: pdfListType } : {}),
          margin: [recuoPt + 10, DOCUMENT_THEME.spacing.list.beforePt, 0, DOCUMENT_THEME.spacing.list.afterPt],
        });
      } else {
        let pdfListType: any = undefined;
        if (tipoLista === 'circle' || tipoLista === 'circulo') pdfListType = 'circle';
        else if (tipoLista === 'square' || tipoLista === 'quadrado') pdfListType = 'square';

        resultado.push({
          ul: itens,
          ...(pdfListType ? { type: pdfListType } : {}),
          margin: [recuoPt + 10, DOCUMENT_THEME.spacing.list.beforePt, 0, DOCUMENT_THEME.spacing.list.afterPt],
        });
      }
      return;
    }

    // 7. Tabelas (<table>, <div data-word-type="tabela-container">)
    if (tag === 'table') {
      const tabela = converterTabelaDomPdf(el, opcoes);
      if (tabela) resultado.push(tabela);
      return;
    }
    if (wordType === 'tabela-container' || el.querySelector('table')) {
      const tableEl = el.querySelector('table');
      if (tableEl) {
        const tabela = converterTabelaDomPdf(tableEl as HTMLElement, opcoes);
        if (tabela) resultado.push(tabela);
        return;
      }
    }

    // 8. Linha horizontal (<hr>)
    if (tag === 'hr') {
      resultado.push({
        table: { widths: ['*'], body: [['']] },
        layout: {
          hLineWidth: () => DOCUMENT_THEME.borders.hrBorderWidthPt,
          vLineWidth: () => 0,
          hLineColor: () => DOCUMENT_THEME.borders.hrBorderColor,
        },
        margin: [0, DOCUMENT_THEME.spacing.hr.beforePt, 0, DOCUMENT_THEME.spacing.hr.afterPt],
      });
      return;
    }

    // 9. Demais containers / Blocos aninhados / if-bloco
    if (el.children.length > 0) {
      resultado.push(
        ...converterElementosBlocoDomPdf(
          el,
          opcoes,
          nivelSecao,
          recuoSecaoCm
        )
      );
    } else {
      const segmentos = extrairSegmentosDeDom(el, {}, opcoes);
      const normalizados = normalizarSegmentos(segmentos);
      if (normalizados.length > 0) {
        const recuoPt = cmParaPt(recuoSecaoCm);
        resultado.push({
          text: segmentosParaPdfText(normalizados),
          fontSize: opcoes.tamanhoFonte,
          alignment: opcoes.alinhamento || 'justify',
          margin: [recuoPt, 0, 0, DOCUMENT_THEME.spacing.paragraph.afterPt],
          lineHeight: DOCUMENT_THEME.typography.lineHeights.body,
          color: opcoes.corTexto,
        });
      }
    }
  });

  return resultado;
}

/**
 * Exporta o documento PDF diretamente a partir do elemento HTML renderizado no DOM.
 */
export async function exportarParaPdf(
  elementoDom: HTMLElement,
  nomeArquivo: string = 'documento.pdf',
  opcoes?: PdfExportOptions
): Promise<void> {
  const opts: Required<PdfExportOptions> = { ...PDF_PADROES, ...(opcoes || {}) };
  const nomeFinal = nomeArquivo.toLowerCase().endsWith('.pdf') ? nomeArquivo : `${nomeArquivo}.pdf`;

  const content = converterElementosBlocoDomPdf(elementoDom, opts, 0, 0);

  const docDefinition: any = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [opts.margemEsquerdaPt, opts.margemSuperiorPt, opts.margemDireitaPt, opts.margemInferiorPt],
    content: content.length > 0 ? content : [{ text: 'Documento sem conteúdo.', fontSize: 11 }],
    defaultStyle: {
      font: 'Roboto',
      fontSize: opts.tamanhoFonte,
      color: opts.corTexto,
      lineHeight: DOCUMENT_THEME.typography.lineHeights.body,
    },
    footer: (currentPage: number, pageCount: number) => {
      return {
        text: `${currentPage} / ${pageCount}`,
        alignment: 'right',
        fontSize: DOCUMENT_THEME.typography.sizes.footerPt,
        color: DOCUMENT_THEME.colors.textMuted,
        margin: [0, 0, opts.margemDireitaPt, 20],
      };
    },
  };

  return new Promise((resolve, reject) => {
    try {
      const pdfMakeInst = getPdfMake();
      if (!pdfMakeInst) {
        reject(new Error('pdfmake não carregado (CDN).'));
        return;
      }
      const pdfDocGenerator = pdfMakeInst.createPdf(docDefinition);
      pdfDocGenerator.download(nomeFinal, () => {
        resolve();
      });
      setTimeout(resolve, 800);
    } catch (err) {
      console.error('Erro no pdfMake ao exportar PDF do HTML:', err);
      reject(err);
    }
  });
}

/**
 * Utilitário para impressão isolada via iframe oculto sem interferência da UI principal
 */
export function imprimirDocumentoIsolado(elementoOriginal: HTMLElement, titulo: string = 'Documento'): void {
  try {
    const clone = elementoOriginal.cloneNode(true) as HTMLElement;

    // Remove elementos interativos de edição
    const elementosIgnorar = clone.querySelectorAll('[data-ignore-export="true"], button, input, select, textarea');
    elementosIgnorar.forEach(el => el.remove());

    const conteudoHtml = clone.innerHTML;

    let iframe = document.getElementById('iframe-impressao-isolada') as HTMLIFrameElement | null;
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }

    iframe = document.createElement('iframe');
    iframe.id = 'iframe-impressao-isolada';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${titulo}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 20mm;
          }
          * {
            box-sizing: border-box;
            font-family: Arial, Helvetica, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          body {
            margin: 0;
            padding: 0;
            color: ${DOCUMENT_THEME.colors.text};
            background: #ffffff;
            font-size: ${DOCUMENT_THEME.typography.sizes.bodyPt}pt;
            line-height: ${DOCUMENT_THEME.typography.lineHeights.body};
          }
          h1 { font-size: ${DOCUMENT_THEME.typography.sizes.titlePt}pt; font-weight: bold; text-align: center; margin: 16pt 0 8pt; color: ${DOCUMENT_THEME.colors.text}; }
          h2 { font-size: ${DOCUMENT_THEME.typography.sizes.subtitlePt}pt; font-weight: 600; text-align: center; font-style: italic; margin-bottom: 16pt; color: ${DOCUMENT_THEME.colors.textSecondary}; }
          h3 { font-size: ${DOCUMENT_THEME.typography.sizes.sectionTitlePt}pt; font-weight: bold; padding-bottom: 3pt; margin: 12pt 0 6pt; color: ${DOCUMENT_THEME.colors.text}; }
          p { margin-bottom: 6pt; text-align: justify; line-height: ${DOCUMENT_THEME.typography.lineHeights.body}; }
          table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: ${DOCUMENT_THEME.typography.sizes.tableBodyPt}pt; }
          th, td { border: 1px solid ${DOCUMENT_THEME.borders.tableBorderColor}; padding: ${DOCUMENT_THEME.table.cellPadding.topPt}pt ${DOCUMENT_THEME.table.cellPadding.leftPt}pt; text-align: left; }
          th { background-color: ${DOCUMENT_THEME.colors.tableHeaderBg}; font-weight: bold; font-size: ${DOCUMENT_THEME.typography.sizes.tableHeaderPt}pt; }
          ul, ol { margin: 6pt 0; padding-left: 20pt; }
          li { margin-bottom: 3pt; }
          .var-red { color: ${DOCUMENT_THEME.colors.variableRed} !important; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="document-content">
          ${conteudoHtml}
        </div>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch (err) {
        console.warn('Erro ao disparar iframe.print():', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (iframe && document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 350);
  } catch (e) {
    console.error('Erro na impressão isolada:', e);
    window.print();
  }
}
