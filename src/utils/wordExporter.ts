/**
 * Motor de Exportação para Microsoft Word (.docx)
 * Gera documentos Word com fidelidade tipográfica e estrutural a partir do HTML/DOM renderizado,
 * utilizando as constantes centralizadas de DOCUMENT_THEME.
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { DOCUMENT_THEME } from '../constants/documentTheme';
import { WordExportOptions } from '../types';
import {
  calcularRecuoHierarquicoCm,
  cmParaTwip,
  extrairSegmentosDeDom,
  limparTexto,
  normalizarSegmentos,
  paraHexCor,
  ptParaHalfPoint,
  SegmentoDom,
} from './domDocumentExtractor';

const WORD_PADROES: Required<WordExportOptions> = {
  ...DOCUMENT_THEME.word.defaultOptions,
};

function segmentosParaRuns(segmentos: SegmentoDom[], opcoes: Required<WordExportOptions>): TextRun[] {
  return (segmentos || []).map(segmento => {
    return new TextRun({
      text: limparTexto(segmento.texto),
      font: segmento.fonte || opcoes.fonte,
      size: ptParaHalfPoint(segmento.tamanhoFonte ?? opcoes.tamanhoFonte),
      color: paraHexCor(segmento.cor || opcoes.corTexto),
      bold: Boolean(segmento.bold),
      italics: Boolean(segmento.italic),
      underline: segmento.underline ? {} : undefined,
      strike: Boolean(segmento.strike),
      highlight: segmento.mark ? 'yellow' : undefined,
    });
  });
}

function alinhamentoWord(valor?: string): (typeof AlignmentType)[keyof typeof AlignmentType] {
  const nome = String(valor || '').toLowerCase();
  if (nome === 'centro') {
    return AlignmentType.CENTER;
  }
  if (nome === 'direita') {
    return AlignmentType.RIGHT;
  }
  if (nome === 'esquerda') {
    return AlignmentType.LEFT;
  }
  return AlignmentType.JUSTIFIED;
}

function espacoParagrafo(opcoes: Required<WordExportOptions>, ajustes: any = {}) {
  return {
    before: Math.max(0, Math.round(Number(ajustes.espacoAntes ?? opcoes.espacoAntes ?? DOCUMENT_THEME.spacing.paragraph.beforePt) * 20)),
    after: Math.max(0, Math.round(Number(ajustes.espacoDepois ?? opcoes.espacoDepois ?? DOCUMENT_THEME.spacing.paragraph.afterPt) * 20)),
    line: Math.max(1, Math.round(Number(ajustes.entreLinhas ?? opcoes.entreLinhas ?? DOCUMENT_THEME.typography.lineHeights.table) * 240)),
  };
}

function criarParagrafo(
  runs: TextRun[],
  opcoes: Required<WordExportOptions>,
  ajustes: {
    alinhamento?: string;
    recuoEsquerdo?: number;
    espacoAntes?: number;
    espacoDepois?: number;
    numbering?: { reference: string; level: number };
    bullet?: { level: number };
  } = {}
): Paragraph {
  const alinhamento = alinhamentoWord(ajustes.alinhamento || opcoes.alinhamento);
  const recuoCm = ajustes.recuoEsquerdo !== undefined ? ajustes.recuoEsquerdo : (opcoes.recuoEsquerdo || 0);

  return new Paragraph({
    alignment: alinhamento,
    indent: {
      left: cmParaTwip(recuoCm),
    },
    spacing: espacoParagrafo(opcoes, ajustes),
    numbering: ajustes.numbering,
    bullet: ajustes.bullet,
    children: runs.length ? runs : [new TextRun({ text: '' })],
  });
}

/**
 * Converte tabela HTML em tabela nativa do Word com preenchimento de cabeçalho, bordas e padding calibrados.
 */
