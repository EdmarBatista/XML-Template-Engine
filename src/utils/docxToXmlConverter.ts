import mammoth from 'mammoth';
import JSZip from 'jszip';
import { ColumnType, ListType } from '../types';
import { decodificarEntidadesXml } from './expressionEvaluator';

interface ExtractedComment {
  id: string;
  texto: string;
  trecho: string;
}

interface DocxStyleInfo {
  styleId: string;
  name: string;
  outlineLvl?: number; // 0 for Level 1, 1 for Level 2, etc.
  isHeading: boolean;
  isSubtitle?: boolean;
  level?: number;
  paragraphLevel?: number;
  numId?: string;
  ilvl?: number;
}

interface NumberingLevelInfo {
  numFmt: string;
  lvlText: string;
  outlineLvl?: number;
  isBullet: boolean;
}

interface DocxParagraphInfo {
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
}

function getXmlParser(): DOMParser {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser();
  }
  try {
    // Fallback para ambiente de testes/node
    const { JSDOM } = require('jsdom');
    return new (new JSDOM().window.DOMParser)();
  } catch {
    throw new Error('DOMParser is not available');
  }
}

function parseHtmlDoc(html: string): Document {
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }
  try {
    const { JSDOM } = require('jsdom');
    return new JSDOM(html).window.document;
  } catch {
    throw new Error('DOMParser / JSDOM is not available');
  }
}

