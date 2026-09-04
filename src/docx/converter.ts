import mammoth from 'mammoth';
import JSZip from 'jszip';

import {
  extrairEstilosDoDocx,
  extrairNumeracaoDoDocx,
  extrairEstruturaParagrafosDocx,
  detectarReiniciosDeNumeracao,
  extrairComentariosDoZip,
  gerarXmlDeComentarios,
} from './word';
import { transformarHtmlParaEstruturaXml } from './htmlToXml';
import type { DocxStyleInfo, NumberingLevelInfo } from './types';

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
  
  // Extrai reinícios manuais de numeração do Word
  const { reiniciaNumIds } = zip ? await detectarReiniciosDeNumeracao(zip) : { reiniciaNumIds: new Set<string>() };

  // 4. Extração da estrutura de parágrafos nativos do Word (word/document.xml)
  const docxParagraphs = zip ? await extrairEstruturaParagrafosDocx(zip, stylesMap, numberingMap, reiniciaNumIds) : [];

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