function converterTabelaDom(
  tabelaEl: HTMLElement,
  opcoes: Required<WordExportOptions>
): Table | Paragraph {
  const rows: TableRow[] = [];
  const trElements = Array.from(tabelaEl.querySelectorAll('tr'));

  trElements.forEach((tr, rIdx) => {
    const cellElements = Array.from(tr.querySelectorAll('th, td')).filter(
      c => c.getAttribute('data-ignore-export') !== 'true' &&
           c.getAttribute('data-word-ignore') !== 'true'
    );
    const isHeaderRow = tr.querySelector('th') !== null || rIdx === 0;
    const cells: TableCell[] = [];

    cellElements.forEach(cell => {
      const isHeader = cell.tagName.toLowerCase() === 'th' || isHeaderRow;
      const segmentos = extrairSegmentosDeDom(
        cell,
        {
          bold: isHeader,
          tamanhoFonte: isHeader ? DOCUMENT_THEME.typography.sizes.tableHeaderPt : DOCUMENT_THEME.typography.sizes.tableBodyPt,
          cor: isHeader ? DOCUMENT_THEME.colors.textHex : undefined,
        },
        isHeader ? { ...opcoes, variaveisVermelhas: false } : opcoes,
        false
      );
      const runs = segmentosParaRuns(normalizarSegmentos(segmentos), opcoes);

      cells.push(
        new TableCell({
          shading: isHeader ? { fill: DOCUMENT_THEME.colors.tableHeaderBgHex } : undefined,
          margins: {
            top: DOCUMENT_THEME.table.cellPadding.topTwips,
            bottom: DOCUMENT_THEME.table.cellPadding.bottomTwips,
            left: DOCUMENT_THEME.table.cellPadding.leftTwips,
            right: DOCUMENT_THEME.table.cellPadding.rightTwips,
          },
          children: [
            criarParagrafo(runs, opcoes, {
              alinhamento: 'esquerda',
              espacoAntes: 0,
              espacoDepois: 0,
            }),
          ],
        })
      );
    });

    if (cells.length) {
      rows.push(new TableRow({ children: cells, tableHeader: isHeaderRow, cantSplit: DOCUMENT_THEME.table.cantSplit }));
    }
  });

  if (rows.length === 0) {
    return new Paragraph({
      children: [new TextRun({ text: '' })],
      spacing: { before: 0, after: 0 },
    });
  }

  const borderConfig = {
    color: DOCUMENT_THEME.borders.tableBorderColorHex,
    size: DOCUMENT_THEME.borders.tableBorderWidthWord,
    style: BorderStyle.SINGLE,
  };

  const maxCells = Math.max(
    1,
    ...rows.map(r => ((r as any).root || []).filter((c: any) => c && c.constructor?.name === 'TableCell').length || 1)
  );
  const columnWidths = Array(Math.max(1, maxCells)).fill(Math.floor(100 / Math.max(1, maxCells)));

  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    columnWidths,
    borders: {
      top: borderConfig,
      bottom: borderConfig,
      left: borderConfig,
      right: borderConfig,
      insideHorizontal: borderConfig,
      insideVertical: borderConfig,
    },
    rows,
  });
}

function converterListaDom(
  listaEl: HTMLElement,
  opcoes: Required<WordExportOptions>,
  contadorListas: { valor: number }
): Paragraph[] {
  const isOl = listaEl.tagName.toLowerCase() === 'ol' || listaEl.getAttribute('data-word-numerada') === 'true';
  const tipoLista = (listaEl.getAttribute('data-word-tipo-lista') || '').toLowerCase();
  const itens = Array.from(listaEl.querySelectorAll(':scope > li, :scope > [data-word-type="item"]'));
  const resultado: Paragraph[] = [];

  let refLista = '';
  if (isOl) {
    contadorListas.valor += 1;
    const idx = Math.min(contadorListas.valor, 50);
    if (tipoLista === 'upper-roman' || tipoLista === 'romano') {
      refLista = `edmlista_uroman_${idx}`;
    } else if (tipoLista === 'lower-roman' || tipoLista === 'romano_minusculo') {
      refLista = `edmlista_lroman_${idx}`;
    } else if (tipoLista === 'lower-alpha' || tipoLista === 'letra') {
      refLista = `edmlista_lalpha_${idx}`;
    } else if (tipoLista === 'upper-alpha' || tipoLista === 'letra_maiuscula') {
      refLista = `edmlista_ualpha_${idx}`;
    } else {
      refLista = `edmlista_dec_${idx}`;
    }
  }

  itens.forEach(item => {
    const segmentos = extrairSegmentosDeDom(item, {}, opcoes, false);
    const normalizados = normalizarSegmentos(segmentos);
    const runs = segmentosParaRuns(normalizados, opcoes);

    if (isOl) {
      resultado.push(
        criarParagrafo(runs, opcoes, {
          alinhamento: opcoes.alinhamento || 'justificado',
          numbering: { reference: refLista, level: 0 },
          espacoAntes: DOCUMENT_THEME.spacing.list.beforePt,
          espacoDepois: DOCUMENT_THEME.spacing.list.afterPt,
        })
      );
    } else {
      resultado.push(
        criarParagrafo(runs, opcoes, {
          alinhamento: opcoes.alinhamento || 'justificado',
          bullet: { level: 0 },
          recuoEsquerdo: DOCUMENT_THEME.margins.indentation.listIndentCm,
          espacoAntes: DOCUMENT_THEME.spacing.list.beforePt,
          espacoDepois: DOCUMENT_THEME.spacing.list.afterPt,
        })
      );
    }
  });

  return resultado;
}

