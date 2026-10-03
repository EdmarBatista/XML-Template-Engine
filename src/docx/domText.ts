/* Helpers de DOM/parser e texto usados na pipeline. */

export function getXmlParser(): DOMParser {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser();
  }
  if (typeof window !== 'undefined' && window.DOMParser) {
    return new window.DOMParser();
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

export function decodificarEntidadesXml(texto: string): string {
  return (texto || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
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

  return norm || fallbackPadrao;
}
