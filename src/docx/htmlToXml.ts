import { ColumnType, ListType } from '../types';
import type { DocxParagraphInfo } from './types';
import { decodificarEntidadesXml } from '../utils/expressionEvaluator';
import { escapeXml, extrairTextoComEspacos, limparEspacos, normalizarIdentificadorValido, parseHtmlDoc } from './domText';

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/**
 * Regra genérica de numeração vinda APENAS da estrutura do Word (sem olhar o texto/título).
 * Um título/sessão só deve participar da numeração automática se o parágrafo-fonte tem
 * numeração decimal correntemente ativa no Word (não bullet, não lista e não desligada
 * via "Sem Numeração"/SemNum/numId 0). Onde o parágrafo-fonte não numera, marcamos o nó
 * para NÃO contar no fluxo (numerar="false"), deixando a numeração dinâmica do painel
 * alinhada à do Word de forma genérica.
 */
function participarDaNumeraçãoDoWord(p?: DocxParagraphInfo, fallback = true): boolean {
  if (!p) return fallback;
  if (p.isSubtitle === true) return false;           // subtítulo / sem numeração
  if (p.isBullet === true || p.numFmt === 'bullet') return false;
  if (p.isListParagraph === true) return false;       // item de lista (não seção)
  // Precisa ter numeração decimal ativa de seção
  return p.isAutomaticNumbered === true;
}

type FormFieldDef = {
  id: string;
  tag: string;
  attrs: Record<string, string>;
  options?: string[];
};

export function coletarItensDeLista(rootEl: HTMLElement): Array<{
  li: HTMLElement;
  text: string;
  isOrdered: boolean;
  depth: number;
}> {
  const result: Array<{
    li: HTMLElement;
    text: string;
    isOrdered: boolean;
    depth: number;
  }> = [];

function walk(node: HTMLElement, currentDepth: number, parentIsOrdered: boolean) {
    const isOrdered = node.tagName.toLowerCase() === 'ol' ? true : node.tagName.toLowerCase() === 'ul' ? false : parentIsOrdered;
    const children = Array.from(node.children) as HTMLElement[];
    for (const child of children) {
      if (child.tagName.toLowerCase() === 'li') {
        const subLists = Array.from(child.children).filter(c => c.tagName.toLowerCase() === 'ul' || c.tagName.toLowerCase() === 'ol') as HTMLElement[];
        const clone = child.cloneNode(true) as HTMLElement;
        Array.from(clone.children).forEach(c => {
          if (c.tagName.toLowerCase() === 'ul' || c.tagName.toLowerCase() === 'ol') {
            c.remove();
          }
        });
        const directText = limparEspacos(extrairTextoComEspacos(clone));
        if (directText.length > 0) {
          result.push({
            li: clone,
            text: directText,
            isOrdered,
            depth: currentDepth,
          });
        }
        for (const subList of subLists) {
          walk(subList, currentDepth + 1, subList.tagName.toLowerCase() === 'ol');
        }
      } else if (child.tagName.toLowerCase() === 'ul' || child.tagName.toLowerCase() === 'ol') {
        walk(child, currentDepth + 1, child.tagName.toLowerCase() === 'ol');
      }
    }
  }

  walk(rootEl, 0, rootEl.tagName.toLowerCase() === 'ol');
  return result;
}