function converterElementosBlocoDom(
  container: HTMLElement,
  opcoes: Required<WordExportOptions>,
  nivelSecao = 0,
  numbering: { reference: string } | null = null,
  contadorListas: { valor: number } = { valor: 0 },
  recuoSecao = 0
): (Paragraph | Table)[] {
  const resultado: (Paragraph | Table)[] = [];
  const filhos = Array.from(container.children) as HTMLElement[];

  filhos.forEach(el => {
    if (!el || el.getAttribute('data-ignore-export') === 'true') return;

    const wordType = el.getAttribute('data-word-type');
    const tag = el.tagName.toLowerCase();

    // 1. Título do Documento (<titulo> ou <h1 data-word-type="titulo">)
    if (wordType === 'titulo' || tag === 'h1') {
      const opcoesTitulo: Required<WordExportOptions> = {
        ...opcoes,
        corTexto: DOCUMENT_THEME.colors.textHex,
        corVariavel: DOCUMENT_THEME.colors.textHex,
        variaveisVermelhas: false,
      };
      const segmentos = extrairSegmentosDeDom(el, {
        bold: Boolean(opcoes.tituloNegrito),
        tamanhoFonte: opcoes.tituloTamanhoFonte || DOCUMENT_THEME.typography.sizes.titlePt,
        cor: DOCUMENT_THEME.colors.textHex,
        underline: opcoes.tituloSublinhado,
      }, opcoesTitulo, false);
      const runs = segmentosParaRuns(normalizarSegmentos(segmentos), opcoesTitulo);

      resultado.push(
        criarParagrafo(runs, opcoesTitulo, {
          alinhamento: 'centro',
          espacoAntes: DOCUMENT_THEME.spacing.title.beforePt,
          espacoDepois: DOCUMENT_THEME.spacing.title.afterPt,
        })
      );
      return;
    }

    // 2. Subtítulo (<subtitulo> ou <h2 data-word-type="subtitulo">)
    if (wordType === 'subtitulo' || tag === 'h2') {
      const segmentos = extrairSegmentosDeDom(el, {
        italic: true,
        tamanhoFonte: DOCUMENT_THEME.typography.sizes.subtitlePt,
        cor: DOCUMENT_THEME.colors.textSecondaryHex,
      }, opcoes, false);
      const runs = segmentosParaRuns(normalizarSegmentos(segmentos), opcoes);

      resultado.push(
        criarParagrafo(runs, opcoes, {
          alinhamento: 'centro',
          espacoAntes: DOCUMENT_THEME.spacing.subtitle.beforePt,
          espacoDepois: DOCUMENT_THEME.spacing.subtitle.afterPt,
        })
      );
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
        const opcoesTitulo: Required<WordExportOptions> = {
          ...opcoes,
          corTexto: DOCUMENT_THEME.colors.textHex,
          corVariavel: DOCUMENT_THEME.colors.textHex,
          variaveisVermelhas: false,
        };

        const deveUsarNumeracaoNativa = Boolean(numbering && numerarSecao);
        const segmentos = extrairSegmentosDeDom(tituloH3, {
          bold: Boolean(opcoes.secaoNegrito),
          tamanhoFonte: currentLevel === 0 ? (opcoes.secaoTamanhoFonte || DOCUMENT_THEME.typography.sizes.sectionTitlePt) : opcoes.tamanhoFonte,
          cor: DOCUMENT_THEME.colors.textHex,
          underline: opcoes.secaoSublinhado,
        }, opcoesTitulo, deveUsarNumeracaoNativa);

        const runs = segmentosParaRuns(normalizarSegmentos(segmentos), opcoesTitulo);
        const recuoTitulo = calcularRecuoHierarquicoCm(currentLevel);

        if (deveUsarNumeracaoNativa) {
          resultado.push(
            criarParagrafo(runs, opcoesTitulo, {
              alinhamento: 'esquerda',
              recuoEsquerdo: recuoTitulo,
              numbering: {
                reference: numbering!.reference,
                level: Math.min(currentLevel, (opcoes.nivelMaximoNumeracao || 9) - 1),
              },
              espacoAntes: currentLevel === 0 ? DOCUMENT_THEME.spacing.sectionTitle.beforePt : DOCUMENT_THEME.spacing.sectionTitle.afterPt,
              espacoDepois: DOCUMENT_THEME.spacing.sectionTitle.afterPt,
            })
          );
        } else {
          resultado.push(
            criarParagrafo(runs, opcoesTitulo, {
              alinhamento: 'esquerda',
              recuoEsquerdo: recuoTitulo,
              espacoAntes: currentLevel === 0 ? DOCUMENT_THEME.spacing.sectionTitle.beforePt : DOCUMENT_THEME.spacing.sectionTitle.afterPt,
              espacoDepois: DOCUMENT_THEME.spacing.sectionTitle.afterPt,
            })
          );
        }
      }

      const proximoNivel = numerarSecao ? currentLevel + 1 : currentLevel;
      const recuoConteudo = calcularRecuoHierarquicoCm(proximoNivel);

      const conteudoContainer = (el.querySelector(':scope > [data-word-type="secao-conteudo"]') || el) as HTMLElement;
      const filhosAProcessar = conteudoContainer === el
        ? Array.from(el.children).filter(child => child !== tituloH3) as HTMLElement[]
        : Array.from(conteudoContainer.children) as HTMLElement[];

      const wrapperVirtual = document.createElement('div');
      filhosAProcessar.forEach(c => wrapperVirtual.appendChild(c.cloneNode(true)));

      resultado.push(
        ...converterElementosBlocoDom(
          wrapperVirtual,
          opcoes,
          proximoNivel,
          numbering,
          contadorListas,
          recuoConteudo
        )
      );
      return;
    }

    // 4. Título de Seção isolado (<h3 data-word-type="secao-titulo">)
    if (wordType === 'secao-titulo' || (tag === 'h3' && !el.closest('[data-word-type="secao"]'))) {
      const rawLevel = el.getAttribute('data-word-level');
      const currentLevel = rawLevel !== null ? parseInt(rawLevel, 10) : nivelSecao;
      const numerarAttr = el.getAttribute('data-word-numerar');
      const numerarSecao = numerarAttr !== 'false';

      const opcoesTitulo: Required<WordExportOptions> = {
        ...opcoes,
        corTexto: DOCUMENT_THEME.colors.textHex,
        corVariavel: DOCUMENT_THEME.colors.textHex,
        variaveisVermelhas: false,
      };

      const deveUsarNumeracaoNativa = Boolean(numbering && numerarSecao);
      const segmentos = extrairSegmentosDeDom(el, {
        bold: Boolean(opcoes.secaoNegrito),
        tamanhoFonte: currentLevel === 0 ? (opcoes.secaoTamanhoFonte || DOCUMENT_THEME.typography.sizes.sectionTitlePt) : opcoes.tamanhoFonte,
        cor: DOCUMENT_THEME.colors.textHex,
        underline: opcoes.secaoSublinhado,
      }, opcoesTitulo, deveUsarNumeracaoNativa);

      const runs = segmentosParaRuns(normalizarSegmentos(segmentos), opcoesTitulo);
      const recuoTitulo = calcularRecuoHierarquicoCm(currentLevel);

      if (deveUsarNumeracaoNativa) {
        resultado.push(
          criarParagrafo(runs, opcoesTitulo, {
            alinhamento: 'esquerda',
            recuoEsquerdo: recuoTitulo,
            numbering: {
              reference: numbering!.reference,
              level: Math.min(currentLevel, (opcoes.nivelMaximoNumeracao || 9) - 1),
            },
            espacoAntes: currentLevel === 0 ? DOCUMENT_THEME.spacing.sectionTitle.beforePt : DOCUMENT_THEME.spacing.sectionTitle.afterPt,
            espacoDepois: DOCUMENT_THEME.spacing.sectionTitle.afterPt,
          })
        );
      } else {
        resultado.push(
          criarParagrafo(runs, opcoesTitulo, {
            alinhamento: 'esquerda',
            recuoEsquerdo: recuoTitulo,
            espacoAntes: currentLevel === 0 ? DOCUMENT_THEME.spacing.sectionTitle.beforePt : DOCUMENT_THEME.spacing.sectionTitle.afterPt,
            espacoDepois: DOCUMENT_THEME.spacing.sectionTitle.afterPt,
          })
        );
      }
      return;
    }

    // 5. Parágrafo (<p> ou <div data-word-type="paragrafo">)
    if (wordType === 'paragrafo' || tag === 'p') {
      const rawLevel = el.getAttribute('data-word-level');
      const levelPara = rawLevel !== null ? parseInt(rawLevel, 10) : nivelSecao;
      const isNumerado = el.getAttribute('data-word-numerado') === 'true' || Boolean(el.querySelector('[data-word-num]'));
      const alignAttr = el.getAttribute('data-word-align') || el.style.textAlign;
      const alinhamentoFinal = alignAttr === 'center' ? 'centro' : alignAttr === 'right' ? 'direita' : alignAttr === 'left' ? 'esquerda' : opcoes.alinhamento || 'justificado';

      const tableInside = el.querySelector('table, [data-word-type="tabela-container"]');
      if (tableInside) {
        const childNodes = Array.from(el.childNodes);
        let bufferNodes: Node[] = [];

        const flushBufferAsParagraph = (isFirst: boolean) => {
          if (bufferNodes.length === 0) return;
          const tempDiv = document.createElement('div');
          bufferNodes.forEach(n => tempDiv.appendChild(n.cloneNode(true)));
          const deveUsarNumeracao = Boolean(numbering && isNumerado && isFirst);
          const segmentos = extrairSegmentosDeDom(tempDiv, {}, opcoes, deveUsarNumeracao);
          const normalizados = normalizarSegmentos(segmentos);
          bufferNodes = [];

          if (normalizados.length > 0) {
            const recuoCalculado = calcularRecuoHierarquicoCm(levelPara);
            const recuoFinal = recuoSecao > 0 ? recuoSecao : recuoCalculado;

            if (deveUsarNumeracao) {
              resultado.push(
                criarParagrafo(segmentosParaRuns(normalizados, opcoes), opcoes, {
                  alinhamento: alinhamentoFinal,
                  recuoEsquerdo: recuoFinal,
                  numbering: {
                    reference: numbering!.reference,
                    level: Math.min(levelPara, (opcoes.nivelMaximoNumeracao || 9) - 1),
                  },
                  espacoAntes: DOCUMENT_THEME.spacing.paragraph.beforePt,
                  espacoDepois: DOCUMENT_THEME.spacing.paragraph.afterPt,
                })
              );
            } else {
              resultado.push(
                criarParagrafo(segmentosParaRuns(normalizados, opcoes), opcoes, {
                  recuoEsquerdo: recuoFinal,
                  alinhamento: alinhamentoFinal,
                  espacoAntes: DOCUMENT_THEME.spacing.paragraph.beforePt,
                  espacoDepois: DOCUMENT_THEME.spacing.paragraph.afterPt,
                })
              );
            }
          }
        };

        let isFirstPart = true;
        for (const child of childNodes) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const childEl = child as HTMLElement;
            if (
              childEl.tagName === 'TABLE' ||
              childEl.getAttribute('data-word-type') === 'tabela-container' ||
              childEl.querySelector('table')
            ) {
              flushBufferAsParagraph(isFirstPart);
              isFirstPart = false;
              const actualTable = childEl.tagName === 'TABLE' ? childEl : childEl.querySelector('table');
              if (actualTable) {
                resultado.push(converterTabelaDom(actualTable as HTMLElement, opcoes));
              }
              continue;
            }
          }
          bufferNodes.push(child);
        }
        flushBufferAsParagraph(isFirstPart);
        return;
      }

      const deveUsarNumeracaoNativa = Boolean(numbering && isNumerado);
      const segmentos = extrairSegmentosDeDom(el, {}, opcoes, deveUsarNumeracaoNativa);
      const normalizados = normalizarSegmentos(segmentos);

      if (normalizados.length > 0) {
        const recuoCalculado = calcularRecuoHierarquicoCm(levelPara);
        const recuoFinal = recuoSecao > 0 ? recuoSecao : recuoCalculado;

        if (deveUsarNumeracaoNativa) {
          resultado.push(
            criarParagrafo(segmentosParaRuns(normalizados, opcoes), opcoes, {
              alinhamento: alinhamentoFinal,
              recuoEsquerdo: recuoFinal,
              numbering: {
                reference: numbering!.reference,
                level: Math.min(levelPara, (opcoes.nivelMaximoNumeracao || 9) - 1),
              },
              espacoAntes: DOCUMENT_THEME.spacing.paragraph.beforePt,
              espacoDepois: DOCUMENT_THEME.spacing.paragraph.afterPt,
            })
          );
        } else {
          resultado.push(
            criarParagrafo(segmentosParaRuns(normalizados, opcoes), opcoes, {
              recuoEsquerdo: recuoFinal,
              alinhamento: alinhamentoFinal,
              espacoAntes: DOCUMENT_THEME.spacing.paragraph.beforePt,
              espacoDepois: DOCUMENT_THEME.spacing.paragraph.afterPt,
            })
          );
        }
      }
      return;
    }

    // 6. Listas (<ol>, <ul>, <div data-word-type="lista">)
    if (wordType === 'lista' || tag === 'ol' || tag === 'ul') {
      resultado.push(...converterListaDom(el, opcoes, contadorListas));
      return;
    }

    // 7. Tabelas (<table>, <div data-word-type="tabela-container">)
    if (tag === 'table') {
      resultado.push(converterTabelaDom(el, opcoes));
      return;
    }
    if (wordType === 'tabela-container' || el.querySelector('table')) {
      const tableEl = el.querySelector('table');
      if (tableEl) {
        resultado.push(converterTabelaDom(tableEl as HTMLElement, opcoes));
        return;
      }
    }

    // 8. Linha horizontal (<hr>)
    if (tag === 'hr') {
      resultado.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: {
            bottom: {
              color: DOCUMENT_THEME.borders.hrBorderColorHex,
              space: 1,
              style: BorderStyle.SINGLE,
              size: DOCUMENT_THEME.borders.tableBorderWidthWord,
            },
          },
          spacing: {
            before: DOCUMENT_THEME.spacing.hr.beforePt * 20,
            after: DOCUMENT_THEME.spacing.hr.afterPt * 20,
          },
          children: [new TextRun({ text: '' })],
        })
      );
      return;
    }

    // 9. Demais containers / Blocos aninhados / if-bloco
    if (el.children.length > 0) {
      resultado.push(
        ...converterElementosBlocoDom(
          el,
          opcoes,
          nivelSecao,
          numbering,
          contadorListas,
          recuoSecao
        )
      );
    } else {
      const segmentos = extrairSegmentosDeDom(el, {}, opcoes, false);
      const normalizados = normalizarSegmentos(segmentos);
      if (normalizados.length > 0) {
        resultado.push(
          criarParagrafo(segmentosParaRuns(normalizados, opcoes), opcoes, {
            recuoEsquerdo: recuoSecao,
            alinhamento: opcoes.alinhamento || 'justificado',
          })
        );
      }
    }
  });

  return resultado;
}

