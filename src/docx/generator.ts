import { DocxBlock, DocxParagraph, DocxTable, TextRun } from './ast';
import { escapeXml, normalizarIdentificadorValido, decodificarEntidadesXml } from './domText';

interface FormFieldDef {
  id: string;
  tag: string;
  attrs: Record<string, string>;
  options?: string[];
}

function runsToXml(runs: TextRun[]): string {
  let out = '';
  for (const r of runs) {
    let t = escapeXml(r.text);
    if (r.b) t = `<b>${t}</b>`;
    if (r.i) t = `<i>${t}</i>`;
    if (r.u) t = `<u>${t}</u>`;
    if (r.strike) t = `<s>${t}</s>`;
    if (r.color) {
      const colorHex = /^[0-9A-Fa-f]{6}$/.test(r.color) ? `#${r.color}` : r.color;
      t = `<cor cor="${colorHex}">${t}</cor>`;
    }
    out += t;
  }
  return out;
}

/**
 * Remove numeração manual digitada no início de títulos (ex.: "7. ", "1.1 ", "CLÁUSULA PRIMEIRA - ")
 * para que o atributo titulo="..." contenha apenas o texto puro e a hierarquia automática do frontend
 * forneça a numeração correta sem duplicidade.
 */
function limparPrefixoNumericoTitulo(rawTitle: string): string {
  let s = rawTitle.trim();
  // Remove prefixos como "1. ", "7. ", "1.1. ", "1.1.1 - ", "1) "
  s = s.replace(/^(?:(?:\d+[\.\)])+(?:\s*-\s*|\s+)|(?:\d+\s*-\s*))/i, '');
  // Remove prefixos como "CLÁUSULA PRIMEIRA - ", "CLÁUSULA 1ª: ", "SEÇÃO I - "
  s = s.replace(/^(?:CL[ÁA]USULA\s+[A-Z0-9ªº\.\-]+\s*[:\-–—]\s*|SE[ÇC][ÃA]O\s+[IVXLCDM0-9\.\-]+\s*[:\-–—]\s*)/i, '');
  return s.trim() || rawTitle.trim();
}

function limparPrefixoItemLista(text: string): string {
  return text.replace(/^(?:[IVXLCDM]+\)|[ivxlcdm]+\)|[a-zA-Z]\)|\d+\)|•|\-)\s*/i, '').trim();
}

function limparPrefixoNumericoParagrafo(text: string): string {
  return text.replace(/^\d+(?:\.\d+)*\.?\s+/, '').trim();
}

