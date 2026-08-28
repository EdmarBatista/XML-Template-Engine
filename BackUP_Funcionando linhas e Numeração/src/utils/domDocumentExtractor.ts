/**
 * Utilitário compartilhado para extração e processamento semântico de documentos DOM.
 * Utilizado pelos exportadores de Word (DOCX) e PDF para garantir 100% de paridade.
 */

export interface SegmentoDom {
  texto: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  cor?: string;
  tamanhoFonte?: number;
  fonte?: string;
}

export interface OpcoesBaseDocumento {
  fonte?: string;
  tamanhoFonte?: number;
  corTexto?: string;
  corVariavel?: string;
  variaveisVermelhas?: boolean;
  alinhamento?: string;
}

export function limparTexto(valor: any): string {
  return String(valor ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

export function precisaEspaco(anterior?: string, atual?: string): boolean {
  const a = String(anterior || '');
  const b = String(atual || '');
  if (!a || !b || /\s$/.test(a) || /^\s/.test(b)) return false;
  if (/^[,.;!?%)\]}]/.test(b) || /[(\[{]$/.test(a)) return false;
  return /[\p{L}\p{N}:.]$/u.test(a) && /^[\p{L}\p{N}]/u.test(b);
}

export function cmParaTwip(cm: number): number {
  const n = Number(cm);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 567) : 0;
}

export function cmParaPt(cm: number): number {
  const n = Number(cm);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 28.3464567 * 100) / 100 : 0;
}

export function ptParaHalfPoint(pt: number): number {
  const n = Number(pt);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 2) : 20;
}

export function paraHexCor(valor?: string, padrao = '000000'): string {
  const texto = String(valor || '').replace('#', '').trim();
  return /^[0-9a-fA-F]{6}$/.test(texto) ? texto.toUpperCase() : padrao;
}

/**
 * Calcula o recuo hierárquico em centímetros com base no nível da seção/bloco.
 * Nível 0 ou 1: 0 cm.
 * Nível >= 2: (nível - 1) * 0.5 cm.
 */
export function calcularRecuoHierarquicoCm(nivel: number): number {
  return nivel <= 1 ? 0 : (nivel - 1) * 0.5;
}

/**
 * Extrai recursivamente segmentos de texto formatado a partir de nós inline do DOM.
 */
export function extrairSegmentosDeDom(
  node: Node,
  estiloAtual: Partial<SegmentoDom>,
  opcoes: OpcoesBaseDocumento,
  ignorarSpanNumeracao: boolean = false
): SegmentoDom[] {
  const segmentos: SegmentoDom[] = [];

  if (node.nodeType === Node.TEXT_NODE) {
    const texto = node.textContent || '';
    if (texto) {
      segmentos.push({
        texto,
        ...estiloAtual,
        cor: estiloAtual.cor || opcoes.corTexto,
      });
    }
    return segmentos;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return segmentos;
  }

  const el = node as HTMLElement;

  if (el.getAttribute('data-ignore-export') === 'true') {
    return segmentos;
  }

  const isWordNum = el.getAttribute('data-word-num') === 'true';
  if (isWordNum && ignorarSpanNumeracao) {
    return [];
  }

  // Suporte a inputs / forms / selects
  if (el.tagName === 'INPUT') {
    const inputEl = el as HTMLInputElement;
    if (inputEl.type === 'checkbox' || inputEl.type === 'radio') {
      if (inputEl.checked) {
        segmentos.push({ texto: 'Sim', ...estiloAtual });
      }
    } else {
      segmentos.push({ texto: inputEl.value || '', ...estiloAtual });
    }
    return segmentos;
  }

  if (el.tagName === 'SELECT') {
    const selEl = el as HTMLSelectElement;
    const optTexto = selEl.options[selEl.selectedIndex]?.text || selEl.value || '';
    segmentos.push({ texto: optTexto, ...estiloAtual });
    return segmentos;
  }

  if (el.tagName === 'TEXTAREA') {
    const txtEl = el as HTMLTextAreaElement;
    segmentos.push({ texto: txtEl.value || '', ...estiloAtual });
    return segmentos;
  }

  if (el.tagName === 'BR') {
    return [{ texto: '\n', ...estiloAtual }];
  }

  const novoEstilo: Partial<SegmentoDom> = { ...estiloAtual };

  if (isWordNum) {
    // Número gerado: somente números de títulos principais (nível 0 / h1) ficam em negrito no documento
    const isTituloPrincipal = Boolean(
      el.closest('[data-word-type="secao-titulo"][data-word-level="0"]') ||
      el.closest('[data-word-type="titulo"]') ||
      el.closest('h1')
    );
    novoEstilo.bold = isTituloPrincipal;
  } else {
    if (
      el.tagName === 'B' ||
      el.tagName === 'STRONG' ||
      el.classList.contains('font-bold') ||
      el.classList.contains('font-semibold')
    ) {
      novoEstilo.bold = true;
    }
  }

  if (
    el.tagName === 'I' ||
    el.tagName === 'EM' ||
    el.classList.contains('italic')
  ) {
    novoEstilo.italic = true;
  }

  if (
    el.tagName === 'U' ||
    el.classList.contains('underline')
  ) {
    novoEstilo.underline = true;
  }

  const isVariavel = el.hasAttribute('data-vars') || el.classList.contains('variavel-doc');
  if (isVariavel && opcoes.variaveisVermelhas) {
    novoEstilo.cor = opcoes.corVariavel || '#dc2626';
  }

  Array.from(el.childNodes).forEach(filho => {
    segmentos.push(...extrairSegmentosDeDom(filho, novoEstilo, opcoes, ignorarSpanNumeracao));
  });

  return segmentos;
}

