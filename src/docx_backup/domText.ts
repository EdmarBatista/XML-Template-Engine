/* Helpers de DOM/parser e texto usados na pipeline. */

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

export function getXmlParser(): DOMParser {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser();
  }
  if (typeof window !== 'undefined' && window.DOMParser) {
    return new window.DOMParser();
  }
  throw new Error('DOMParser is not available');
}

export function parseHtmlDoc(html: string): Document {
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }
  if (typeof window !== 'undefined' && window.DOMParser) {
    const parser = new window.DOMParser();
    return parser.parseFromString(html, 'text/html');
  }
  throw new Error('DOMParser is not available');
}

export function escapeXml(unsafe: string): string {
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

export function extrairTextoComEspacos(node: Node | null): string {
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

export function limparEspacos(texto: string): string {
  return (texto || '').replace(/\s+/g, ' ').trim();
}

export function normalizarIdentificadorValido(texto: string, fallbackPadrao: string): string {
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
