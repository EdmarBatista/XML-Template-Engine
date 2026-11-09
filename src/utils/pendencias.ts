import type { DadosDocumento, FieldMetadata, FormGroup } from '../types';
import { avaliarExpressao } from './expressionEvaluator';

export type Pendencia = {
  id: string;
  rotulo: string;
  grupo: string;
  tipo: 'campo_obrigatorio' | 'tabela_vazia';
  mensagem: string;
};

function valorEscalarVazio(valor: unknown): boolean {
  if (valor === null || valor === undefined || valor === false) return true;
  if (Array.isArray(valor)) return valor.length === 0;
  return String(valor).trim() === '';
}

function linhaPreenchida(linha: unknown): boolean {
  if (linha === null || linha === undefined) return false;
  if (typeof linha === 'object') {
    return Object.values(linha as Record<string, unknown>).some(valor => !valorEscalarVazio(valor));
  }
  return !valorEscalarVazio(linha);
}

function valorDoCampoVazio(campo: FieldMetadata, valor: unknown): boolean {
  const ehTabela = campo.tipo === 'tabela' || (Array.isArray(valor) && valor.some(item => item !== null && typeof item === 'object'));

  if (ehTabela) {
    if (!Array.isArray(valor)) return true;
    return !valor.some(linhaPreenchida);
  }

  if (Array.isArray(valor)) {
    return !valor.some(item => !valorEscalarVazio(item));
  }

  return valorEscalarVazio(valor);
}

function campoObrigatorio(
  campo: FieldMetadata,
  dados: DadosDocumento,
  campos: Record<string, FieldMetadata>
): boolean {
  const regra = String(campo.obrigatorio || '').trim();
  if (!regra || regra.toLowerCase() === 'false') return false;
  if (regra.toLowerCase() === 'true') return true;
  return avaliarExpressao(regra, dados, campos);
}

function mapaDeGrupos(grupos: FormGroup[]): Map<string, string> {
  const mapa = new Map<string, string>();

  const visitarItens = (itens: FormGroup['itens'], titulo: string) => {
    for (const item of itens) {
      if (item.tipo === 'campo') {
        if (!mapa.has(item.id)) mapa.set(item.id, titulo);
      } else if (item.tipo === 'if') {
        visitarItens(item.itens, titulo);
      }
    }
  };

  for (const grupo of grupos) {
    if (grupo.itens && grupo.itens.length > 0) {
      visitarItens(grupo.itens, grupo.titulo);
    } else {
      for (const id of grupo.campos || []) {
        if (!mapa.has(id)) mapa.set(id, grupo.titulo);
      }
    }
  }

  return mapa;
}

/**
 * Coleta as pendências que impedem a exportação.
 *
 * Só exige campo visível e cuja expressão `obrigatorio` é verdadeira. Tabela
 * obrigatória vazia gera uma única pendência do tipo `tabela_vazia`.
 */
export function coletarPendencias(
  campos: Record<string, FieldMetadata>,
  dados: DadosDocumento,
  grupos: FormGroup[] = []
): Pendencia[] {
  const grupoPorCampo = mapaDeGrupos(grupos);
  const pendencias: Pendencia[] = [];

  for (const campo of Object.values(campos)) {
    if (!campoObrigatorio(campo, dados, campos)) continue;

    if (campo.condicao && !avaliarExpressao(campo.condicao, dados, campos)) {
      continue;
    }

    const valor = dados[campo.id];
    if (!valorDoCampoVazio(campo, valor)) continue;

    const tipo: Pendencia['tipo'] =
      campo.tipo === 'tabela' || (Array.isArray(valor) && valor.some(item => item !== null && typeof item === 'object'))
        ? 'tabela_vazia'
        : 'campo_obrigatorio';

    pendencias.push({
      id: campo.id,
      rotulo: campo.label,
      grupo: grupoPorCampo.get(campo.id) || 'Geral',
      tipo,
      mensagem:
        campo.mensagemPendencia ||
        (tipo === 'tabela_vazia'
          ? 'Inclua ao menos uma linha preenchida nesta tabela.'
          : 'Preencha este campo obrigatório.'),
    });
  }

  return pendencias;
}