export function generateXmlFromAst(
  blocks: DocxBlock[],
  fileName: string = 'documento.docx'
): { xml: string; jsonInicial: Record<string, any> } {
  const jsonInicial: Record<string, any> = {};
  const camposExtraidos = new Map<string, FormFieldDef>();
  const tabelasExtraidas = new Map<string, Map<string, FormFieldDef>>();

  let currentForeachTable: string | null = null;

  function processText(text: string): string {
    return text.replace(/\{\{\s*(.*?)\s*\}\}/g, (_match, inner) => {
      const parts = inner.split('|').map((p: string) => p.trim());
      const rawLabel = parts[0];
      const lowerRaw = rawLabel.toLowerCase();

      if (lowerRaw.startsWith('if ')) {
        const rawExpr = decodificarEntidadesXml(rawLabel.substring(3).trim());
        const exprParts = rawExpr.split(/(==|!=|>=|<=|>|<)/);
        if (exprParts.length >= 3) {
          exprParts[0] = normalizarIdentificadorValido(exprParts[0].trim(), 'var') + ' ';
        }
        const cleanExpr = exprParts.join('');
        const attrValue = cleanExpr
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
        return `<if expr="${attrValue}">`;
      }
      if (
        lowerRaw === '/if' ||
        lowerRaw === 'endif' ||
        lowerRaw === 'end_if' ||
        lowerRaw.startsWith('/if') ||
        lowerRaw.startsWith('endif') ||
        lowerRaw.startsWith('end_if')
      ) {
        return `</if>`;
      }
      if (lowerRaw.startsWith('foreach ')) {
        const listNameRaw = rawLabel.substring(8).trim();
        const listId = normalizarIdentificadorValido(listNameRaw, 'lista');
        currentForeachTable = listId;
        if (!tabelasExtraidas.has(listId)) {
          tabelasExtraidas.set(listId, new Map());
        }
        return `<foreach lista="${listId}" var="item">`;
      }
      if (
        lowerRaw === '/foreach' ||
        lowerRaw === 'endforeach' ||
        lowerRaw === 'end_foreach' ||
        lowerRaw.startsWith('/foreach') ||
        lowerRaw.startsWith('endforeach') ||
        lowerRaw.startsWith('end_foreach')
      ) {
        currentForeachTable = null;
        return `</foreach>`;
      }

      let isItem = false;
      let id = '';
      let label = rawLabel;

      if (rawLabel.toLowerCase().startsWith('item.')) {
        isItem = true;
        id = normalizarIdentificadorValido(rawLabel.substring(5), 'col');
        label = rawLabel.substring(5);
        label = label
          .split('_')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      } else {
        id = normalizarIdentificadorValido(rawLabel, 'var');
      }

      const field: FormFieldDef = {
        id,
        tag: 'input',
        attrs: { label, tipo: 'texto' },
      };

      const displayFilters: string[] = [];

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const lowerPart = part.toLowerCase();

        if (part.includes('=')) {
          const eqIdx = part.indexOf('=');
          const k = part.substring(0, eqIdx).trim().toLowerCase();
          const v = part.substring(eqIdx + 1).trim();
          if (k === 'desc' || k === 'descricao') field.attrs['descricao'] = v;
          else field.attrs[k] = v;
          continue;
        }

        const funcMatch = part.match(/^([a-zA-Z_]+)\((.*)\)$/);
        if (funcMatch) {
          const funcName = funcMatch[1].toLowerCase();
          const funcArgsStr = funcMatch[2];
          if (['select', 'radio', 'checkbox'].includes(funcName)) {
            field.tag = funcName;
            delete field.attrs['tipo'];
            field.options = funcArgsStr.split(',').map((o: string) => o.trim());
          } else if (funcName === 'number') {
            field.tag = 'number';
            field.attrs['tipo'] = 'number';
            funcArgsStr.split(',').forEach((arg: string) => {
              const [k, v] = arg.split('=').map((s: string) => s.trim());
              if (k && v) field.attrs[k.toLowerCase()] = v;
            });
          }
          continue;
        }

        if (['cpf', 'cnpj', 'cep', 'telefone', 'moeda'].includes(lowerPart)) {
          field.tag = 'number';
          field.attrs['tipo'] = lowerPart;
          displayFilters.push(part);
        } else if (lowerPart === 'email') {
          field.tag = 'input';
          field.attrs['tipo'] = 'email';
        } else if (lowerPart === 'data' || lowerPart === 'date') {
          field.tag = 'date';
          delete field.attrs['tipo'];
        } else if (lowerPart === 'textarea' || lowerPart === 'longo') {
          field.tag = 'textarea';
          delete field.attrs['tipo'];
        } else if (lowerPart === 'number' || lowerPart === 'numero') {
          field.tag = 'number';
          field.attrs['tipo'] = 'number';
        } else if (lowerPart === 'lista_csv') {
          field.tag = 'input';
          field.attrs['tipo'] = 'lista_csv';
        } else {
          displayFilters.push(part);
        }
      }

      if (isItem && currentForeachTable) {
        const tableFields = tabelasExtraidas.get(currentForeachTable)!;
        if (!tableFields.has(id)) {
          tableFields.set(id, field);
        }
      } else if (!isItem) {
        if (!camposExtraidos.has(id)) {
          camposExtraidos.set(id, field);
        } else {
          const existing = camposExtraidos.get(id)!;
          if (field.tag !== 'input' || field.attrs.tipo !== 'texto') {
            existing.tag = field.tag;
            existing.options = field.options;
          }
          existing.attrs = { ...existing.attrs, ...field.attrs };
        }
      }

      const filterSuffix = displayFilters.length > 0 ? ` | ${displayFilters.join(' | ')}` : '';
      if (isItem) {
        return `{{item.${id}${filterSuffix}}}`;
      }
      return `{{${id}${filterSuffix}}}`;
    });
  }

  let conteudoXml = '';
  interface StackItem {
    level: number;
    isHeading: boolean;
    numerar?: boolean;
  }
  const sectionStack: StackItem[] = [];
  let currentDepth = 2; // Profundidade inicial dentro de uma seção de nível 1

  let tableCounter = 1;
  let lastContextLabel = '';
  let secoesComTituloVistas = 0;
  let aposAnexo = false;

  const closeSectionsDownTo = (targetLevel: number) => {
    while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level >= targetLevel) {
      sectionStack.pop();
      const indentStr = '    ' + '  '.repeat(sectionStack.length);
      conteudoXml += `${indentStr}</secao>\n`;
    }
  };

  const closeAllSections = () => {
    while (sectionStack.length > 0) {
      sectionStack.pop();
      const indentStr = '    ' + '  '.repeat(sectionStack.length);
      conteudoXml += `${indentStr}</secao>\n`;
    }
    currentDepth = 2;
  };

  const closeSubsectionsBackToLevel2 = () => {
    while (sectionStack.length > 1) {
      sectionStack.pop();
      const indentStr = '    ' + '  '.repeat(sectionStack.length);
      conteudoXml += `${indentStr}</secao>\n`;
    }
    currentDepth = 2;
  };

  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];

    if (block.type === 'table') {
      closeSubsectionsBackToLevel2();

      const t = block as DocxTable;
      const indentStr = '    ' + '  '.repeat(sectionStack.length);

      // Verifica se é uma tabela estruturada de layout ou fórmula matemática com células mescladas (vMerge / rowSpan)
      const hasVerticalMerge = (t.rows || []).some((r) =>
        (r.cells || []).some((c) => (c.rowSpan && c.rowSpan > 1) || c.isMergedContinuation)
      );
      const isFormulaTable = (t.rows || []).some((r) =>
        (r.cells || []).some((c) => {
          const txt = (c.blocks || [])
            .map((b: any) => (b.runs ? b.runs.map((run: any) => run.text).join('') : ''))
            .join(' ')
            .trim();
          return /^(LG|SG|LC)\s*=/i.test(txt);
        })
      );

      if (hasVerticalMerge || isFormulaTable) {
        let staticTblXml = `${indentStr}<tabela borda="false">\n`;
        for (const row of t.rows || []) {
          staticTblXml += `${indentStr}  <linha>\n`;
          for (const cell of row.cells || []) {
            // Células absorvidas por mesclagem vertical não emitem coluna duplicada
            if (cell.isMergedContinuation) continue;

            const cellText = (cell.blocks || [])
              .map((b: any) => (b.runs ? runsToXml(b.runs) : ''))
              .join('\n')
              .trim();

            let attrs = '';
            if (cell.colSpan && cell.colSpan > 1) {
              attrs += ` colspan="${cell.colSpan}"`;
            }
            if (cell.rowSpan && cell.rowSpan > 1) {
              attrs += ` rowspan="${cell.rowSpan}"`;
            }

            staticTblXml += `${indentStr}    <coluna${attrs}>${cellText}</coluna>\n`;
          }
          staticTblXml += `${indentStr}  </linha>\n`;
        }
        staticTblXml += `${indentStr}</tabela>\n`;

        if (isFormulaTable) {
          conteudoXml += `${indentStr}<secao numerar="false">\n`;
          conteudoXml += staticTblXml;
          conteudoXml += `${indentStr}</secao>\n`;
        } else {
          conteudoXml += staticTblXml;
        }

        i++;
        continue;
      }

      const tableRotulo = lastContextLabel ? `Tabela: ${lastContextLabel}` : `Tabela ${tableCounter}`;
      const tableId = `tb_${normalizarIdentificadorValido(tableRotulo, 'tabela_' + tableCounter)}`;
      tableCounter++;

      const colLabels: string[] = [];
      const colIds: string[] = [];

      // Detecta cabeçalho e linhas
      let headerRowIndex = 0;
      if (t.rows && t.rows.length > 0) {
        // Verifica se a primeira linha é um banner (ex.: "Órgão Gerenciador:")
        const firstRowCells = t.rows[0].cells;
        const nonBlankCells = firstRowCells.filter((c: any) =>
          c.blocks.some((b: any) => b.runs && b.runs.some((r: any) => r.text.trim()))
        );

        if (nonBlankCells.length === 1 && t.rows.length > 1) {
          const bannerText = nonBlankCells[0].blocks
            .map((b: any) => (b.runs ? b.runs.map((r: any) => r.text).join('') : ''))
            .join(' ')
            .trim();
          if (bannerText) {
            // Emite banner como subtítulo para não consumir número de parágrafo decimal
            conteudoXml += `${indentStr}<subtitulo alinhamento="esquerda">${escapeXml(bannerText)}</subtitulo>\n`;
            headerRowIndex = 1;
          }
        }

        const headerRow = t.rows[headerRowIndex] || t.rows[0];
        for (let c = 0; c < headerRow.cells.length; c++) {
          const rawHeaderText = headerRow.cells[c].blocks
            .map((b: any) => (b.runs ? b.runs.map((r: any) => r.text).join('') : ''))
            .join(' ')
            .trim();
          const label = rawHeaderText || `Coluna ${c + 1}`;
          colLabels.push(label);
          colIds.push(normalizarIdentificadorValido(label, `coluna_${c + 1}`));
        }
      }

      const rowsJson: any[] = [];
      for (let r = headerRowIndex + 1; r < (t.rows?.length || 0); r++) {
        const rowData: Record<string, string> = {};
        for (let c = 0; c < t.rows[r].cells.length; c++) {
          const cId = colIds[c] || `coluna_${c + 1}`;
          rowData[cId] = t.rows[r].cells[c].blocks
            .map((b: any) => (b.runs ? b.runs.map((run: any) => run.text).join('') : ''))
            .join('\n')
            .trim();
        }
        rowsJson.push(rowData);
      }

      if (rowsJson.length === 0 && colIds.length > 0) {
        const initialEmptyRow: Record<string, string> = {};
        colIds.forEach((id) => (initialEmptyRow[id] = ''));
        rowsJson.push(initialEmptyRow);
      }

      jsonInicial[tableId] = rowsJson;

      // Registra a tabela para o formulário
      if (!tabelasExtraidas.has(tableId)) {
        const fields = new Map<string, FormFieldDef>();
        colIds.forEach((id, idx) => {
          fields.set(id, {
            id,
            tag: 'input',
            attrs: { label: colLabels[idx] || id, tipo: 'texto' },
          });
        });
        tabelasExtraidas.set(tableId, fields);
      }

      conteudoXml += `${indentStr}<tabela borda="true">\n`;
      conteudoXml += `${indentStr}  <cabecalho>\n`;
      conteudoXml += `${indentStr}    <linha>\n`;
      for (const label of colLabels) {
        conteudoXml += `${indentStr}      <coluna>${escapeXml(label)}</coluna>\n`;
      }
      conteudoXml += `${indentStr}    </linha>\n`;
      conteudoXml += `${indentStr}  </cabecalho>\n`;
      conteudoXml += `${indentStr}  <foreach lista="${tableId}" var="item">\n`;
      conteudoXml += `${indentStr}    <linha>\n`;
      for (const cId of colIds) {
        conteudoXml += `${indentStr}      <coluna>{{item.${cId}}}</coluna>\n`;
      }
      conteudoXml += `${indentStr}    </linha>\n`;
      conteudoXml += `${indentStr}  </foreach>\n`;
      conteudoXml += `${indentStr}</tabela>\n`;
      i++;
      continue;
    }

    const p = block as DocxParagraph;
    const rawXmlText = runsToXml(p.runs).trim();
    if (!rawXmlText) {
      i++;
      continue;
    }

    const processedText = processText(rawXmlText);
    const plainText = p.runs.map((r) => r.text).join('').trim();
    lastContextLabel = plainText.substring(0, 50);

    // 1. Título principal do documento
    if (p.isDocumentTitle) {
      closeAllSections();
      conteudoXml += `    <titulo alinhamento="centro">${processedText}</titulo>\n`;
      i++;
      continue;
    }

    // 2. Subtítulo (sem numeração)
    if (p.type === 'subtitulo') {
      closeSubsectionsBackToLevel2();
      const indentStr = '    ' + '  '.repeat(sectionStack.length);
      const nivelAttr = p.level ? ` nivel="${p.level}"` : '';
      conteudoXml += `${indentStr}<subtitulo${nivelAttr} alinhamento="esquerda">${processedText}</subtitulo>\n`;
      i++;
      continue;
    }

    // 3. Headings reais de seção (Nível 1 - Capítulos)
    if (p.type === 'h') {
      closeAllSections();

      const rawTitle = plainText;
      const cleanTitle = limparPrefixoNumericoTitulo(rawTitle);
      const isAnexo = /^(?:ANEXO|AP[ÊE]NDICE)\s+[I|V|X\d]+/i.test(plainText);
      const isNumberedHeading = p.isNumbered || Boolean(p.numeroWord) || /^\d+[\.\)]/.test(rawTitle);

      let deveReiniciar = false;
      if (!isAnexo && isNumberedHeading) {
        if (aposAnexo) {
          deveReiniciar = true;
          aposAnexo = false;
        } else if (p.restartNumbering || (secoesComTituloVistas > 0 && (p.numeroWord === '1.' || p.numeroWord === '1'))) {
          deveReiniciar = true;
        }
      } else {
        aposAnexo = true;
      }

      // REGRA DE OURO: Remoção de numero="X" - nunca emitir numero="..." em <secao>!
      // Se a numeração reinicia (ex.: após um Anexo ou com startOverride), emite reiniciar="true"
      let isSecaoNumerar = true;
      if (isAnexo || !isNumberedHeading) {
        conteudoXml += `    <secao titulo="${escapeXml(cleanTitle)}" numerar="false">\n`;
        isSecaoNumerar = false;
      } else if (deveReiniciar) {
        conteudoXml += `    <secao titulo="${escapeXml(cleanTitle)}" reiniciar="true">\n`;
        secoesComTituloVistas = 1;
      } else {
        conteudoXml += `    <secao titulo="${escapeXml(cleanTitle)}">\n`;
        secoesComTituloVistas++;
      }
      sectionStack.push({ level: 1, isHeading: true, numerar: isSecaoNumerar });
      currentDepth = 2;
      i++;
      continue;
    }

    // 4. Listas reais (romanos, letras, bullets, itens numerados de lista)
    if (p.type === 'li') {
      let tipoLista = 'numerada';
      const nw = p.numeroWord || '';
      if (p.numFmt === 'upperRoman' || /^[IVXLCDM]+\)/i.test(nw)) {
        tipoLista = 'romano';
      } else if (p.numFmt === 'lowerRoman' || /^[ivxlcdm]+\)/i.test(nw)) {
        tipoLista = 'romano_minusculo';
      } else if (p.numFmt === 'upperLetter' || /^[A-Z]\)/i.test(nw)) {
        tipoLista = 'letra_maiuscula';
      } else if (p.numFmt === 'lowerLetter' || /^[a-z]\)/i.test(nw)) {
        tipoLista = 'letra';
      } else if (p.numFmt === 'bullet' || nw === '•') {
        tipoLista = 'bullet';
      }

      // Agrupa todos os itens consecutivos de lista do mesmo tipo
      const listItems: string[] = [];
      while (i < blocks.length && blocks[i].type === 'li') {
        const currP = blocks[i] as DocxParagraph;
        const currNw = currP.numeroWord || '';
        let currTipo = 'numerada';
        if (currP.numFmt === 'upperRoman' || /^[IVXLCDM]+\)/i.test(currNw)) currTipo = 'romano';
        else if (currP.numFmt === 'lowerRoman' || /^[ivxlcdm]+\)/i.test(currNw)) currTipo = 'romano_minusculo';
        else if (currP.numFmt === 'upperLetter' || /^[A-Z]\)/i.test(currNw)) currTipo = 'letra_maiuscula';
        else if (currP.numFmt === 'lowerLetter' || /^[a-z]\)/i.test(currNw)) currTipo = 'letra';
        else if (currP.numFmt === 'bullet' || currNw === '•') currTipo = 'bullet';

        if (currTipo !== tipoLista) break;

        const itemXml = runsToXml(currP.runs).trim();
        const itemProcessed = processText(itemXml);
        const cleanItemText = limparPrefixoItemLista(itemProcessed);
        listItems.push(cleanItemText);
        i++;
      }

      const indentStr = '    ' + '  '.repeat(sectionStack.length);
      conteudoXml += `${indentStr}<lista tipo="${tipoLista}">\n`;
      for (const itemText of listItems) {
        conteudoXml += `${indentStr}  <item>${itemText}</item>\n`;
      }
      conteudoXml += `${indentStr}</lista>\n`;
      continue;
    }

    // 5. Parágrafos comuns de fluxo do documento
    // Se ainda não começou nenhuma seção de nível 1 com título (cabeçalho pré-textual):
    if (sectionStack.length === 0) {
      conteudoXml += `    <secao numerar="false">\n`;
      sectionStack.push({ level: 1, isHeading: false, numerar: false });
      currentDepth = 2;
    }

    // Se o parágrafo NÃO é numerado no Word (ex.: blocos de assinatura, notas, fórmulas, observações, conectivos):
    // REGRA 1 DO README: Parágrafos limpos — banido o uso de atributos como nivel="..." e numerado="false" em todas as tags <p>.
    // REGRA 7 DO README: Conectivos, fórmulas e notas não numeradas devem ser agrupadas dentro de <secao numerar="false">.
    if (!p.isNumbered) {
      const isAlreadyInUnnumbered = sectionStack.some((s) => s.numerar === false);
      if (isAlreadyInUnnumbered) {
        const contentIndent = '    ' + '  '.repeat(sectionStack.length);
        conteudoXml += `${contentIndent}<p>${processedText}</p>\n`;
        i++;
        continue;
      }

      // Se estamos dentro de uma seção numerada, agrupa parágrafos consecutivos não-numerados em <secao numerar="false">:
      closeSubsectionsBackToLevel2();
      const contentIndent = '    ' + '  '.repeat(sectionStack.length);
      conteudoXml += `${contentIndent}<secao numerar="false">\n`;
      while (i < blocks.length && blocks[i].type !== 'table') {
        const np = blocks[i] as DocxParagraph;
        if (np.isNumbered || np.type === 'h' || np.type === 'subtitulo' || np.type === 'li' || np.isDocumentTitle) {
          break;
        }
        const nRawXmlText = runsToXml(np.runs).trim();
        if (nRawXmlText) {
          const nProcessedText = processText(nRawXmlText);
          conteudoXml += `${contentIndent}  <p>${nProcessedText}</p>\n`;
        }
        i++;
      }
      conteudoXml += `${contentIndent}</secao>\n`;
      continue;
    }

    // Parágrafos numerados (com numeração decimal 1.1, 1.1.1, 2.1, etc.)
    let targetLevel = 2;
    if (p.numeroWord && /^\d+(?:\.\d+)*\.?$/.test(p.numeroWord)) {
      const parts = p.numeroWord.replace(/\.$/, '').split('.');
      targetLevel = Math.max(2, parts.length);
    } else if (p.ilvl !== undefined && p.ilvl !== '0') {
      targetLevel = Math.max(2, parseInt(p.ilvl, 10) + 1);
    }

    // Ajusta a profundidade de subseções sem título (<secao>) se estivermos dentro de uma seção com título
    if (sectionStack.length > 0 && sectionStack[0].isHeading) {
      while (currentDepth < targetLevel) {
        const ind = '    ' + '  '.repeat(sectionStack.length);
        conteudoXml += `${ind}<secao>\n`;
        sectionStack.push({ level: currentDepth + 1, isHeading: false });
        currentDepth++;
      }
      while (currentDepth > targetLevel && sectionStack.length > 1) {
        currentDepth--;
        sectionStack.pop();
        const ind = '    ' + '  '.repeat(sectionStack.length);
        conteudoXml += `${ind}</secao>\n`;
      }
    }

    const contentIndent = '    ' + '  '.repeat(sectionStack.length);
    const cleanParagraphText = limparPrefixoNumericoParagrafo(processedText);
    conteudoXml += `${contentIndent}<p>${cleanParagraphText}</p>\n`;
    i++;
  }

  // Fecha todas as seções ainda abertas
  closeAllSections();

  // Monta o bloco <formulario>
  let formularioXml = '  <formulario>\n';
  if (camposExtraidos.size > 0) {
    formularioXml += '    <grupo titulo="Campos Identificados">\n';
    for (const field of Array.from(camposExtraidos.values())) {
      jsonInicial[field.id] = '';
      const attrsStr = Object.entries(field.attrs)
        .map(([k, v]) => `${k}="${escapeXml(v)}"`)
        .join(' ');
      const optStr = field.options
        ? `\n        ` + field.options.map((o) => `<opcao valor="${escapeXml(o)}">${escapeXml(o)}</opcao>`).join('\n        ') + `\n      `
        : '';
      formularioXml += `      <${field.tag} id="${field.id}" ${attrsStr}${field.options ? `>${optStr}</${field.tag}>\n` : ' />\n'}`;
    }
    formularioXml += '    </grupo>\n';
  }

  if (tabelasExtraidas.size > 0) {
    formularioXml += '    <grupo titulo="Tabelas do Documento">\n';
    for (const [tableId, fields] of Array.from(tabelasExtraidas.entries())) {
      const tableLabel = tableId.replace(/^tb_/, '').replace(/_/g, ' ');
      formularioXml += `      <tabela id="${tableId}" rotulo="${escapeXml(tableLabel)}">\n`;
      for (const field of Array.from(fields.values())) {
        formularioXml += `        <coluna id="${field.id}" rotulo="${escapeXml(field.attrs.label || field.id)}" tipo="${field.attrs.tipo || 'texto'}" />\n`;
      }
      formularioXml += `      </tabela>\n`;
    }
    formularioXml += '    </grupo>\n';
  }
  formularioXml += '  </formulario>\n';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<documento>\n  <!-- Convertido nativamente de ${escapeXml(fileName)} -->\n`;
  xml += formularioXml;
  xml += '  <conteudo>\n';
  xml += conteudoXml;
  xml += '  </conteudo>\n';
  xml += '</documento>';

  return { xml, jsonInicial };
}