function criarOpcoesNumeracao(opcoes: Required<WordExportOptions>) {
  return {
    reference: 'edmsecoes',
    levels: Array.from({ length: 9 }, (_, level) => {
      const recuo = calcularRecuoHierarquicoCm(level);
      return {
        level,
        format: LevelFormat.DECIMAL,
        text: Array.from({ length: level + 1 }, (_, idx) => `%${idx + 1}.`).join(''),
        alignment: AlignmentType.LEFT,
        start: 1,
        style: {
          run: {
            font: opcoes.fonte,
            size: ptParaHalfPoint(level === 0 ? opcoes.secaoTamanhoFonte : opcoes.tamanhoFonte),
            color: paraHexCor(opcoes.corTexto, DOCUMENT_THEME.colors.textHex),
            bold: level === 0 ? Boolean(opcoes.secaoNegrito) : false,
          },
          paragraph: {
            indent: {
              left: cmParaTwip(recuo),
              hanging: 0,
            },
          },
        },
      };
    }),
  };
}

function criarOpcoesLista(
  referencia: string,
  opcoes: Required<WordExportOptions>,
  formato: (typeof LevelFormat)[keyof typeof LevelFormat] = LevelFormat.DECIMAL,
  textoTemplate: string = '%1.'
) {
  return {
    reference: referencia,
    levels: [
      {
        level: 0,
        format: formato,
        text: textoTemplate,
        alignment: AlignmentType.LEFT,
        start: 1,
        style: {
          paragraph: {
            indent: {
              left: cmParaTwip(opcoes.recuoLista),
              hanging: 0,
            },
          },
        },
      },
    ],
  };
}

