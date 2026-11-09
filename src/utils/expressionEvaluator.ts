/**
 * Avaliador de expressões lógicas e de comparação para tags <if expr="...">
 */
import type { DadosDocumento, FieldMetadata, ValorCampo } from '../types';
import { valoresDaLista } from './listas';

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

/**
 * Remove somente os parênteses que envolvem a expressão inteira.
 * "((a == 1) || b)" vira "(a == 1) || b"; "(a == 1) && b" não muda.
 * O operando entre parênteses nunca deve chegar ao regex de comparação.
 */
function removerParentesesExternos(expr: string): string {
  let atual = expr.trim();

  while (atual.length >= 2 && atual.startsWith('(') && atual.endsWith(')')) {
    let aspas: string | null = null;
    let nivel = 0;
    let fechaNoFim = false;

    for (let i = 0; i < atual.length; i++) {
      const c = atual[i];
      if (c === "'" || c === '"') {
        if (aspas === c && atual[i - 1] !== '\\') aspas = null;
        else if (!aspas) aspas = c;
        continue;
      }
      if (aspas) continue;

      if (c === '(') nivel++;
      else if (c === ')') {
        nivel--;
        if (nivel === 0) {
          fechaNoFim = i === atual.length - 1;
          break;
        }
      }
    }

    if (!fechaNoFim) break;
    atual = atual.slice(1, -1).trim();
  }

  return atual;
}

function valorTemConteudo(valor: unknown): boolean {
  if (valor === null || valor === undefined || valor === false) return false;
  if (Array.isArray(valor)) return valor.some(item => valorTemConteudo(item));
  return String(valor).trim() !== '';
}

function linhaTemConteudo(linha: unknown): boolean {
  if (linha === null || linha === undefined) return false;
  if (typeof linha === 'object') {
    return Object.values(linha as Record<string, unknown>).some(valorTemConteudo);
  }
  return valorTemConteudo(linha);
}

function qtdeLinhasDoCampo(
  id: string,
  dados: DadosDocumento,
  campos?: Record<string, FieldMetadata>
): number {
  const valor = Object.prototype.hasOwnProperty.call(dados, id) ? dados[id] : undefined;
  const meta = campos?.[id];

  if (Array.isArray(valor)) {
    const ehTabela = meta?.tipo === 'tabela' || valor.some(item => item !== null && typeof item === 'object');
    if (ehTabela) return valor.filter(linhaTemConteudo).length;
    return valoresDaLista(valor).length;
  }

  if (typeof valor === 'string' && meta?.tipoInput === 'lista_csv') {
    return valoresDaLista(valor).length;
  }

  return valorTemConteudo(valor) ? 1 : 0;
}

interface ChamadaLinhas {
  nome: 'qtde_linhas' | 'tem_linhas';
  id: string;
}

function lerChamadaLinhas(expr: string): ChamadaLinhas | null {
  const match = expr.match(
    /^(qtde_linhas|tem_linhas)\s*\(\s*(?:'([^']*)'|"([^"]*)"|([a-zA-Z_]\w*))\s*\)$/
  );
  if (!match) return null;
  return {
    nome: match[1] as ChamadaLinhas['nome'],
    id: match[2] ?? match[3] ?? match[4] ?? '',
  };
}

function valorChamadaLinhas(
  chamada: ChamadaLinhas,
  dados: DadosDocumento,
  campos?: Record<string, FieldMetadata>
): number {
  const quantidade = qtdeLinhasDoCampo(chamada.id, dados, campos);
  return chamada.nome === 'tem_linhas' ? (quantidade > 0 ? 1 : 0) : quantidade;
}

