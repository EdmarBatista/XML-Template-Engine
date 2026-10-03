import JSZip from 'jszip';
import type { ExtractedComment } from './types';
import { escapeXml, getXmlParser } from './domText';

/**
 * Comentários nativos do Word (word/comments.xml + word/document.xml).
 *
 * Este módulo guardava também a extração de estilos, numeração e parágrafos via DOM
 * (extrairEstilosDoDocx, extrairNumeracaoDoDocx, detectarReiniciosDeNumeracao,
 * extrairEstruturaParagrafosDocx). Aquele caminho ficou morto quando a conversão
 * passou a ser nativa em src/docx/{styles,numbering,document}.ts e foi removido.
 * Só os dois helpers abaixo ainda são consumidos, por converter.ts.
 */

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
