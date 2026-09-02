
import { ColumnType } from '../types';

const TIPOS_COLUNA_GENERICOS = new Set(['', 'input', 'texto']);
const TIPOS_COLUNA_MASCARA = new Set(['moeda', 'cpf', 'cnpj', 'cep', 'email', 'telefone']);

/**
 * Retorna o tipo efetivo de uma coluna de tabela, considerando tanto o atributo
 * `tipo` quanto o `validar`. Uma coluna com `tipo="input"` e `validar="moeda"`
 * é tratada como moeda (formatada/justada na edição e na exportação).
 */
export function obterTipoEfetivoColuna(tipo?: string): ColumnType {
  const rawTipo = String(tipo || '').toLowerCase().trim();
  if (rawTipo === 'texto') return 'input';
  
  const validTypes = new Set<string>([
    'input', 'texto', 'number', 'moeda', 'date', 'select', 
    'radio', 'textarea', 'checkbox', 'cpf', 'cnpj', 'cep', 'telefone', 'email'
  ]);
  
  if (validTypes.has(rawTipo)) {
    return rawTipo as ColumnType;
  }
  
  return 'input';
}

export function obterValorPorCaminho(dados: Record<string, any>, caminho: string): any {
  if (!caminho) return '';
  if (Object.prototype.hasOwnProperty.call(dados, caminho)) {
    return dados[caminho];
  }

  // 1. Suporte prioritário para o formato tabela.coluna[0] ou tabela.coluna[1]
  const matchColunaIndexada = caminho.match(/^([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\[(\d+)\]$/);
  if (matchColunaIndexada) {
    const [, nomeTabela, nomeColuna, strIdx] = matchColunaIndexada;
    const arrayTabela = dados[nomeTabela];
    if (Array.isArray(arrayTabela)) {
      const idx = Number(strIdx);
      const linha = arrayTabela[idx] !== undefined ? arrayTabela[idx] : (idx >= 1 ? arrayTabela[idx - 1] : undefined);
      if (linha && typeof linha === 'object') {
        const val = linha[nomeColuna];
        return val !== undefined && val !== null ? val : '';
      }
    }
    return '';
  }

  // 2. Suporte para o formato tabela[0].coluna
  const matchTabelaIndexada = caminho.match(/^([a-zA-Z0-9_]+)\[(\d+)\]\.([a-zA-Z0-9_]+)$/);
  if (matchTabelaIndexada) {
    const [, nomeTabela, strIdx, nomeColuna] = matchTabelaIndexada;
    const arrayTabela = dados[nomeTabela];
    if (Array.isArray(arrayTabela)) {
      const idx = Number(strIdx);
      const linha = arrayTabela[idx] !== undefined ? arrayTabela[idx] : (idx >= 1 ? arrayTabela[idx - 1] : undefined);
      if (linha && typeof linha === 'object') {
        const val = linha[nomeColuna];
        return val !== undefined && val !== null ? val : '';
      }
    }
    return '';
  }

  // 3. Suporte para acesso direto a todos os valores de uma coluna: tabela.coluna
  const matchTabelaColuna = caminho.match(/^([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)$/);
  if (matchTabelaColuna) {
    const [, nomeTabela, nomeColuna] = matchTabelaColuna;
    const objOuArray = dados[nomeTabela];
    if (Array.isArray(objOuArray)) {
      const valoresColuna = objOuArray
        .map(linha => (linha && typeof linha === 'object' ? linha[nomeColuna] : ''))
        .filter(v => v !== '' && v !== undefined && v !== null);
      return valoresColuna.join(', ');
    } else if (objOuArray && typeof objOuArray === 'object') {
      const val = objOuArray[nomeColuna];
      return val !== undefined && val !== null ? val : '';
    }
  }

  return '';
}