function compararValores(leftValue: ValorCampo, operator: string, rawValue: string): boolean {
  let rightValue: ValorCampo = rawValue.trim();
  if ((rightValue.startsWith("'") && rightValue.endsWith("'")) || (rightValue.startsWith('"') && rightValue.endsWith('"'))) {
    rightValue = rightValue.slice(1, -1);
  } else if (rightValue === 'true') {
    rightValue = true;
  } else if (rightValue === 'false') {
    rightValue = false;
  } else if (rightValue !== '' && !isNaN(Number(rightValue))) {
    rightValue = Number(rightValue);
  }

  let normLeft: ValorCampo = leftValue;
  if (normLeft === 'true') normLeft = true;
  else if (normLeft === 'false') normLeft = false;

  let normRight: ValorCampo = rightValue;
  if (normRight === 'true') normRight = true;
  else if (normRight === 'false') normRight = false;

  const numLeft = Number(normLeft);
  const numRight = Number(normRight);
  const isBothNumeric = !isNaN(numLeft) && !isNaN(numRight) && normLeft !== '' && normRight !== '';

  switch (operator) {
    case '==':
      if (typeof normLeft === 'boolean' || typeof normRight === 'boolean') {
        return Boolean(normLeft) === Boolean(normRight);
      }
      if (isBothNumeric) {
        return numLeft === numRight;
      }
      return String(normLeft).trim() === String(normRight).trim();
    case '!=':
      if (typeof normLeft === 'boolean' || typeof normRight === 'boolean') {
        return Boolean(normLeft) !== Boolean(normRight);
      }
      if (isBothNumeric) {
        return numLeft !== numRight;
      }
      return String(normLeft).trim() !== String(normRight).trim();
    case '>':
      return isBothNumeric ? numLeft > numRight : String(normLeft) > String(normRight);
    case '<':
      return isBothNumeric ? numLeft < numRight : String(normLeft) < String(normRight);
    case '>=':
      return isBothNumeric ? numLeft >= numRight : String(normLeft) >= String(normRight);
    case '<=':
      return isBothNumeric ? numLeft <= numRight : String(normLeft) <= String(normRight);
    default:
      return false;
  }
}

function avaliarComparacao(
  expr: string,
  dados: DadosDocumento,
  campos?: Record<string, FieldMetadata>
): boolean {
  expr = removerParentesesExternos(expr).trim();

  // qtde_linhas('x') > 2 / tem_linhas('x') == false
  const chamadaComparada = expr.match(
    /^(qtde_linhas|tem_linhas)\s*\(\s*(?:'([^']*)'|"([^"]*)"|([a-zA-Z_]\w*))\s*\)\s*(==|!=|>=|<=|>|<)\s*(.+)$/
  );
  if (chamadaComparada) {
    const chamada: ChamadaLinhas = {
      nome: chamadaComparada[1] as ChamadaLinhas['nome'],
      id: chamadaComparada[2] ?? chamadaComparada[3] ?? chamadaComparada[4] ?? '',
    };
    return compararValores(
      valorChamadaLinhas(chamada, dados, campos),
      chamadaComparada[5],
      chamadaComparada[6]
    );
  }

  // tem_linhas('x') / qtde_linhas('x') isolados
  const chamada = lerChamadaLinhas(expr);
  if (chamada) {
    return valorChamadaLinhas(chamada, dados, campos) > 0;
  }

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
  return compararValores(leftValue, operator, rawValue);
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

export function avaliarExpressao(
  expr: string,
  dados: DadosDocumento,
  campos?: Record<string, FieldMetadata>
): boolean {
  if (!expr) return true;
  let limpa = decodificarEntidadesXml(expr).trim();
  limpa = removerParentesesExternos(limpa);

  // Tratamento de operadores OR (|| ou OR)
  const ou = dividirExpressao(limpa, '||') || dividirExpressao(limpa, ' OR ');
  if (ou) {
    return avaliarExpressao(ou[0], dados, campos) || avaliarExpressao(ou[1], dados, campos);
  }

  // Tratamento de operadores AND (&& ou AND)
  const e = dividirExpressao(limpa, '&&') || dividirExpressao(limpa, ' AND ');
  if (e) {
    return avaliarExpressao(e[0], dados, campos) && avaliarExpressao(e[1], dados, campos);
  }

  return avaliarComparacao(limpa, dados, campos);
}

export function extrairVariaveisDaExpressao(expr: string): string[] {
  if (!expr) return [];
  const decodificado = decodificarEntidadesXml(expr);
  const limpo = decodificado
    // A função vale pelo seu argumento: o id citado continua sendo um campo usado.
    .replace(
      /\b(?:qtde_linhas|tem_linhas)\s*\(\s*(?:'([^']*)'|"([^"]*)"|([a-zA-Z_]\w*))\s*\)/gi,
      (_match, simples: string, dupla: string, semAspas: string) => ` ${simples || dupla || semAspas || ''} `
    )
    .replace(/'[^']*'/g, '')
    .replace(/"[^"]*"/g, '')
    .replace(/[=!<>+&|()[\],]+/g, ' ')
    .replace(/\b(true|false|null|undefined|AND|OR|and|or|not|qtde_linhas|tem_linhas)\b/gi, ' ')
    .replace(/\b\d+(\.\d+)?\b/g, ' ');

  return limpo
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => /^[a-zA-Z_][a-zA-Z0-9_\.]*$/.test(token));
}