export async function converterDocxParaModeloXml(file: File): Promise<{ xml: string; jsonInicial: Record<string, any>; comentariosXml: string; nomeSugerido: string }> {
  const arrayBuffer = await file.arrayBuffer();

  let zip: JSZip | null = null;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (err) {
    console.warn("Não foi possível abrir o arquivo docx como zip:", err);
  }

  // 1. Extração dos comentários nativos usando JSZip
  const comentarios = zip ? await extrairComentariosDoZip(zip) : [];
  const comentariosXml = gerarXmlDeComentarios(comentarios);

  // 2. Extração dos estilos e níveis nativos de título / outline do Word
  const stylesMap = zip ? await extrairEstilosDoDocx(zip) : new Map<string, DocxStyleInfo>();

  // 3. Extração da numeração automática e listas do Word (word/numbering.xml)
  const numberingMap = zip ? await extrairNumeracaoDoDocx(zip) : new Map<string, Map<number, NumberingLevelInfo>>();

  // 4. Extração da estrutura de parágrafos nativos do Word (word/document.xml)
  const docxParagraphs = zip ? await extrairEstruturaParagrafosDocx(zip, stylesMap, numberingMap) : [];

  // 5. Montagem do mapa de estilos dinâmico para o Mammoth
  // NOTA: O Mammoth suporta APENAS a sintaxe p[style-name='Nome'] com aspas simples.
  const dynamicStyleMap: string[] = [
    "p[style-name='Heading 1'] => h1:fresh",
    "p[style-name='Heading 2'] => h2:fresh",
    "p[style-name='Heading 3'] => h3:fresh",
    "p[style-name='Heading 4'] => h4:fresh",
    "p[style-name='Heading 5'] => h5:fresh",
    "p[style-name='Heading 6'] => h6:fresh",
    "p[style-name='heading 1'] => h1:fresh",
    "p[style-name='heading 2'] => h2:fresh",
    "p[style-name='heading 3'] => h3:fresh",
    "p[style-name='heading 4'] => h4:fresh",
    "p[style-name='heading 5'] => h5:fresh",
    "p[style-name='heading 6'] => h6:fresh",
    "p[style-name='Título 1'] => h1:fresh",
    "p[style-name='Título 2'] => h2:fresh",
    "p[style-name='Título 3'] => h3:fresh",
    "p[style-name='Título 4'] => h4:fresh",
    "p[style-name='Título 5'] => h5:fresh",
    "p[style-name='Título 6'] => h6:fresh",
    "p[style-name='Titulo 1'] => h1:fresh",
    "p[style-name='Titulo 2'] => h2:fresh",
    "p[style-name='Titulo 3'] => h3:fresh",
    "p[style-name='Titulo 4'] => h4:fresh",
    "p[style-name='Titulo 5'] => h5:fresh",
    "p[style-name='Titulo 6'] => h6:fresh",
    "p[style-name='Ttulo1'] => h1:fresh",
    "p[style-name='Ttulo2'] => h2:fresh",
    "p[style-name='Ttulo3'] => h3:fresh",
    "p[style-name='Ttulo4'] => h4:fresh",
    "p[style-name='Ttulo6'] => h6:fresh",
    "p[style-name='TÍTULO 1'] => h1:fresh",
    "p[style-name='TÍTULO 2'] => h2:fresh",
    "p[style-name='TÍTULO 3'] => h3:fresh",
    "p[style-name='TITULO 1'] => h1:fresh",
    "p[style-name='TITULO 2'] => h2:fresh",
    "p[style-name='TITULO 3'] => h3:fresh",
    "p[style-name='Title'] => h1:fresh",
    "p[style-name='Subtitle'] => h2:fresh",
    "p[style-name='Título'] => h1:fresh",
    "p[style-name='Titulo'] => h1:fresh",
    "p[style-name='Subtítulo'] => h2:fresh",
    "p[style-name='Subtitulo'] => h2:fresh",
    "p[style-name='Heading'] => h2:fresh",
    "p[style-name='Secao'] => h2:fresh",
    "p[style-name='Seção'] => h2:fresh",
    "p[style-name='Clausula'] => h2:fresh",
    "p[style-name='Cláusula'] => h2:fresh",
    "p[style-name='Artigo'] => h2:fresh",
    "b => b",
    "i => i",
    "u => u"
  ];

  // Adiciona estilos encontrados no arquivo DOCX (apenas estilos de cabeçalho reais, preservando estilos de corpo)
  for (const style of Array.from(stylesMap.values())) {
    if (style.level && style.level >= 1 && style.level <= 6) {
      const isBodyStyle = /opcional|corpo|normal|char/i.test(style.name || '') || /opcional|corpo|normal|char/i.test(style.styleId);
      if (!isBodyStyle) {
        if (style.name) {
          const safeName = style.name.replace(/'/g, "\\'");
          dynamicStyleMap.push(`p[style-name='${safeName}'] => h${style.level}:fresh`);
        }
        if (style.styleId && style.styleId !== style.name) {
          const safeId = style.styleId.replace(/'/g, "\\'");
          dynamicStyleMap.push(`p[style-name='${safeId}'] => h${style.level}:fresh`);
        }
      }
    }
  }

  // 6. Extração do conteúdo usando mammoth com o styleMap dinâmico
  const mammothInput: any = { arrayBuffer };
  if (typeof Buffer !== 'undefined') {
    mammothInput.buffer = Buffer.from(arrayBuffer);
  }

  const result = await mammoth.convertToHtml(
    mammothInput,
    {
      styleMap: dynamicStyleMap,
      includeDefaultStyleMap: true,
      ignoreEmptyParagraphs: false,
    }
  );

  const html = result.value;

  // 7. Transforma o HTML na sintaxe XML do sistema + gera JSON de preenchimento inicial
  let { xml, jsonInicial } = transformarHtmlParaEstruturaXml(html, file.name, docxParagraphs);

  if (comentariosXml) {
    xml = xml.replace('</documento>', '\n' + comentariosXml + '\n</documento>');
  }

  return {
    xml,
    jsonInicial,
    comentariosXml,
    nomeSugerido: file.name.replace(/\.docx$/i, '.xml'),
  };
}

async function extrairEstilosDoDocx(zip: JSZip): Promise<Map<string, DocxStyleInfo>> {
  const stylesMap = new Map<string, DocxStyleInfo>();
  try {
    const stylesFile = zip.file("word/styles.xml");
    if (!stylesFile) return stylesMap;

    const stylesText = await stylesFile.async("string");
    const parser = getXmlParser();
    const stylesDoc = parser.parseFromString(stylesText, "text/xml");

    const styleNodes = stylesDoc.getElementsByTagName("w:style");
    const rawStyles = new Map<string, {
      styleId: string;
      name: string;
      basedOn?: string;
      outlineLvl?: string | null;
      ilvl?: string | null;
      numId?: string;
    }>();

    for (let i = 0; i < styleNodes.length; i++) {
      const styleEl = styleNodes[i];
      const type = styleEl.getAttribute("w:type");
      if (type && type !== "paragraph") continue;

      const styleId = styleEl.getAttribute("w:styleId") || "";
      const nameEl = styleEl.getElementsByTagName("w:name")[0];
      const name = nameEl?.getAttribute("w:val") || styleId;
      const basedOnEl = styleEl.getElementsByTagName("w:basedOn")[0];
      const basedOn = basedOnEl?.getAttribute("w:val");

      const outlineLvlEl = styleEl.getElementsByTagName("w:outlineLvl")[0];
      const outlineLvl = outlineLvlEl ? outlineLvlEl.getAttribute("w:val") : null;

      const numPr = styleEl.getElementsByTagName("w:numPr")[0];
      const numId = numPr?.getElementsByTagName("w:numId")[0]?.getAttribute("w:val") || styleEl.getElementsByTagName("w:numId")[0]?.getAttribute("w:val");
      const ilvlStr = numPr?.getElementsByTagName("w:ilvl")[0]?.getAttribute("w:val") || styleEl.getElementsByTagName("w:ilvl")[0]?.getAttribute("w:val");
      const ilvl = ilvlStr !== undefined && ilvlStr !== null ? parseInt(ilvlStr, 10) : undefined;

      rawStyles.set(styleId, { styleId, name, basedOn, outlineLvl, ilvl: ilvlStr, numId });
    }

    for (const [styleId, s] of Array.from(rawStyles.entries())) {
      const name = s.name || styleId;
      let isHeading = false;
      let isSubtitle = false;
      let level: number | undefined = undefined;
      let paragraphLevel: number | undefined = undefined;
      const numId = s.numId;
      const ilvl = s.ilvl !== undefined && s.ilvl !== null ? parseInt(s.ilvl, 10) : undefined;

      // 1. Subtítulos não numerados (Nvel1-SemNum, Nvel1-SemNumerao, Nvel1-SemBlack, Subtítulo, etc.)
      if (/semnum|semblack|sem\s*num/i.test(styleId) || /semnum|semblack|sem\s*num/i.test(name) || /^subtitle$|^subt[íi]tulo$|^subtitulo$/i.test(name) || /^subtitle$|^subtitulo$/i.test(styleId)) {
        isSubtitle = true;
      } else {
        // Tenta detectar nível em estilos do tipo Nivel 01, Nível 2, Nvel02, Nvel3-R, Nivel4, Nivel5..Nivel8, heading 1..8, Título 1..8
        const matchNivel = (name + " " + styleId).match(/(?:n[ií]vel|nvel|heading|t[íi]tulo|ttulo|item_?n[ií]vel_?)\s*0?(\d+)/i);
        if (matchNivel) {
          const parsedLvl = parseInt(matchNivel[1], 10);
          if (parsedLvl === 1) {
            isHeading = true;
            level = 1;
          } else if (parsedLvl >= 2) {
            paragraphLevel = parsedLvl;
          }
        } else if (s.outlineLvl !== null && s.outlineLvl !== undefined) {
          const outLvl = parseInt(s.outlineLvl, 10);
          if (outLvl === 0) {
            isHeading = true;
            level = 1;
          } else if (outLvl >= 1) {
            paragraphLevel = outLvl + 1;
          }
        }
      }

      const info: DocxStyleInfo = {
        styleId,
        name: s.name,
        outlineLvl: level !== undefined ? level - 1 : undefined,
        isHeading,
        isSubtitle,
        level,
        paragraphLevel,
        numId,
        ilvl,
      };

      stylesMap.set(styleId, info);
      if (s.name && s.name !== styleId) {
        stylesMap.set(s.name.toLowerCase(), info);
      }
    }
  } catch (e) {
    console.warn("Erro ao processar word/styles.xml:", e);
  }

  return stylesMap;
}

async function extrairNumeracaoDoDocx(zip: JSZip): Promise<Map<string, Map<number, NumberingLevelInfo>>> {
  const numberingMap = new Map<string, Map<number, NumberingLevelInfo>>();
  try {
    const numberingFile = zip.file("word/numbering.xml");
    if (!numberingFile) return numberingMap;

    const numberingText = await numberingFile.async("string");
    const parser = getXmlParser();
    const numberingDoc = parser.parseFromString(numberingText, "text/xml");

    // 1. Mapeia abstractNumId -> Map<ilvl, NumberingLevelInfo>
    const abstractMap = new Map<string, Map<number, NumberingLevelInfo>>();
    const abstractNodes = numberingDoc.getElementsByTagName("w:abstractNum");
    for (let i = 0; i < abstractNodes.length; i++) {
      const absEl = abstractNodes[i];
      const absId = absEl.getAttribute("w:abstractNumId") || "";
      if (!absId) continue;

      const levelMap = new Map<number, NumberingLevelInfo>();
      const lvlNodes = absEl.getElementsByTagName("w:lvl");
      for (let j = 0; j < lvlNodes.length; j++) {
        const lvlEl = lvlNodes[j];
        const ilvlStr = lvlEl.getAttribute("w:ilvl") || "0";
        const ilvl = parseInt(ilvlStr, 10);

        const numFmt = lvlEl.getElementsByTagName("w:numFmt")[0]?.getAttribute("w:val") || "decimal";
        const lvlText = lvlEl.getElementsByTagName("w:lvlText")[0]?.getAttribute("w:val") || "";
        const outlineLvlEl = lvlEl.getElementsByTagName("w:outlineLvl")[0];
        const outlineLvl = outlineLvlEl ? parseInt(outlineLvlEl.getAttribute("w:val") || "0", 10) : undefined;

        const isBullet = numFmt === "bullet" || /[\uF0B7\u2022\u25AA\u25CF\-]/.test(lvlText);

        levelMap.set(ilvl, {
          numFmt,
          lvlText,
          outlineLvl,
          isBullet,
        });
      }
      abstractMap.set(absId, levelMap);
    }

    // 2. Mapeia numId -> abstractNumId
    const numNodes = numberingDoc.getElementsByTagName("w:num");
    for (let i = 0; i < numNodes.length; i++) {
      const numEl = numNodes[i];
      const numId = numEl.getAttribute("w:numId") || "";
      const absRefEl = numEl.getElementsByTagName("w:abstractNumId")[0];
      const absId = absRefEl?.getAttribute("w:val") || "";

      if (numId && absId && abstractMap.has(absId)) {
        numberingMap.set(numId, abstractMap.get(absId)!);
      }
    }
  } catch (e) {
    console.warn("Erro ao processar word/numbering.xml:", e);
  }

  return numberingMap;
}

async function extrairEstruturaParagrafosDocx(
  zip: JSZip,
  stylesMap: Map<string, DocxStyleInfo>,
  numberingMap: Map<string, Map<number, NumberingLevelInfo>>
): Promise<DocxParagraphInfo[]> {
  const paragraphs: DocxParagraphInfo[] = [];
  try {
    const documentFile = zip.file("word/document.xml");
    if (!documentFile) return paragraphs;

    const documentText = await documentFile.async("string");
    const parser = getXmlParser();
    const documentDoc = parser.parseFromString(documentText, "text/xml");

    const pNodes = documentDoc.getElementsByTagName("w:p");
    for (let i = 0; i < pNodes.length; i++) {
      const pEl = pNodes[i];

      // Extrai o texto do parágrafo
      const tNodes = pEl.getElementsByTagName("w:t");
      const rawTextParts: string[] = [];
      for (let t = 0; t < tNodes.length; t++) {
        rawTextParts.push(tNodes[t].textContent || "");
      }
      const text = rawTextParts.join("");
      const normalizedText = limparEspacos(text);

      // Inspeciona propriedades do parágrafo (<w:pPr>)
      const pPr = pEl.getElementsByTagName("w:pPr")[0];
      let level: number | undefined;
      let isHeading = false;
      let isSubtitle = false;
      let paragraphLevel: number | undefined;
      let isAutomaticNumbered = false;
      let numId: string | undefined;
      let ilvl: number | undefined;
      let styleId: string | undefined;
      let styleName: string | undefined;

      if (pPr) {
        // 1. Nível e classificação baseados no estilo do parágrafo (<w:pStyle w:val="styleId"/>)
        const pStyleEl = pPr.getElementsByTagName("w:pStyle")[0];
        styleId = pStyleEl?.getAttribute("w:val") || undefined;
        if (styleId) {
          const styleInfo = stylesMap.get(styleId) || stylesMap.get(styleId.toLowerCase());
          if (styleInfo) {
            styleName = styleInfo.name;
            if (styleInfo.isSubtitle) isSubtitle = true;
            if (styleInfo.isHeading) {
              isHeading = true;
              level = styleInfo.level;
            }
            if (styleInfo.paragraphLevel) {
              paragraphLevel = styleInfo.paragraphLevel;
              isAutomaticNumbered = true;
            }
            if (!numId && styleInfo.numId) {
              numId = styleInfo.numId;
              ilvl = styleInfo.ilvl;
            }
          }
        }

        // Se o estilo tiver 'SemNum' ou 'SemBlack', garante isSubtitle
        if (styleId && (/semnum|semblack/i.test(styleId) || (styleName && /semnum|semblack/i.test(styleName)))) {
          isSubtitle = true;
          isHeading = false;
          level = undefined;
          isAutomaticNumbered = false;
        }

        // 2. Outline level explícito no parágrafo (<w:outlineLvl w:val="N"/>) se não for subtítulo
        if (!isSubtitle) {
          const directOutlineLvlEl = pPr.getElementsByTagName("w:outlineLvl")[0];
          if (directOutlineLvlEl) {
            const val = directOutlineLvlEl.getAttribute("w:val");
            if (val !== null && val !== undefined) {
              const outLvl = parseInt(val, 10);
              if (outLvl === 0) {
                isHeading = true;
                level = 1;
              } else if (outLvl >= 1) {
                paragraphLevel = Math.min(8, outLvl + 1);
                isAutomaticNumbered = true;
              }
            }
          }
        }

        // 3. Numeração automática do Word (<w:numPr> ou herdado do estilo)
        let numFmt: string | undefined;
        let lvlText: string | undefined;
        let isBullet = false;
        let isListParagraph = false;

        const numPr = pPr.getElementsByTagName("w:numPr")[0];
        if (numPr && !isSubtitle) {
          const numIdEl = numPr.getElementsByTagName("w:numId")[0];
          const ilvlEl = numPr.getElementsByTagName("w:ilvl")[0];

          numId = numIdEl?.getAttribute("w:val") || numId;
          const ilvlVal = ilvlEl?.getAttribute("w:val");
          if (ilvlVal !== undefined && ilvlVal !== null) {
            ilvl = parseInt(ilvlVal, 10);
          } else if (ilvl === undefined) {
            ilvl = 0;
          }
        }

        if (numId === "0") {
          isAutomaticNumbered = false;
          if (isHeading) {
            isSubtitle = true;
            isHeading = false;
            level = undefined;
          }
        } else if (numId && !isSubtitle) {
          if (ilvl === undefined) ilvl = 0;
          const numDef = numberingMap.get(numId);
          const lvlDef = numDef?.get(ilvl);

          if (lvlDef) {
            numFmt = lvlDef.numFmt;
            lvlText = lvlDef.lvlText;
            isBullet = lvlDef.isBullet;

            const isExplicitListStyle = styleId
              ? /list|lista|pargrafodalista/i.test(styleId) || (styleName ? /list|lista/i.test(styleName) : false)
              : false;
            const isNonDecimalNumbering =
              numFmt === "upperRoman" ||
              numFmt === "lowerRoman" ||
              numFmt === "lowerLetter" ||
              numFmt === "upperLetter" ||
              isBullet;

            if (isExplicitListStyle || isNonDecimalNumbering) {
              isListParagraph = true;
              isAutomaticNumbered = false;
            } else if (!lvlDef.isBullet) {
              isAutomaticNumbered = true;
              if (!paragraphLevel && !isHeading) {
                paragraphLevel = Math.min(8, ilvl + 2);
              }
            }
          } else {
            isAutomaticNumbered = true;
            if (!paragraphLevel && !isHeading) {
              paragraphLevel = Math.min(8, ilvl + 2);
            }
          }
        }

        paragraphs.push({
          index: i,
          text,
          normalizedText,
          level,
          isHeading,
          isSubtitle,
          paragraphLevel,
          isAutomaticNumbered,
          numId,
          ilvl,
          styleId,
          styleName,
          numFmt,
          lvlText,
          isBullet,
          isListParagraph,
        });
      } else {
        paragraphs.push({
          index: i,
          text,
          normalizedText,
          level,
          isHeading,
          isSubtitle,
          paragraphLevel,
          isAutomaticNumbered,
          numId,
          ilvl,
          styleId,
          styleName,
        });
      }
    }
  } catch (e) {
    console.warn("Erro ao processar word/document.xml:", e);
  }

  return paragraphs;
}

async function extrairComentariosDoZip(zip: JSZip): Promise<ExtractedComment[]> {
  try {
    const commentsFile = zip.file("word/comments.xml");
    const documentFile = zip.file("word/document.xml");
    
    if (!commentsFile || !documentFile) {
      return [];
    }

    const commentsText = await commentsFile.async("string");
    const documentText = await documentFile.async("string");

    const parser = getXmlParser();
    const commentsDoc = parser.parseFromString(commentsText, "text/xml");

    const commentNodes = commentsDoc.getElementsByTagName("w:comment");
    const commentMap = new Map<string, string>();

    for (let i = 0; i < commentNodes.length; i++) {
      const node = commentNodes[i];
      const id = node.getAttribute("w:id");
      if (id) {
        const texts = Array.from(node.getElementsByTagName("w:t")).map(t => t.textContent || "");
        commentMap.set(id, texts.join(""));
      }
    }

    const results: ExtractedComment[] = [];
    
    for (const [id, texto] of Array.from(commentMap.entries())) {
      const startTag = `<w:commentRangeStart w:id="${id}"`;
      const endTag = `<w:commentRangeEnd w:id="${id}"`;
      
      const startIndex = documentText.indexOf(startTag);
      const endIndex = documentText.indexOf(endTag);
      
      let trecho = "";
      if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
        const slice = documentText.substring(startIndex, endIndex);
        const tempDoc = parser.parseFromString(`<root>${slice}</root>`, "text/xml");
        const tNodes = tempDoc.getElementsByTagName("w:t");
        const texts = Array.from(tNodes).map(t => t.textContent || "");
        trecho = texts.join("");
      }

      if (trecho && texto) {
        results.push({
          id: `c${id}`,
          texto: texto.trim(),
          trecho: trecho.trim(),
        });
      }
    }

    return results;
  } catch (e) {
    console.error("Erro ao extrair comentários do docx:", e);
    return [];
  }
}

function gerarXmlDeComentarios(comentarios: ExtractedComment[]): string {
  if (comentarios.length === 0) return "";
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<comentarios versao="1.0">\n`;
  comentarios.forEach(c => {
    xml += `  <comentario id="${c.id}">\n`;
    xml += `    <trecho>${escapeXml(c.trecho)}</trecho>\n`;
    xml += `    <texto>${escapeXml(c.texto)}</texto>\n`;
    xml += `  </comentario>\n`;
  });
  xml += `</comentarios>`;
  
  return xml;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/**
 * Extrai texto de um nó DOM respeitando espaços e quebras de linha entre elementos de bloco (p, br, div, td, th, etc.).
 * Evita a concatenação indesejada de palavras quando uma célula contém múltiplos parágrafos ou <br/> (ex: UNIDADE\nDE\nMEDIDA).
 */
function extrairTextoComEspacos(node: Node | null): string {
  if (!node) return '';
  if (node.nodeType === TEXT_NODE) {
    return node.textContent || '';
  }
  if (node.nodeType === ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tag = el.nodeName.toLowerCase();
    if (tag === 'br') return ' ';
    const isBlock = ['p', 'div', 'tr', 'td', 'th', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag);
    const childTexts: string[] = [];
    for (let i = 0; i < el.childNodes.length; i++) {
      childTexts.push(extrairTextoComEspacos(el.childNodes[i]));
    }
    const joined = childTexts.join('');
    return isBlock ? ` ${joined} ` : joined;
  }
  return '';
}

function limparEspacos(texto: string): string {
  return (texto || '').replace(/\s+/g, ' ').trim();
}

/**
 * Normaliza um texto para um identificador válido (apenas a-z, 0-9 e sublinhados, sem começar com número)
 */
function normalizarIdentificadorValido(texto: string, fallbackPadrao: string): string {
  if (!texto) return fallbackPadrao;

  // 1. Remove acentuação e caracteres diacríticos
  let norm = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  // 2. Substitui caracteres não alfanuméricos por sublinhados
  norm = norm.replace(/[^a-z0-9_]+/g, '_');

  // 3. Remove sublinhados repetidos e das pontas
  norm = norm.replace(/^_+|_+$/g, '');

  // 4. Garante que não comece com dígito
  if (/^[0-9]/.test(norm)) {
    norm = `item_${norm}`;
  }

  // 5. Validação final: se ficou vazio ou inválido, usa o fallback seguro
  if (!norm || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(norm)) {
    return fallbackPadrao;
  }

  return norm;
}

type FormFieldDef = {
  id: string;
  tag: string;
  attrs: Record<string, string>;
  options?: string[];
};

function coletarItensDeLista(rootEl: HTMLElement): Array<{
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

function transformarHtmlParaEstruturaXml(
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

  const sectionStack: { level: number }[] = [];

  const closeSectionsDownTo = (targetLevel: number) => {
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

        const indent = '  '.repeat(sectionStack.length + 2);
        conteudoXml += `${indent}<secao titulo="${tituloLimpo}"${numerarAttr}>\n`;
        sectionStack.push({ level: headingInfo.level });
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
            }
          }

          if (foundDocxP?.isSubtitle) {
            conteudoXml += `${indent}<subtitulo alinhamento="esquerda">${content}</subtitulo>\n`;
          } else {
            let nivelAttr = '';
            if (foundDocxP?.paragraphLevel && foundDocxP.paragraphLevel >= 2) {
              const pLvl = Math.min(8, foundDocxP.paragraphLevel);
              nivelAttr = ` nivel="${pLvl}"`;
            } else if (foundDocxP?.level && foundDocxP.level >= 2) {
              const pLvl = Math.min(8, foundDocxP.level);
              nivelAttr = ` nivel="${pLvl}"`;
            }
            conteudoXml += `${indent}<p${nivelAttr}>${content}</p>\n`;
          }
        }
      }
    } else if (tag === 'hr') {
      conteudoXml += `${indent}<hr />\n`;
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
          const isAutoNum = (liHeadingInfo && liHeadingInfo.isAutomaticNumbered) || (it.foundDocxP && it.foundDocxP.isAutomaticNumbered);
          const numerarAttr = (hasManualNumbering && !isAutoNum) ? ' numerar="false"' : ' numerar="true"';

          const indentSec = '  '.repeat(sectionStack.length + 2);
          conteudoXml += `${indentSec}<secao titulo="${tituloLimpo}"${numerarAttr}>\n`;
          sectionStack.push({ level: lvl });
          nonHeadingSeen = true;
        } else if (it.foundDocxP?.isSubtitle) {
          flushListBuffer();
          const content = serializeInner(it.li).trim();
          if (content) {
            conteudoXml += `${indent}<subtitulo alinhamento="esquerda">${content}</subtitulo>\n`;
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
            const rawNivel = it.foundDocxP.paragraphLevel || it.foundDocxP.level || 2;
            const nivel = Math.min(8, Math.max(2, rawNivel));
            const nivelAttr = ` nivel="${nivel}"`;
            conteudoXml += `${indent}<p${nivelAttr}>${content}</p>\n`;
          }
        } else {
          // É item de lista verdadeiro
          currentListBuffer.push(it);
        }
      }

      flushListBuffer();
    } else if (tag === 'table') {
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