export function transformarHtmlParaEstruturaXml(
  html: string,
  nomeArquivo: string,
  docxParagraphs?: DocxParagraphInfo[]
): { xml: string; jsonInicial: Record<string, any> } {
  const doc = parseHtmlDoc(html);
  
  const childNodes = Array.from(doc.body.childNodes);
  let conteudoXml = '';
  const formulariosXml: string[] = [];
  const jsonInicial: Record<string, any> = {};
  
  const tabelaIdsUsados = new Set<string>();
  
  const camposExtraidos = new Map<string, FormFieldDef>();
  const tabelasExtraidas = new Map<string, Map<string, FormFieldDef>>();
  let currentForeachTable: string | null = null;

function processText(text: string): string {
      return text.replace(/\{\{\s*(.*?)\s*\}\}/g, (match, inner) => {
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
          if (lowerRaw === '/if' || lowerRaw === 'endif' || lowerRaw === 'end_if' || lowerRaw.startsWith('/if') || lowerRaw.startsWith('endif') || lowerRaw.startsWith('end_if')) {
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
          if (lowerRaw === '/foreach' || lowerRaw === 'endforeach' || lowerRaw === 'end_foreach' || lowerRaw.startsWith('/foreach') || lowerRaw.startsWith('endforeach') || lowerRaw.startsWith('end_foreach')) {
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
              label = label.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
          
          let replacement = isItem ? `{{item.${id}` : `{{${id}`;
          if (displayFilters.length > 0) {
              replacement += ` | ${displayFilters.join(' | ')}`;
          }
          replacement += `}}`;
          return replacement;
      });
  }

  const serializeInner = (node: Node): string => {
    if (node.nodeType === TEXT_NODE) return processText(escapeXml(node.textContent || ''));
    if (node.nodeType === ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.nodeName.toLowerCase();
      if (tag === 'br') return '<br/>';
      const inner = Array.from(el.childNodes).map(serializeInner).join('');
      if (['b', 'strong'].includes(tag)) return `<b>${inner}</b>`;
      if (['i', 'em'].includes(tag)) return `<i>${inner}</i>`;
      if (['u'].includes(tag)) return `<u>${inner}</u>`;
      if (['s', 'strike', 'del'].includes(tag)) return `<s>${inner}</s>`;
      if (['mark'].includes(tag)) return `<mark>${inner}</mark>`;
      if (tag === 'span' && el.style.color) return `<cor cor="${el.style.color}">${inner}</cor>`;
      return inner;
    }
    return '';
  };

function isElementAllBold(el: HTMLElement): boolean {
    const totalText = limparEspacos(extrairTextoComEspacos(el));
    if (!totalText) return false;
    
    // Verifica se a própria tag é b ou strong
    const tag = el.nodeName.toLowerCase();
    if (tag === 'b' || tag === 'strong') return true;

    // Extrai o texto contido dentro de nós <b>, <strong> ou elementos com font-weight bold
    const boldNodes = el.querySelectorAll('b, strong, [style*="font-weight: bold"], [style*="font-weight:bold"], [style*="font-weight: 700"], [style*="font-weight:700"]');
    if (boldNodes.length === 0) return false;

    let boldText = '';
    boldNodes.forEach(b => {
      boldText += ' ' + extrairTextoComEspacos(b);
    });
    boldText = limparEspacos(boldText);

    return boldText.length >= totalText.length * 0.88 || boldText === totalText;
  }

  interface HeadingInfo {
    level: number;
    title: string;
    isDocumentTitle?: boolean;
    isAutomaticNumbered?: boolean;
    exibido?: number;
  }

function extrairInfoCabecalho(el: HTMLElement, isFirstBlock: boolean): HeadingInfo | null {
    const tag = el.nodeName.toLowerCase();
    const rawText = limparEspacos(extrairTextoComEspacos(el));
    if (!rawText) return null;

    // Não deve tratar como título se for rótulo comum de banner de tabela de órgãos/lotes
    if (/^(?:[oó]rg[ãa]o\s+(?:gerenciador|participante)|lote\s+\d+|item\s+\d+)\s*:?$/i.test(rawText)) {
      return null;
    }

    // Frases corridas que terminam com ponto final, ponto e vírgula, vírgula ou dois pontos são parágrafos/itens, NÃO títulos de seção
    if (rawText.endsWith('.') || rawText.endsWith(';') || rawText.endsWith(',') || rawText.endsWith(':')) {
      return null;
    }

    // Sentenças que iniciam com letra minúscula são continuações de texto/itens, NÃO títulos de seção
    if (/^[a-zà-ú]/.test(rawText)) {
      return null;
    }

    // Não trata como cabeçalho se for parágrafo longo (> 110 caracteres) ou texto corrido com variáveis
    if (rawText.length > 110 || (rawText.includes('{{') && rawText.length > 70)) {
      return null;
    }

    // Não deve ser título se terminar com conjunção " e" ou " ou" ou reticências
    if (/\b(?:e|ou)\s*$/i.test(rawText) || rawText.includes('[...]') || rawText.includes('…')) {
      return null;
    }

    // Não deve ser título se for apenas uma conjunção isolada
    if (/^(?:OU|E)$/i.test(rawText)) {
      return null;
    }

    // Não deve ser título se for equação/fórmula
    if (/^(?:LG|SG|LC)\s*=/i.test(rawText)) {
      return null;
    }

    // Verifica se no documento original do Word este parágrafo é subtítulo ou parágrafo sem nível de seção
    let foundDocxP: DocxParagraphInfo | undefined;
    if (docxParagraphs && docxParagraphs.length > 0) {
      const cleanNorm = rawText.replace(/[:\s]+$/, '').toLowerCase().replace(/[^a-z0-9à-ú]/g, '');
      if (cleanNorm) {
        foundDocxP = docxParagraphs.find(p => {
          if (!p.normalizedText) return false;
          const pNorm = p.normalizedText.toLowerCase().replace(/[^a-z0-9à-ú]/g, '');
          return pNorm === cleanNorm || (pNorm.length > 8 && (pNorm.startsWith(cleanNorm) || cleanNorm.startsWith(pNorm)));
        });
      }
    }

    if (foundDocxP?.isSubtitle) {
      return null;
    }

    // 1. Tags nativas de Heading geradas pelo Mammoth (h1..h6)
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      if (foundDocxP && !foundDocxP.isHeading && foundDocxP.level === undefined) {
        return null;
      }
      const level = foundDocxP?.level || parseInt(tag.substring(1), 10);
      const isDocTitle = level === 1 && isFirstBlock;
      const cleanTitle = rawText.replace(/[:\s]+$/, '').trim();
      return {
        level,
        title: cleanTitle || rawText,
        isDocumentTitle: isDocTitle,
        isAutomaticNumbered: foundDocxP?.isAutomaticNumbered ?? true,
        exibido: foundDocxP?.exibido,
      };
    }

    // Apenas parágrafos (<p>) e itens de lista (<li>) são analisados para detecção estrutural
    if (tag !== 'p' && tag !== 'li') return null;

    // Texto sem dois-pontos final para avaliação
    const textWithoutColon = rawText.replace(/[:\s]+$/, '').trim();

    // Não deve ser título se contiver colchetes ou chaves (placeholders/opções de preenchimento)
    if (/[\{\}\[\]]/.test(textWithoutColon)) {
      return null;
    }

    // Não deve ser título se contiver dois-pontos internos (exceto divisões formais como Cláusula Primeira: Objeto)
    if (textWithoutColon.includes(':') && !/^(?:CL[ÁA]USULA|CAP[ÍI]TULO|SE[ÇC][ÃA]O|ARTIGO|ANEXO|AP[ÊE]NDICE)/i.test(textWithoutColon)) {
      return null;
    }

    // 2. Busca na estrutura nativa de parágrafos do Word (word/document.xml, w:outlineLvl, w:numPr, w:pStyle)
    if (docxParagraphs && docxParagraphs.length > 0) {
      const cleanNorm = textWithoutColon.toLowerCase().replace(/[^a-z0-9à-ú]/g, '');
      if (cleanNorm) {
        const foundDocxP = docxParagraphs.find(p => {
          if (!p.normalizedText) return false;
          const pNorm = p.normalizedText.toLowerCase().replace(/[^a-z0-9à-ú]/g, '');
          return pNorm === cleanNorm || (pNorm.length > 8 && (pNorm.startsWith(cleanNorm) || cleanNorm.startsWith(pNorm)));
        });

        if (foundDocxP) {
          if (foundDocxP.isSubtitle) {
            return null;
          }
          if (foundDocxP.isHeading && foundDocxP.level !== undefined) {
            // Não trata como título se terminar com ponto final corrido
            if (rawText.endsWith('.') && !isFirstBlock) {
              return null;
            }
            return {
              level: foundDocxP.level,
              title: textWithoutColon,
              isDocumentTitle: foundDocxP.level === 1 && isFirstBlock,
              isAutomaticNumbered: foundDocxP.isAutomaticNumbered,
              exibido: foundDocxP.exibido,
            };
          }
        }
      }
    }

    // 3. Prefixos Markdown (# Titulo, ## Titulo, ### Titulo...)
    const mdMatch = rawText.match(/^(#{1,6})\s+(.+)$/);
    if (mdMatch) {
      const level = mdMatch[1].length;
      const title = mdMatch[2].replace(/[:\s]+$/, '').trim();
      return {
        level,
        title,
        isDocumentTitle: level === 1 && isFirstBlock,
        isAutomaticNumbered: true,
      };
    }

    const isAllBold = isElementAllBold(el);

    // 4. Título Principal do Documento no primeiro bloco em destaque (ex: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS")
    if (isFirstBlock && isAllBold && rawText.length < 130 && !rawText.includes(':') && !rawText.includes(';') && !rawText.endsWith('.')) {
      return { level: 1, title: textWithoutColon, isDocumentTitle: true, isAutomaticNumbered: false };
    }

    // 5. Cláusulas e divisões formais estritamente como TÍTULOS de seção (ex: "CLÁUSULA PRIMEIRA - DO OBJETO", "CAPÍTULO I - DISPOSIÇÕES GERAIS", "ANEXO I - TERMO DE REFERÊNCIA")
    const isExplicitTitleHeader = /^(?:(?:CL[ÁA]USULA|CLAUSULA)\s+(?:PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|SEXTA|S[ÉE]TIMA|SETIMA|OITAVA|NONA|D[ÉE]CIMA|DECIMA|\d+[ªºa-zA-Z]*|[IVXLCDM]+)|CAP[ÍI]TULO\s+[IVXLCDM\d]+|SE[ÇC][ÃA]O\s+[IVXLCDM\d]+|ANEXO\s+[IVXLCDM\d]+|AP[ÊE]NDICE\s+[IVXLCDM\d]+)\s*[-–—:]\s*[A-ZÀ-Ú]/i.test(textWithoutColon);
    if (isExplicitTitleHeader && textWithoutColon.length < 80 && !textWithoutColon.includes(';') && !textWithoutColon.endsWith('.')) {
      return { level: 2, title: textWithoutColon, isAutomaticNumbered: false };
    }

    return null;
  }

  interface StackSection {
    level: number;
    isHeading: boolean;
  }
  const sectionStack: StackSection[] = [];

  const closeSubSections = () => {
    while (sectionStack.length > 0 && !sectionStack[sectionStack.length - 1].isHeading) {
      sectionStack.pop();
      const indent = '  '.repeat(sectionStack.length + 2);
      conteudoXml += `${indent}</secao>\n`;
    }
  };

  const closeSectionsDownTo = (targetLevel: number) => {
    closeSubSections();
    while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level >= targetLevel) {
      sectionStack.pop();
      const indent = '  '.repeat(sectionStack.length + 2);
      conteudoXml += `${indent}</secao>\n`;
    }
  };

  const closeAllSections = () => {
    while (sectionStack.length > 0) {
      sectionStack.pop();
      const indent = '  '.repeat(sectionStack.length + 2);
      conteudoXml += `${indent}</secao>\n`;
    }
  };

  const getNearestHeadingLevel = (): number => {
    for (let s = sectionStack.length - 1; s >= 0; s--) {
      if (sectionStack[s].isHeading) return sectionStack[s].level;
    }
    return 1;
  };

  const getCurrentActiveLevel = (): number => {
    if (sectionStack.length === 0) return 1;
    const top = sectionStack[sectionStack.length - 1];
    return top.isHeading ? (top.level + 1) : top.level;
  };

  const syncSubSectionsToLevel = (targetLevel: number) => {
    const baseLevel = getNearestHeadingLevel() + 1;
    const clampedTarget = Math.max(baseLevel, targetLevel);

    // Fecha subseções abertas se o nível alvo for menor
    while (
      sectionStack.length > 0 &&
      !sectionStack[sectionStack.length - 1].isHeading &&
      getCurrentActiveLevel() > clampedTarget
    ) {
      sectionStack.pop();
      const indent = '  '.repeat(sectionStack.length + 2);
      conteudoXml += `${indent}</secao>\n`;
    }

    // Abre novas subseções se o nível alvo for maior
    while (getCurrentActiveLevel() < clampedTarget) {
      const nextLevel = getCurrentActiveLevel() + 1;
      const indent = '  '.repeat(sectionStack.length + 2);
      conteudoXml += `${indent}<secao>\n`;
      sectionStack.push({ level: nextLevel, isHeading: false });
    }
  };

  const emitParagraph = (content: string, foundDocxP?: DocxParagraphInfo) => {
    const baseLevel = getNearestHeadingLevel() + 1;
    let pLevel = baseLevel;
    if (foundDocxP?.paragraphLevel && foundDocxP.paragraphLevel >= 2) {
      pLevel = Math.min(8, foundDocxP.paragraphLevel);
    } else if (foundDocxP?.level && foundDocxP.level >= 2) {
      pLevel = Math.min(8, foundDocxP.level);
    }

    syncSubSectionsToLevel(pLevel);
    const indent = '  '.repeat(sectionStack.length + 2);

    let numeradoAttr = '';
    if (foundDocxP && (foundDocxP.numId === '0' || foundDocxP.isAutomaticNumbered === false)) {
      numeradoAttr = ' numerado="false"';
    }
    // Tag <p> limpa, sem atributos de nível
    conteudoXml += `${indent}<p${numeradoAttr}>${content}</p>\n`;
  };

  let tableIndex = 0;
  let nonHeadingSeen = false;
  let lastContextLabel = '';

  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i];
    if (node.nodeType !== ELEMENT_NODE) continue;
    
    const el = node as HTMLElement;
    const tag = el.nodeName.toLowerCase();
    const isFirstBlock = !nonHeadingSeen;
    const headingInfo = extrairInfoCabecalho(el, isFirstBlock);

    if (headingInfo) {
      let tituloLimpo = processText(escapeXml(headingInfo.title)).trim();
      tituloLimpo = tituloLimpo
        .replace(/^#+\s*/, '')
        .replace(/<(if|foreach|\/if|\/foreach)[^>]*>/g, '')
        .replace(/[:\s]+$/, '')
        .trim();

      lastContextLabel = tituloLimpo;

      if (headingInfo.isDocumentTitle) {
        closeAllSections();
        conteudoXml += `    <titulo alinhamento="centro">${tituloLimpo}</titulo>\n`;
      } else {
        closeSectionsDownTo(headingInfo.level);

        // Se o título veio com numeração manual digitada no texto ("CLÁUSULA PRIMEIRA", "1. ", etc.), desativa auto-numeração
        const hasManualNumbering = /^(?:CL[ÁA]USULA|CAP[ÍI]TULO|SE[ÇC][ÃA]O|ARTIGO|ART\.|PAR[ÁA]GRAFO|ANEXO|AP[ÊE]NDICE|\d+[\.\-–—\)]|[IVXLCDM]+[\.\-–—]|[A-Z]\))/i.test(tituloLimpo);
        const numerarAttr = (hasManualNumbering && !headingInfo.isAutomaticNumbered) ? ' numerar="false"' : ' numerar="true"';

        let numeroAttr = '';
        if (headingInfo.exibido !== undefined) {
          numeroAttr = ` numero="${headingInfo.exibido}"`;
        }

        const indent = '  '.repeat(sectionStack.length + 2);
        conteudoXml += `${indent}<secao titulo="${tituloLimpo}"${numerarAttr}${numeroAttr}>\n`;
        sectionStack.push({ level: headingInfo.level, isHeading: true });
      }
      continue;
    }

    nonHeadingSeen = true;
    const indent = '  '.repeat(sectionStack.length + 2);

    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div'].includes(tag)) {
      const rawText = limparEspacos(extrairTextoComEspacos(el));
      // Se for um parágrafo curto (ex: "Órgão Gerenciador:", "Órgão Participante:"), guarda como contexto para a tabela seguinte
      if (rawText && rawText.length < 90 && !rawText.includes('{{')) {
        lastContextLabel = rawText.replace(/[:.\s]+$/, '').trim();
      }

      const content = serializeInner(el).trim();
      if (content) {
        if (/^(?:<if[^>]*>|<\/if>|<foreach[^>]*>|<\/foreach>|\s*)+$/.test(content)) {
          conteudoXml += `${indent}${content}\n`;
        } else {
          // Busca informações do parágrafo no documento do Word, se houver
          let foundDocxP: DocxParagraphInfo | undefined;
          if (docxParagraphs && docxParagraphs.length > 0 && rawText) {
            const cleanNorm = rawText.replace(/[:\s]+$/, '').toLowerCase().replace(/[^a-z0-9à-ú]/g, '');
            if (cleanNorm) {
              foundDocxP = docxParagraphs.find(p => {
                if (!p.normalizedText) return false;
                const pNorm = p.normalizedText.toLowerCase().replace(/[^a-z0-9à-ú]/g, '');
                return pNorm === cleanNorm || (pNorm.length > 8 && (pNorm.startsWith(cleanNorm) || cleanNorm.startsWith(pNorm)));
              });
            } else if (rawText.trim()) {
              const rawTrim = rawText.trim();
              foundDocxP = docxParagraphs.find(p => (p.normalizedText || '').trim() === rawTrim);
            }
          }

          if (foundDocxP?.isSubtitle) {
            syncSubSectionsToLevel(getNearestHeadingLevel() + 1);
            const indentSub = '  '.repeat(sectionStack.length + 2);
            conteudoXml += `${indentSub}<subtitulo alinhamento="esquerda">${content}</subtitulo>\n`;
          } else {
            emitParagraph(content, foundDocxP);
          }
        }
      }
    } else if (tag === 'hr') {
      syncSubSectionsToLevel(getNearestHeadingLevel() + 1);
      const indentHr = '  '.repeat(sectionStack.length + 2);
      conteudoXml += `${indentHr}<hr />\n`;
    } else if (['ul', 'ol'].includes(tag)) {
      const items = coletarItensDeLista(el);
      if (items.length === 0) continue;

      // Mapeia cada item da lista ao parágrafo DOCX correspondente
      const itemsWithDocx = items.map(item => {
        const rawLiText = item.text;
        const cleanNorm = rawLiText.replace(/[:\s]+$/, "").toLowerCase().replace(/[^a-z0-9à-ú]/g, "");
        const foundDocxP = docxParagraphs?.find(p => {
          if (!p.normalizedText) return false;
          const pNorm = p.normalizedText.toLowerCase().replace(/[^a-z0-9à-ú]/g, "");
          return pNorm === cleanNorm || (pNorm.length > 8 && (pNorm.startsWith(cleanNorm) || cleanNorm.startsWith(pNorm)));
        });
        return { ...item, rawLiText, foundDocxP };
      });

      // Buffer para agrupar itens que pertencem a uma lista verdadeira
      let currentListBuffer: typeof itemsWithDocx = [];

      const flushListBuffer = () => {
        if (currentListBuffer.length === 0) return;

        const bufferIsOrdered = currentListBuffer[0].isOrdered;
        let listType: ListType = bufferIsOrdered ? 'numerada' : 'bullet';

        // 1. Inspeciona formato nos parágrafos DOCX mapeados
        for (const it of currentListBuffer) {
          const numFmt = it.foundDocxP?.numFmt;
          if (numFmt === 'upperRoman') {
            listType = 'romano';
            break;
          } else if (numFmt === 'lowerRoman') {
            listType = 'romano_minusculo';
            break;
          } else if (numFmt === 'lowerLetter') {
            listType = 'letra';
            break;
          } else if (numFmt === 'upperLetter') {
            listType = 'letra_maiuscula';
            break;
          } else if (it.foundDocxP?.isBullet) {
            listType = 'bullet';
          }
        }

        // 2. Se ainda for genérica e tiver numeração manual digitada no início dos itens
        if (listType === 'numerada' || listType === 'bullet') {
          const firstItemText = currentListBuffer[0]?.rawLiText || '';
          if (/^[IVXLCDM]+[\)\.\-–—]/i.test(firstItemText)) {
            listType = 'romano';
          } else if (/^[a-z]\)/i.test(firstItemText)) {
            listType = 'letra';
          } else if (/^[A-Z]\)/.test(firstItemText)) {
            listType = 'letra_maiuscula';
          }
        }

        let tipoAttr = '';
        if (listType === 'romano') {
          tipoAttr = ' tipo="romano"';
        } else if (listType === 'romano_minusculo') {
          tipoAttr = ' tipo="romano_minusculo"';
        } else if (listType === 'letra') {
          tipoAttr = ' tipo="letra"';
        } else if (listType === 'letra_maiuscula') {
          tipoAttr = ' tipo="letra_maiuscula"';
        } else if (listType === 'numerada') {
          tipoAttr = ' tipo="numerada"';
        }

        conteudoXml += `${indent}<lista${tipoAttr}>\n`;
        currentListBuffer.forEach(it => {
          let itemContent = serializeInner(it.li).trim();
          // Remove prefixo manual duplicado se houver (ex: "I) ", "a) ", "1. ", etc.)
          if (listType === 'romano') {
            itemContent = itemContent.replace(/^[IVXLCDM]+[\)\.\-–—]\s*/i, '');
          } else if (listType === 'romano_minusculo') {
            itemContent = itemContent.replace(/^[ivxlcdm]+[\)\.\-–—]\s*/, '');
          } else if (listType === 'letra') {
            itemContent = itemContent.replace(/^[a-z][\)\.\-–—]\s*/i, '');
          } else if (listType === 'letra_maiuscula') {
            itemContent = itemContent.replace(/^[A-Z][\)\.\-–—]\s*/, '');
          } else if (listType === 'numerada') {
            itemContent = itemContent.replace(/^\d+[\)\.\-–—]\s*/, '');
          }
          conteudoXml += `${indent}  <item>${itemContent}</item>\n`;
        });
        conteudoXml += `${indent}</lista>\n`;

        currentListBuffer = [];
      };

      for (const it of itemsWithDocx) {
        // Verifica se é cabeçalho de seção
        const liHeadingInfo = extrairInfoCabecalho(it.li, !nonHeadingSeen);
        const isHeading = liHeadingInfo || it.foundDocxP?.isHeading;

        if (isHeading && (liHeadingInfo?.level || it.foundDocxP?.level)) {
          flushListBuffer();
          const lvl = liHeadingInfo?.level || it.foundDocxP?.level || 1;
          const rawHeadingTitle = liHeadingInfo?.title || it.rawLiText;
          let tituloLimpo = processText(escapeXml(rawHeadingTitle)).trim();
          tituloLimpo = tituloLimpo
            .replace(/^#+\s*/, '')
            .replace(/<(if|foreach|\/if|\/foreach)[^>]*>/g, '')
            .replace(/[:\s]+$/, '')
            .trim();

          lastContextLabel = tituloLimpo;
          closeSectionsDownTo(lvl);

          const hasManualNumbering = /^(?:CL[ÁA]USULA|CAP[ÍI]TULO|SE[ÇC][ÃA]O|ARTIGO|ART\.|PAR[ÁA]GRAFO|ANEXO|AP[ÊE]NDICE|\d+[\.\-–—\)]|[IVXLCDM]+[\.\-–—]|[A-Z]\))/i.test(tituloLimpo);
          // Numeração vinda só da estrutura do Word: desliga quando o parágrafo-fonte não integra
          // um fluxo numerado (subtítulo/SemNum, bullet ou lista). Sem heurística de texto.
          const contaNoFluxo = participarDaNumeraçãoDoWord(it.foundDocxP, (liHeadingInfo && liHeadingInfo.isAutomaticNumbered) ?? !hasManualNumbering);
          const numerarAttr = contaNoFluxo ? ' numerar="true"' : ' numerar="false"';
          
          let numeroAttr = '';
          const exibido = liHeadingInfo?.exibido ?? it.foundDocxP?.exibido;
          if (exibido !== undefined) {
            numeroAttr = ` numero="${exibido}"`;
          }

          const indentSec = '  '.repeat(sectionStack.length + 2);
          conteudoXml += `${indentSec}<secao titulo="${tituloLimpo}"${numerarAttr}${numeroAttr}>\n`;
          sectionStack.push({ level: lvl, isHeading: true });
          nonHeadingSeen = true;
        } else if (it.foundDocxP?.isSubtitle) {
          flushListBuffer();
          syncSubSectionsToLevel(getNearestHeadingLevel() + 1);
          const content = serializeInner(it.li).trim();
          if (content) {
            const indentSub = '  '.repeat(sectionStack.length + 2);
            conteudoXml += `${indentSub}<subtitulo alinhamento="esquerda">${content}</subtitulo>\n`;
          }
        } else if (
          it.foundDocxP &&
          (it.foundDocxP.numId === '0' || it.foundDocxP.isAutomaticNumbered === false)
        ) {
          flushListBuffer();
          const content = serializeInner(it.li).trim();
          if (content) {
            emitParagraph(content, it.foundDocxP);
          }
        } else if (
          it.foundDocxP &&
          !it.foundDocxP.isListParagraph &&
          (it.foundDocxP.paragraphLevel || it.foundDocxP.level) &&
          ((it.foundDocxP.paragraphLevel && it.foundDocxP.paragraphLevel >= 2) || (it.foundDocxP.level && it.foundDocxP.level >= 2))
        ) {
          flushListBuffer();
          const content = serializeInner(it.li).trim();
          if (content) {
            emitParagraph(content, it.foundDocxP);
          }
        } else {
          // É item de lista verdadeiro
          currentListBuffer.push(it);
        }
      }

      flushListBuffer();
    } else if (tag === 'table') {
      syncSubSectionsToLevel(getNearestHeadingLevel() + 1);
      const allRows = Array.from(el.querySelectorAll('tr'));
      if (allRows.length === 0) continue;

      const rowCellCounts = allRows.map(r => r.querySelectorAll('td, th').length);
      const maxCols = Math.max(...rowCellCounts, 0);

      // Agrupa as linhas da tabela em segmentos lógicos (sub-tabelas com possíveis títulos de banner)
      interface SubTableSegment {
        bannerTitle?: string;
        headerCells: HTMLElement[];
        dataRows: HTMLElement[];
      }

      const isBannerRow = (r: HTMLElement, idx: number): boolean => {
        const cells = Array.from(r.querySelectorAll('td, th'));
        if (cells.length === 0) return false;
        const txt = limparEspacos(extrairTextoComEspacos(r));
        if (!txt) return false;
        
        // Se a linha tiver apenas 1 ou 2 células num contexto de tabela com mais colunas
        const colSpanAttr = cells[0].getAttribute('colspan');
        const colSpan = colSpanAttr ? parseInt(colSpanAttr, 10) : 1;
        const isSingleCellOrColspan = cells.length === 1 || colSpan >= maxCols - 1 || (cells.length <= 2 && maxCols >= 4);
        
        if (isSingleCellOrColspan) {
          if (idx === 0 || txt.endsWith(':') || /^(?:[oó]rg[ãa]o|lote|grupo|tabela|anexo|parte|se[çc][ãa]o|item\s+\d+)/i.test(txt)) {
            return true;
          }
          if (idx + 1 < allRows.length) {
            const nextRowCells = allRows[idx + 1].querySelectorAll('td, th');
            if (nextRowCells.length >= 2) return true;
          }
        }
        return false;
      };

      const isHeaderRow = (r: HTMLElement): boolean => {
        const cells = Array.from(r.querySelectorAll('td, th'));
        if (cells.length < 2) return false;
        const txt = limparEspacos(extrairTextoComEspacos(r)).toLowerCase();
        return /(?:item|descri|especif|unidade|medida|requisi|quantidade|total|valor|pre[çc]o|c[óo]digo|nome|marca|modelo)/i.test(txt);
      };

      const segments: SubTableSegment[] = [];
      let pendingBanner: string | undefined = undefined;
      let activeSegment: SubTableSegment | null = null;

      allRows.forEach((r, idx) => {
        if (isBannerRow(r, idx)) {
          pendingBanner = limparEspacos(extrairTextoComEspacos(r));
          activeSegment = null;
        } else if (!activeSegment || isHeaderRow(r)) {
          const cells = Array.from(r.querySelectorAll('td, th')) as HTMLElement[];
          activeSegment = {
            bannerTitle: pendingBanner,
            headerCells: cells,
            dataRows: [],
          };
          segments.push(activeSegment);
          pendingBanner = undefined;
        } else {
          activeSegment.dataRows.push(r as HTMLElement);
        }
      });

      // Se nenhum segmento foi formado (ex: tabela sem estrutura clara), cria um segmento com a primeira linha como cabeçalho
      if (segments.length === 0 && allRows.length > 0) {
        segments.push({
          bannerTitle: pendingBanner,
          headerCells: Array.from(allRows[0].querySelectorAll('td, th')) as HTMLElement[],
          dataRows: allRows.slice(1) as HTMLElement[],
        });
      }

      // Processa cada sub-tabela identificada
      segments.forEach(segment => {
        tableIndex++;

        const headerCells = segment.headerCells;
        const colLabels = headerCells.map((c, cIdx) => {
          const txt = limparEspacos(extrairTextoComEspacos(c));
          return txt || `Coluna ${cIdx + 1}`;
        });

        const bannerTitle = segment.bannerTitle ? segment.bannerTitle.trim() : '';

        // Se havia uma linha de cabeçalho unificada (banner), emite um parágrafo em negrito antes da tabela usando a tag <b>
        if (bannerTitle) {
          conteudoXml += `${indent}<p><b>${escapeXml(bannerTitle)}</b></p>\n`;
        }

        // Determina rótulo e ID base da tabela com base no contexto (Banner, parágrafo anterior ou colunas)
        let tableRotulo = '';
        let baseTableId = '';

        if (bannerTitle) {
          tableRotulo = bannerTitle.replace(/[:.\s]+$/, '').trim();
          baseTableId = bannerTitle;
        } else if (lastContextLabel && lastContextLabel.length < 60) {
          tableRotulo = lastContextLabel;
          baseTableId = lastContextLabel;
        } else {
          const col1Raw = colLabels[0] || '';
          const col2Raw = colLabels[1] || '';
          if (col1Raw && col2Raw) {
            baseTableId = `${col1Raw}_${col2Raw}`;
            tableRotulo = `${col1Raw} / ${col2Raw}`;
          } else if (col1Raw) {
            baseTableId = col1Raw;
            tableRotulo = col1Raw;
          } else {
            baseTableId = `tabela_${tableIndex}`;
            tableRotulo = `Tabela ${tableIndex}`;
          }
        }

        let tableId = normalizarIdentificadorValido(baseTableId, `tabela_${tableIndex}`);
        if (tabelaIdsUsados.has(tableId)) {
          let suffix = 2;
          while (tabelaIdsUsados.has(`${tableId}_${suffix}`)) {
            suffix++;
          }
          tableId = `${tableId}_${suffix}`;
          tableRotulo = `${tableRotulo} (${suffix})`;
        }
        tabelaIdsUsados.add(tableId);

        const colIds: string[] = [];
        const colIdsSet = new Set<string>();
        colLabels.forEach((label, cIdx) => {
          let cId = normalizarIdentificadorValido(label, `coluna_${cIdx + 1}`);
          if (colIdsSet.has(cId)) {
            let sfx = 2;
            while (colIdsSet.has(`${cId}_${sfx}`)) {
              sfx++;
            }
            cId = `${cId}_${sfx}`;
          }
          colIdsSet.add(cId);
          colIds.push(cId);
        });

        let formTabelaXml = `    <tabela id="${tableId}" rotulo="${escapeXml(tableRotulo)}">\n`;
        colLabels.forEach((label, cIdx) => {
          const cId = colIds[cIdx];
          let tipo = 'texto';
          const lblLower = label.toLowerCase();
          if (lblLower.includes('cep')) tipo = 'cep';
          else if (lblLower.includes('email') || lblLower.includes('e-mail')) tipo = 'texto';
          else if (lblLower.includes('cpf')) tipo = 'cpf';
          else if (lblLower.includes('cnpj')) tipo = 'cnpj';
          else if (lblLower.includes('data') || lblLower.includes('prazo')) tipo = 'date';
          else if (lblLower.includes('valor') || lblLower.includes('preço') || lblLower.includes('preco') || lblLower.includes('total') || lblLower.includes('unitario') || lblLower.includes('unitário')) tipo = 'moeda';
          else if (lblLower.includes('quantidade') || lblLower.includes('qtd') || lblLower.includes('quant.') || lblLower.includes('requisi')) tipo = 'number';
          else if (lblLower.includes('telefone') || lblLower.includes('celular') || lblLower.includes('tel')) tipo = 'telefone';

          formTabelaXml += `      <coluna id="${cId}" rotulo="${escapeXml(label)}" tipo="${tipo}" />\n`;
        });
        formTabelaXml += `    </tabela>`;
        formulariosXml.push(formTabelaXml);

        const rowsJson: Record<string, any>[] = [];
        segment.dataRows.forEach(tr => {
          const cells = Array.from(tr.querySelectorAll('td, th')) as HTMLElement[];
          const rowObj: Record<string, any> = {};
          let hasAnyData = false;
          colIds.forEach((cId, cIdx) => {
            const cellEl = cells[cIdx];
            if (cellEl) {
              const rawText = limparEspacos(extrairTextoComEspacos(cellEl))
                .replace(/\{\{\s*([^}|]+?)(?:\|[^}]+?)?\s*\}\}/g, '$1');
              rowObj[cId] = rawText;
              if (rawText && rawText !== '...' && rawText !== '…') {
                hasAnyData = true;
              }
            } else {
              rowObj[cId] = '';
            }
          });
          if (hasAnyData || segment.dataRows.length <= 3) {
            rowsJson.push(rowObj);
          }
        });

        if (rowsJson.length === 0) {
          const initialEmptyRow: Record<string, any> = {};
          colIds.forEach(cId => { initialEmptyRow[cId] = ''; });
          rowsJson.push(initialEmptyRow);
        }

        jsonInicial[tableId] = rowsJson;

        conteudoXml += `${indent}<tabela borda="true">\n`;
        conteudoXml += `${indent}  <cabecalho>\n`;
        conteudoXml += `${indent}    <linha>\n`;
        colLabels.forEach(label => {
          conteudoXml += `${indent}      <coluna>${escapeXml(label)}</coluna>\n`;
        });
        conteudoXml += `${indent}    </linha>\n`;
        conteudoXml += `${indent}  </cabecalho>\n`;
        conteudoXml += `${indent}  <foreach lista="${tableId}" var="item">\n`;
        conteudoXml += `${indent}    <linha>\n`;
        colIds.forEach(cId => {
          conteudoXml += `${indent}      <coluna>{{item.${cId}}}</coluna>\n`;
        });
        conteudoXml += `${indent}    </linha>\n`;
        conteudoXml += `${indent}  </foreach>\n`;
        conteudoXml += `${indent}</tabela>\n`;
      });

      lastContextLabel = '';
    }
  }

  closeAllSections();
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<documento>\n  <!-- Convertido de ${escapeXml(nomeArquivo)} -->\n`;
  xml += `  <formulario>\n`;
  
  if (camposExtraidos.size > 0) {
    xml += `    <grupo titulo="Campos Identificados">\n`;
    camposExtraidos.forEach(field => {
        let attrStr = Object.entries(field.attrs).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(' ');
        if (field.options && field.options.length > 0) {
            xml += `      <${field.tag} id="${field.id}" ${attrStr}>\n`;
            field.options.forEach(opt => {
                xml += `        <option>${escapeXml(opt)}</option>\n`;
            });
            xml += `      </${field.tag}>\n`;
        } else {
            xml += `      <${field.tag} id="${field.id}" ${attrStr} />\n`;
        }
    });
    xml += `    </grupo>\n`;
  }

  tabelasExtraidas.forEach((fields, listId) => {
    let formTabelaXml = `    <tabela id="${listId}" rotulo="${escapeXml(listId.replace(/_/g, ' '))}">\n`;
    fields.forEach(field => {
        let attrStr = Object.entries(field.attrs).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(' ');
        formTabelaXml += `      <coluna id="${field.id}" ${attrStr} />\n`;
    });
    formTabelaXml += `    </tabela>`;
    formulariosXml.push(formTabelaXml);
  });

  if (formulariosXml.length > 0) {
    xml += `    <grupo titulo="Tabelas do Documento">\n`;
    xml += formulariosXml.join('\n') + '\n';
    xml += `    </grupo>\n`;
  }
  
  xml += `  </formulario>\n\n`;
  
  xml += `  <conteudo>\n`;
  xml += conteudoXml;
  xml += `  </conteudo>\n</documento>`;
  
  return { xml, jsonInicial };
}
