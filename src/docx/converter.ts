import JSZip from 'jszip';
import { parseStyles } from './styles';
import { parseNumbering } from './numbering';
import { parseDocument } from './document';
import { generateXmlFromAst } from './generator';
import { extrairComentariosDoZip, gerarXmlDeComentarios } from './word';

/**
 * Conversor direto nativo DOCX (OpenXML) → Modelo XML do Sistema.
 *
 * Elimina completamente qualquer etapa intermediária de HTML e a biblioteca Mammoth.
 * Converte diretamente as partes XML do Word (document.xml, styles.xml, numbering.xml, comments.xml)
 * para a AST estruturada e gera o XML final com a hierarquia pura de seções e tags <p> limpas.
 */
export async function converterDocxParaModeloXml(
  file: File
): Promise<{ xml: string; jsonInicial: Record<string, any>; comentariosXml: string; nomeSugerido: string }> {
  const arrayBuffer = await file.arrayBuffer();
  let zip: JSZip | null = null;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (err) {
    console.warn('Não foi possível abrir o arquivo docx como zip:', err);
    throw new Error('Formato DOCX inválido ou arquivo corrompido.');
  }

  // 1. Extração dos comentários nativos usando JSZip (word/comments.xml)
  const comentarios = await extrairComentariosDoZip(zip);
  const comentariosXml = gerarXmlDeComentarios(comentarios);

  // 2. Extração de estilos e heranças (word/styles.xml)
  const stylesMap = await parseStyles(zip);

  // 3. Extração da numeração e níveis (word/numbering.xml)
  const numberingMap = await parseNumbering(zip);

  // 4. Extração e análise estruturada de blocos nativos (word/document.xml)
  const blocks = await parseDocument(zip, stylesMap, numberingMap);

  // 5. Geração direta do XML e do JSON inicial a partir da AST (OpenXML -> XML)
  let { xml, jsonInicial } = generateXmlFromAst(blocks, file.name);

  // 6. Injeção de comentários nativos no documento
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
