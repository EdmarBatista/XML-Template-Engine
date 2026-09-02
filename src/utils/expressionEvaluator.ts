/**
 * Avaliador de expressões lógicas e de comparação para tags <if expr="...">
 */

function dividirExpressao(expr: string, operador: string): [string, string] | null {
  let aspas: string | null = null;
  let nivel = 0;
  for (let i = 0; i <= expr.length - operador.length; i++) {
    const c = expr[i];
    if (c === "'" || c === '"') {
      if (aspas === c && expr[i - 1] !== '\\') aspas = null;
      else if (!aspas) aspas = c;
      continue;
    }
    if (aspas) continue;
    if (c === '(') nivel++;
    else if (c === ')') nivel--;

    if (nivel === 0 && expr.slice(i, i + operador.length) === operador) {
      return [expr.slice(0, i).trim(), expr.slice(i + operador.length).trim()];
    }
  }
  return null;
}

function avaliarComparacao(expr: string, dados: Record<string, any>): boolean {
  expr = expr.trim().replace(/^\((.*)\)$/, '$1').trim();
  const match = expr.match(/^([a-zA-Z_]\w*)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (!match) {
    // Caso de expressão booleana simples como "urgente" ou "!urgente"
    const singleVarMatch = expr.match(/^(!)?([a-zA-Z_]\w*)$/);
    if (singleVarMatch) {
      const isNeg = singleVarMatch[1] === '!';
      const varName = singleVarMatch[2];
      const val = Boolean(dados[varName]);
      return isNeg ? !val : val;
    }
    return false;
  }

  const [, varName, operator, rawValue] = match;
  const leftValue = dados[varName] !== undefined ? dados[varName] : '';
  let rightValue: any = rawValue.trim();

  if ((rightValue.startsWith("'") && rightValue.endsWith("'")) || (rightValue.startsWith('"') && rightValue.endsWith('"'))) {
    rightValue = rightValue.slice(1, -1);
  } else if (rightValue === 'true') {
    rightValue = true;
  } else if (rightValue === 'false') {
    rightValue = false;
  } else if (rightValue !== '' && !isNaN(Number(rightValue))) {
    rightValue = Number(rightValue);
  }

  const numLeft = Number(leftValue);
  const numRight = Number(rightValue);
  const isBothNumeric = !isNaN(numLeft) && !isNaN(numRight) && leftValue !== '' && rightValue !== '';

  switch (operator) {
    case '==':
      if (typeof leftValue === 'boolean' || typeof rightValue === 'boolean') {
        return Boolean(leftValue) === Boolean(rightValue);
      }
      if (isBothNumeric) {
        return numLeft === numRight;
      }
      return String(leftValue).trim() === String(rightValue).trim();
    case '!=':
      if (typeof leftValue === 'boolean' || typeof rightValue === 'boolean') {
        return Boolean(leftValue) !== Boolean(rightValue);
      }
      if (isBothNumeric) {
        return numLeft !== numRight;
      }
      return String(leftValue).trim() !== String(rightValue).trim();
    case '>':
      return isBothNumeric ? numLeft > numRight : String(leftValue) > String(rightValue);
    case '<':
      return isBothNumeric ? numLeft < numRight : String(leftValue) < String(rightValue);
    case '>=':
      return isBothNumeric ? numLeft >= numRight : String(leftValue) >= String(rightValue);
    case '<=':
      return isBothNumeric ? numLeft <= numRight : String(leftValue) <= String(rightValue);
    default:
      return false;
  }
}

export function decodificarEntidadesXml(str: string): string {
  if (!str) return '';
  let res = String(str);
  let prev = '';
  // Decodifica repetidamente enquanto houver entidades aninhadas (ex: &amp;apos; -> &apos; -> ')
  while (res !== prev && res.includes('&')) {
    prev = res;
    res = res
      .replace(/&amp;/g, '&')
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<');
  }
  return res;
}

export function avaliarExpressao(expr: string, dados: Record<string, any>): boolean {
  if (!expr) return true;

  const limpa = decodificarEntidadesXml(expr).trim();

  // Tratamento de operadores OR (|| ou OR)
  const ou = dividirExpressao(limpa, '||') || dividirExpressao(limpa, ' OR ');
  if (ou) {
    return avaliarExpressao(ou[0], dados) || avaliarExpressao(ou[1], dados);
  }

  // Tratamento de operadores AND (&& ou AND)
  const e = dividirExpressao(limpa, '&&') || dividirExpressao(limpa, ' AND ');
  if (e) {
    return avaliarExpressao(e[0], dados) && avaliarExpressao(e[1], dados);
  }

  return avaliarComparacao(limpa, dados);
}

export function extrairVariaveisDaExpressao(expr: string): string[] {
  if (!expr) return [];
  const decodificado = decodificarEntidadesXml(expr);
  const limpo = decodificado
    .replace(/'[^']*'/g, '')
    .replace(/"[^"]*"/g, '')
    .replace(/[=!<>+&|()[\],]+/g, ' ')
    .replace(/\b(true|false|null|undefined|AND|OR|and|or|not)\b/gi, ' ')
    .replace(/\b\d+(\.\d+)?\b/g, ' ');

  return limpo
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => /^[a-zA-Z_][a-zA-Z0-9_\.]*$/.test(token));
}
