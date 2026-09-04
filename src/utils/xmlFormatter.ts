import { sanitizarXmlParaParser } from './xmlParser';

const INLINE_TAGS = new Set([
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'strike',
  'span',
  'a',
  'sub',
  'sup',
  'code',
  'small',
  'mark',
]);

const SELF_CLOSING_TAGS = new Set([
  'input',
  'number',
  'date',
  'textarea',
  'br',
  'hr',
  'coluna',
]);

const CONTAINER_TAGS = new Set([
  'documento',
  'formulario',
  'conteudo',
  'grupo',
  'secao',
  'tabela',
  'linha',
  'cabecalho',
  'lista',
  'lista_numerada',
]);

/**
 * Verifica se um nó possui elementos filhos que são considerados blocos
 * (ou seja, que exigem quebra de linha e indentação hierárquica, como <secao>, <if>, <tabela>, etc.)
 */
function hasBlockChildren(node: Node): boolean {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (child.nodeType === 1) {
      // ELEMENT_NODE
      const tag = (child as Element).tagName.toLowerCase();
      if (!INLINE_TAGS.has(tag)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Serializa nós inline preservando tags como <b>, <i>, <u> sem quebras indesejadas de linha.
 */
function serializeInline(node: Node): string {
  if (node.nodeType === 3) {
    // TEXT_NODE
    return node.textContent || '';
  }
  if (node.nodeType === 8) {
    // COMMENT_NODE
    return `<!--${node.nodeValue}-->`;
  }
  if (node.nodeType === 1) {
    // ELEMENT_NODE
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    let attrs = '';
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      let val = attr.value;
      if (attr.name === 'expr') {
        val = val
          .replace(/&gt;/g, '>')
          .replace(/&lt;/g, '<')
          .replace(/&amp;/g, '&');
      }
      attrs += ` ${attr.name}="${val.replace(/"/g, '&quot;')}"`;
    }
    const inner = Array.from(el.childNodes).map(serializeInline).join('');
    if (!inner && SELF_CLOSING_TAGS.has(tag)) {
      return `<${tag}${attrs} />`;
    }
    return `<${tag}${attrs}>${inner}</${tag}>`;
  }
  return '';
}

/**
 * Formata recursivamente um nó do DOM respeitando a hierarquia de blocos e recuos.
 */
function formatNode(node: Node, indentLevel: number, tab = '    '): string {
  const currentIndent = tab.repeat(indentLevel);
  const nextIndent = tab.repeat(indentLevel + 1);

  if (node.nodeType === 3) {
    // TEXT_NODE
    const text = (node.textContent || '').trim();
    if (!text) return '';
    return `${currentIndent}${text}`;
  }

  if (node.nodeType === 8) {
    // COMMENT_NODE
    const comment = (node.nodeValue || '').trim();
    return `${currentIndent}<!-- ${comment} -->`;
  }

  if (node.nodeType === 1) {
    // ELEMENT_NODE
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    let attrs = '';
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      let val = attr.value;
      if (attr.name === 'expr') {
        val = val
          .replace(/&gt;/g, '>')
          .replace(/&lt;/g, '<')
          .replace(/&amp;/g, '&');
      }
      attrs += ` ${attr.name}="${val.replace(/"/g, '&quot;')}"`;
    }

    if (el.childNodes.length === 0) {
      if (SELF_CLOSING_TAGS.has(tag)) {
        return `${currentIndent}<${tag}${attrs} />`;
      }
      if (CONTAINER_TAGS.has(tag)) {
        return `${currentIndent}<${tag}${attrs}>\n${currentIndent}</${tag}>`;
      }
      return `${currentIndent}<${tag}${attrs}></${tag}>`;
    }

    const hasBlocks = hasBlockChildren(el);

    if (!hasBlocks) {
      const inlineContent = Array.from(el.childNodes)
        .map(serializeInline)
        .join('')
        .trim();

      if (!inlineContent && SELF_CLOSING_TAGS.has(tag)) {
        return `${currentIndent}<${tag}${attrs} />`;
      }

      if (!inlineContent && CONTAINER_TAGS.has(tag)) {
        return `${currentIndent}<${tag}${attrs}>\n${currentIndent}</${tag}>`;
      }

      // Se tiver quebras de linha dentro do texto inline
      if (inlineContent.includes('\n')) {
        const lines = inlineContent
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean);
        const innerFormatted = lines.map(l => `${nextIndent}${l}`).join('\n');
        return `${currentIndent}<${tag}${attrs}>\n${innerFormatted}\n${currentIndent}</${tag}>`;
      }

      return `${currentIndent}<${tag}${attrs}>${inlineContent}</${tag}>`;
    }

    // Elemento possui blocos filhos (ex: <secao> contendo texto e sub-<secao>, <if>, etc.)
    const childPieces: string[] = [];
    let currentInlineBuffer: Node[] = [];

    const flushInline = () => {
      if (currentInlineBuffer.length > 0) {
        const textInline = currentInlineBuffer
          .map(serializeInline)
          .join('')
          .trim();
        if (textInline) {
          const lines = textInline
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean);
          lines.forEach(l => childPieces.push(`${nextIndent}${l}`));
        }
        currentInlineBuffer = [];
      }
    };

    const isParentDocumento = tag === 'documento';

    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes[i];
      if (child.nodeType === 1 && !INLINE_TAGS.has((child as Element).tagName.toLowerCase())) {
        flushInline();
        const childTag = (child as Element).tagName.toLowerCase();
        // Excepcionalmente para formulario e conteudo, ficam no mesmo nível de documento
        const isSameLevelAsDoc = isParentDocumento && (childTag === 'formulario' || childTag === 'conteudo');
        const childLevel = isSameLevelAsDoc ? indentLevel : indentLevel + 1;
        const formattedChild = formatNode(child, childLevel, tab);
        if (formattedChild) childPieces.push(formattedChild);
      } else {
        currentInlineBuffer.push(child);
      }
    }
    flushInline();

    return `${currentIndent}<${tag}${attrs}>\n${childPieces.join('\n')}\n${currentIndent}</${tag}>`;
  }

  return '';
}

/**
 * Formata uma string XML preservando a hierarquia correta de identação de seções,
 * subseções, campos de formulário, condicionais e tabelas.
 */
export function formatarXmlString(xmlStr: string, tab = '    '): string {
  if (!xmlStr || !xmlStr.trim()) return xmlStr;

  try {
    let parser: DOMParser;
    if (typeof DOMParser !== 'undefined') {
      parser = new DOMParser();
    } else if (typeof window !== 'undefined' && window.DOMParser) {
      parser = new window.DOMParser();
    } else {
      return xmlStr;
    }

    const trimmed = xmlStr.trim();

    // Sanitiza para o parser (expr com >, <, &, etc.)
    const sanitized = sanitizarXmlParaParser(trimmed);

    // Envolve com um elemento raiz temporário para suportar fragmentos com múltiplos nós de nível 0
    const wrappedXml = `<__format_root__>\n${sanitized}\n</__format_root__>`;

    const doc = parser.parseFromString(wrappedXml, 'text/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      console.warn('Erro ao formatar XML via DOM:', parseError.textContent);
      return xmlStr;
    }

    const root = doc.documentElement;
    const formattedChildren = Array.from(root.childNodes)
      .map(c => formatNode(c, 0, tab))
      .filter(Boolean);

    return formattedChildren.join('\n');
  } catch (err) {
    console.warn('Falha na formatação do XML:', err);
    return xmlStr;
  }
}