/**
 * Exporta o documento Word (.docx) diretamente a partir do elemento HTML renderizado no DOM.
 */
export async function exportarParaWord(
  documentElement: HTMLElement,
  nomeArquivo = 'documento.docx',
  opcoesUsuario: WordExportOptions = {}
): Promise<Blob> {
  if (!documentElement || !(documentElement instanceof HTMLElement)) {
    throw new Error('Elemento HTML do documento visualizado não foi encontrado.');
  }

  const cfg: Required<WordExportOptions> = {
    ...WORD_PADROES,
    ...opcoesUsuario,
  };

  const contadorListas = { valor: 0 };
  const numberingConfig: any[] = [];

  if (cfg.ativarNumeracaoDocumento) {
    numberingConfig.push(criarOpcoesNumeracao(cfg));
  }

  for (let i = 1; i <= 50; i++) {
    numberingConfig.push(criarOpcoesLista(`edmlista_dec_${i}`, cfg, LevelFormat.DECIMAL, '%1.'));
    numberingConfig.push(criarOpcoesLista(`edmlista_uroman_${i}`, cfg, LevelFormat.UPPER_ROMAN, '%1)'));
    numberingConfig.push(criarOpcoesLista(`edmlista_lroman_${i}`, cfg, LevelFormat.LOWER_ROMAN, '%1)'));
    numberingConfig.push(criarOpcoesLista(`edmlista_lalpha_${i}`, cfg, LevelFormat.LOWER_LETTER, '%1)'));
    numberingConfig.push(criarOpcoesLista(`edmlista_ualpha_${i}`, cfg, LevelFormat.UPPER_LETTER, '%1.'));
    numberingConfig.push(criarOpcoesLista(`edmlista${i}`, cfg, LevelFormat.DECIMAL, '%1.'));
  }

  const elements = converterElementosBlocoDom(
    documentElement,
    cfg,
    0,
    cfg.ativarNumeracaoDocumento ? { reference: 'edmsecoes' } : null,
    contadorListas,
    0
  );

  const doc = new Document({
    creator: 'Gerador de Documentos EDM',
    title: String(nomeArquivo).replace(/\.docx$/i, ''),
    description: 'Documento gerado com fidelidade visual a partir do motor EDM.',
    numbering: {
      config: numberingConfig,
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: cmParaTwip(21),
              height: cmParaTwip(29.7),
            },
            margin: {
              top: cmParaTwip(cfg.margemSuperiorCm),
              right: cmParaTwip(cfg.margemDireitaCm),
              bottom: cmParaTwip(cfg.margemInferiorCm),
              left: cmParaTwip(cfg.margemEsquerdaCm),
              header: cmParaTwip(cfg.cabecalhoDistancia),
              footer: cmParaTwip(cfg.rodapeDistancia),
            },
          },
        },
        children: elements as any,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);

  const { saveAs } = await import('file-saver');
  saveAs(blob, String(nomeArquivo || 'documento.docx').replace(/\.docx$/i, '') + '.docx');
  return blob;


}
