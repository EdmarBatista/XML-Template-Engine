import type { ValorCampo } from '../types';

import { ColumnType, DadosDocumento } from '../types';

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

/**
 * Gramática de caminho aceita nas expressões e na interpolação:
 * `campo`, `tabela.coluna`, `tabela.coluna[0]`, `tabela[0].coluna`, `a.b.c`.
 * Aceita hífen no nome do campo (ex.: `valor-total`).
 */
export const GRAMATICA_CAMINHO = String.raw`[A-Za-z_][\w-]*(?:(?:\.[A-Za-z_][\w-]*)|(?:\[\d+\]))*`;

interface SegmentoCaminho {
  nome: string;
  indices: number[];
}

function dividirCaminho(caminho: string): SegmentoCaminho[] | null {
  if (!caminho) return null;
  const segmentos: SegmentoCaminho[] = [];
  for (const parte of caminho.split('.')) {
    const m = parte.match(/^([^\[\]]+)((?:\[\d+\])*)$/);
    if (!m) return null;
    segmentos.push({
      nome: m[1],
      indices: Array.from(m[2].matchAll(/\[(\d+)\]/g), achado => Number(achado[1])),
    });
  }
  return segmentos;
}

function valorDeCelula(linha: unknown, coluna: string): ValorCampo {
  if (!linha || typeof linha !== 'object') return '';
  const valor = (linha as Record<string, unknown>)[coluna];
  return valor === undefined || valor === null ? '' : (valor as ValorCampo);
}

function aplicarIndices(valor: unknown, indices: number[]): unknown {
  let atual = valor;
  for (const indice of indices) {
    if (!Array.isArray(atual)) return undefined;
    atual = atual[indice];
  }
  return atual;
}

export function obterValorPorCaminho(dados: DadosDocumento, caminho: string): ValorCampo {
  if (!caminho) return '';
  if (Object.prototype.hasOwnProperty.call(dados, caminho)) {
    return dados[caminho] as ValorCampo;
  }

  const segmentos = dividirCaminho(caminho);
  if (!segmentos) return '';

  let atual: unknown = dados;

  for (let i = 0; i < segmentos.length; i++) {
    const { nome, indices } = segmentos[i];
    const ultimo = i === segmentos.length - 1;

    if (Array.isArray(atual)) {
      if (indices.length > 0) {
        // `tabela.coluna[0]`: o índice escolhe a linha e `nome` é a coluna.
        const elemento = aplicarIndices(atual, indices);
        if (
          elemento &&
          typeof elemento === 'object' &&
          Object.prototype.hasOwnProperty.call(elemento, nome)
        ) {
          atual = (elemento as Record<string, unknown>)[nome];
        } else {
          atual = elemento;
        }
      } else if (ultimo) {
        // Compatibilidade: `tabela.coluna` lista os valores de todas as linhas.
        const valores = atual
          .map(linha => valorDeCelula(linha, nome))
          .filter(valor => valor !== '' && valor !== undefined && valor !== null);
        return valores.join(', ');
      } else {
        return '';
      }
      continue;
    }

    if (atual && typeof atual === 'object') {
      atual = (atual as Record<string, unknown>)[nome];
      if (indices.length > 0) {
        atual = aplicarIndices(atual, indices);
      }
      continue;
    }

    return '';
  }

  return atual === undefined || atual === null ? '' : (atual as ValorCampo);
}
