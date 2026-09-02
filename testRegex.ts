function normalizarIdentificadorValido(texto: string, fallbackPadrao: string): string {
  if (!texto) return fallbackPadrao;
  let norm = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  norm = norm.replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  if (/^[0-9]/.test(norm)) norm = `item_${norm}`;
  if (!norm || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(norm)) return fallbackPadrao;
  return norm;
}

const text = "A taxa de juros de {{ Taxa de Juros | number(step=0.01, max=12) | desc=Limite legal 12% a.a. }} ao ano. {{ if Taxa de Juros > 10 }} Alto! {{ /if }}";

function processText(text: string) {
    return text.replace(/\{\{\s*(.*?)\s*\}\}/g, (match, inner) => {
        const parts = inner.split('|').map((p: string) => p.trim());
        const rawLabel = parts[0];
        
        if (rawLabel.toLowerCase().startsWith('if ')) {
            const expr = rawLabel.substring(3).trim();
            const exprParts = expr.split(/(==|!=|>=|<=|>|<)/);
            if (exprParts.length >= 3) {
                exprParts[0] = normalizarIdentificadorValido(exprParts[0].trim(), 'var') + ' ';
            }
            return `<if expr="${exprParts.join('')}">`;
        }
        if (rawLabel.toLowerCase().startsWith('/if')) {
            return `</if>`;
        }
        
        let id = normalizarIdentificadorValido(rawLabel, 'var');
        
        return `{{${id}}}`;
    });
}
console.log(processText(text));
