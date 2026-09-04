import JSZip from 'jszip';
import type { DocxParagraphInfo, DocxStyleInfo, ExtractedComment, NumberingLevelInfo } from './types';
import { escapeXml, extrairTextoComEspacos, getXmlParser, limparEspacos } from './domText';

export async function extrairEstilosDoDocx(zip: JSZip): Promise<Map<string, DocxStyleInfo>> {
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

    // Resolve herança de estilos baseada em <w:basedOn> (conforme especificação OOXML)
    for (const [id, s] of rawStyles.entries()) {
      let curr = s.basedOn;
      const visited = new Set<string>([id]);
      while (curr && rawStyles.has(curr) && !visited.has(curr)) {
        visited.add(curr);
        const parent = rawStyles.get(curr)!;
        if (s.numId === undefined && parent.numId !== undefined) {
          s.numId = parent.numId;
        }
        if (s.ilvl === undefined && parent.ilvl !== undefined) {
          s.ilvl = parent.ilvl;
        }
        if ((s.outlineLvl === null || s.outlineLvl === undefined) && parent.outlineLvl !== null && parent.outlineLvl !== undefined) {
          s.outlineLvl = parent.outlineLvl;
        }
        curr = parent.basedOn;
      }
    }

    for (const [styleId, s] of Array.from(rawStyles.entries())) {
      const name = s.name || styleId;
      let isHeading = false;
      let isSubtitle = false;
      let level: number | undefined = undefined;
      let paragraphLevel: number | undefined = undefined;
      const numId = s.numId;
      const ilvl = s.ilvl !== undefined && s.ilvl !== null ? parseInt(s.ilvl, 10) : undefined;

      // Se numId for "0", a numeração está explicitamente desativada no Word
      if (numId === "0") {
        isSubtitle = true;
        isHeading = false;
        level = undefined;
        paragraphLevel = undefined;
      } else if (/semnum|semblack|sem\s*num/i.test(styleId) || /semnum|semblack|sem\s*num/i.test(name) || /^subtitle$|^subt[íi]tulo$|^subtitulo$/i.test(name) || /^subtitle$|^subtitulo$/i.test(styleId)) {
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

export async function extrairNumeracaoDoDocx(zip: JSZip): Promise<Map<string, Map<number, NumberingLevelInfo>>> {
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

export interface NumberingOverrideInfo {
  /** numIds cujo parágrafo, ao ser usado naquele ilvl, INICIA (reinicia) a lista */
  reiniciaNumIds: Set<string>;
}

/**
 * Lê word/numbering.xml e detecta, estruturalmente, em quais numIds existe um
 * <w:lvlOverride><w:startOverride/> (qualquer ilvl) — sinal de que um parágrafo
 * que usa esse numId deve REINICIAR a numeração do nível de capítulo (%1.).
 * Não depende de texto — apenas da definição OOXML.
 */
export async function detectarReiniciosDeNumeracao(zip: JSZip): Promise<NumberingOverrideInfo> {
  const reiniciaNumIds = new Set<string>();
  try {
    const numberingFile = zip.file("word/numbering.xml");
    if (!numberingFile) return { reiniciaNumIds };
    const text = await numberingFile.async("string");
    const parser = getXmlParser();
    const doc = parser.parseFromString(text, "text/xml");
    
    const numNodes = doc.getElementsByTagName("w:num");
    for (let i = 0; i < numNodes.length; i++) {
      const numEl = numNodes[i];
      const numId = numEl.getAttribute("w:numId") || "";
      if (!numId) continue;
      
      const lvlOver = numEl.getElementsByTagName("w:lvlOverride");
      let temStartOverride = false;
      for (let j = 0; j < lvlOver.length; j++) {
        if (lvlOver[j].getElementsByTagName("w:startOverride").length > 0) {
          temStartOverride = true;
          break;
        }
      }
      if (temStartOverride) reiniciaNumIds.add(numId);
    }
  } catch (e) {
    console.warn("Erro ao detectar reinícios de numeração:", e);
  }
  return { reiniciaNumIds };
}

export async function extrairEstruturaParagrafosDocx(
  zip: JSZip,
  stylesMap: Map<string, DocxStyleInfo>,
  numberingMap: Map<string, Map<number, NumberingLevelInfo>>,
  reiniciaNumIds?: Set<string>
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
          // Numeração desligada explicitamente (numId="0" no parágrafo ou no estilo herdado).
          // Além de não ser automático, removemos o nível hierárquico/numFmt que poderia vir do
          // estilo-base herdado (ex.: Nvel2-Opcional numId=9), para o render NÃO exibir prefixo
          // X.Y — como no Word. Ex.: parágrafos de assinatura/rodapé ("[Local], [dia]...").
          isAutomaticNumbered = false;
          paragraphLevel = undefined;
          numFmt = undefined;
          lvlText = undefined;
          ilvl = (ilvl === undefined) ? 0 : ilvl;
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
                // No Word, ilvl 0 é nível 1 (%1.), ilvl 1 é nível 2 (%1.%2.), ilvl 2 é nível 3 (%1.%2.%3.).
                // Para itens e parágrafos dentro de seções numeradas, mapeamos para ilvl + 1 (mínimo nível 2).
                paragraphLevel = Math.min(8, Math.max(2, ilvl + 1));
              }
            }
          } else {
            isAutomaticNumbered = true;
            if (!paragraphLevel && !isHeading) {
              paragraphLevel = Math.min(8, Math.max(2, ilvl + 1));
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

  // Pós-processo: número EXIBIDO pelo Word (%) para os parágrafos que são nível de capítulo
  // (nível de numeração %1.). Regra que reproduz o Word SEM ler texto:
  //   - incrementa em ordem para cada cabeçalho numerado;
  //   - quando o parágrafo usa um numId que "reinicia" (startOverride), o cabeçalho passa a valer 1
  //     e a contagem continua a partir daí (reproduz o "reset" de um novo anexo/documento).
  if (paragraphs.length > 0) {
    const tops = paragraphs.filter(
      (p) =>
        p.isHeading === true &&
        p.level === 1 &&
        p.isSubtitle !== true &&
        (p.paragraphLevel === undefined || p.paragraphLevel === 0)
    );
    let corrente = 0;
    for (const top of tops) {
      let val: number;
      if (reiniciaNumIds && reiniciaNumIds.has(top.numId as string)) {
        val = 1; // novo anexo/documento: reinicia a numeração de capítulo
      } else if (corrente === 0) {
        val = 1; // primeiro capítulo -> 1
      } else {
        val = corrente + 1; // continua a numeração
      }
      top.exibido = val;
      corrente = val;
    }
  }

  return paragraphs;
}

export async function extrairComentariosDoZip(zip: JSZip): Promise<ExtractedComment[]> {
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

export function gerarXmlDeComentarios(comentarios: ExtractedComment[]): string {
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