/**
 * Normaliza e insere espaçamento apropriado entre palavras consecutivas.
 */
export function normalizarSegmentos(segmentos: SegmentoDom[]): SegmentoDom[] {
  const resultado: SegmentoDom[] = [];
  let ultimoTexto = '';

  (segmentos || []).forEach(segmento => {
    if (!segmento || segmento.texto == null) return;
    let texto = limparTexto(segmento.texto);
    if (!texto || texto === 'undefined' || texto === 'null') return;

    if (precisaEspaco(ultimoTexto, texto)) {
      texto = ' ' + texto;
    }

    resultado.push({ ...segmento, texto });
    ultimoTexto = texto;
  });

  return resultado;
}

/**
 * Calcula dinamicamente as larguras das colunas de tabelas no pdfMake.
 * Analisa a proporção e volume de texto de cada coluna para replicar fielmente
 * o comportamento de layout de tabela do HTML/Word (colunas curtas compactas com 'auto',
 * colunas equilibradas com proporções ideais e colunas de texto longo com '*').
 */
export function calcularLargurasColunasTabela(
  textosPorLinhaEColuna: string[][],
  maxCols: number
): (string | number)[] {
  if (maxCols <= 1) return ['*'];

  // Determinar o comprimento máximo e médio de caracteres em cada coluna
  const maxLenPerCol: number[] = Array(maxCols).fill(0);
  const totalLenPerCol: number[] = Array(maxCols).fill(0);
  const rowCountsPerCol: number[] = Array(maxCols).fill(0);

  textosPorLinhaEColuna.forEach(linha => {
    linha.forEach((texto, cIdx) => {
      if (cIdx < maxCols) {
        const raw = (texto || '').trim();
        const len = raw.length;
        if (len > maxLenPerCol[cIdx]) {
          maxLenPerCol[cIdx] = len;
        }
        totalLenPerCol[cIdx] += len;
        rowCountsPerCol[cIdx] += 1;
      }
    });
  });

  const avgLenPerCol = maxLenPerCol.map((max, idx) => {
    const count = rowCountsPerCol[idx] || 1;
    return Math.max(Math.round(totalLenPerCol[idx] / count), Math.min(max, 5));
  });

  const globalMax = Math.max(...maxLenPerCol, 1);
  const widths: (string | number)[] = [];

  // Se todas as colunas tiverem volume de texto parecido, divide igualmente
  const isUniform = maxLenPerCol.every(len => len > 15 && len >= globalMax * 0.7);
  if (isUniform) {
    return Array(maxCols).fill('*');
  }

  for (let c = 0; c < maxCols; c++) {
    const maxLen = maxLenPerCol[c];
    const avgLen = avgLenPerCol[c];

    // Colunas curtas (códigos, datas, status, números, IDs, índices, tags curtas)
    // No HTML e Word ficam ajustadas compactamente ao texto (auto)
    if (maxLen <= 22 || (maxLen <= 40 && avgLen <= 25 && maxLen < globalMax * 0.45)) {
      widths.push('auto');
    } else {
      widths.push('*');
    }
  }

  // Garantir que pelo menos uma coluna com mais conteúdo expanda com '*'
  if (!widths.includes('*')) {
    let maxIdx = 0;
    let maxVal = -1;
    maxLenPerCol.forEach((v, idx) => {
      if (v > maxVal) {
        maxVal = v;
        maxIdx = idx;
      }
    });
    widths[maxIdx] = '*';
  }

  return widths;
}
