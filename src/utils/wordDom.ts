import { DOCUMENT_THEME } from '../constants/documentTheme';

/**
 * Contrato dos atributos `data-word-*` que o renderizador publica no DOM e que os
 * exportadores (Word/PDF) e o extrator de conteudo consomem.
 *
 * Os nomes viviam como strings soltas espalhadas entre produtores e consumidores, o
 * que ja causou dois bugs silenciosos:
 *
 * 1. `data-word-reiniciar` era previsto pelo exportador do Word mas nunca publicado
 *    pelo renderizador, entao o Word seguia contando onde a tela e o PDF reiniciavam.
 * 2. `data-word-numerar` publicava a flag PROPRIA da secao, enquanto o Word precisava
 *    da flag EFETIVA (que considera uma secao ancestral com `numerar="false"`). Dai o
 *    par `data-word-numerar` / `data-word-numerar-efetivo`.
 *
 * ATENCAO a base da numeracao, que difere entre os dois produtores de proposito:
 *
 * - `data-word-level` no container `[data-word-type="secao"]` usa base 1 (a secao raiz
 *   e nivel 1). E esse valor que vira `ilvl` do Word via {@link nivelParaIlvl}.
 * - `data-word-level` no titulo `[data-word-type="secao-titulo"]` recebe o `nivelSecao`
 *   bruto do renderizador: 0 na secao raiz e 2, 3, ... nas descendentes. O extrator usa
 *   `[data-word-level="0"]` para reconhecer o titulo principal e manter o numero em
 *   negrito. Nao uniformize os dois lados sem antes revisar essa regra.
 */

/** Nome dos atributos publicados no DOM. */
export const WORD_ATTR_TIPO = 'data-word-type';
export const WORD_ATTR_NIVEL = 'data-word-level';
export const WORD_ATTR_OUTLINE_LEVEL = 'data-word-outline-level';
export const WORD_ATTR_NUMERAR = 'data-word-numerar';
export const WORD_ATTR_NUMERAR_EFETIVO = 'data-word-numerar-efetivo';
export const WORD_ATTR_REINICIAR = 'data-word-reiniciar';
export const WORD_ATTR_NUMERADO = 'data-word-numerado';
export const WORD_ATTR_NUMERADA = 'data-word-numerada';
export const WORD_ATTR_TIPO_LISTA = 'data-word-tipo-lista';
export const WORD_ATTR_IGNORE = 'data-word-ignore';
export const WORD_ATTR_ALIGN = 'data-word-align';
export const WORD_ATTR_NUM = 'data-word-num';

/** Valores de `data-word-type` usados pelo conteudo de secao. */
export const WORD_TIPO_TITULO = 'titulo';
export const WORD_TIPO_SUBTITULO = 'subtitulo';
export const WORD_TIPO_SECAO = 'secao';
export const WORD_TIPO_SECAO_CONTEUDO = 'secao-conteudo';
export const WORD_TIPO_SECAO_TITULO = 'secao-titulo';
export const WORD_TIPO_PARAGRAFO = 'paragrafo';
export const WORD_TIPO_TABELA_CONTAINER = 'tabela-container';
export const WORD_TIPO_LISTA = 'lista';
export const WORD_TIPO_ITEM = 'item';

/**
 * Teto de niveis de numeracao hierarquica. Espelha o padrao do tema para que o valor
 * usado no calculo do `ilvl` nao volte a ser um literal repetido em cada chamada.
 */
export const NIVEL_MAXIMO_NUMERACAO_PADRAO =
  DOCUMENT_THEME.word.defaultOptions.nivelMaximoNumeracao || 9;

/** Le um atributo inteiro do DOM, caindo para o valor herdado se ausente ou invalido. */
function lerInteiro(el: Element, nome: string, fallback: number): number {
  const bruto = el.getAttribute(nome);
  if (bruto === null) return fallback;
  const valor = parseInt(bruto, 10);
  return Number.isNaN(valor) ? fallback : valor;
}

/** Le o nivel de numeracao do elemento, caindo para o nivel herdado do contexto. */
export function lerNivelDeNumeracao(el: Element, nivelHerdado: number): number {
  return lerInteiro(el, WORD_ATTR_NIVEL, nivelHerdado);
}

/** Flag propria da secao: `numerar="false"` no XML de origem desliga a numeracao dela. */
export function lerNumeracaoPropria(el: Element): boolean {
  return el.getAttribute(WORD_ATTR_NUMERAR) !== 'false';
}

/**
 * Flag efetiva: considera o contexto herdado. Uma secao dentro de outra com
 * `numerar="false"` nao e numerada pelo renderizador nem pelo PDF, entao o Word
 * tambem nao pode numera-la — sob pena de deslocar toda a contagem seguinte.
 */
export function lerNumeracaoEfetiva(el: Element): boolean {
  const efetivo = el.getAttribute(WORD_ATTR_NUMERAR_EFETIVO);
  return (efetivo !== null ? efetivo : el.getAttribute(WORD_ATTR_NUMERAR)) !== 'false';
}

/** `true` quando a secao deve reiniciar a contagem (`reiniciar="true"` no XML). */
export function lerReinicio(el: Element): boolean {
  const valor = el.getAttribute(WORD_ATTR_REINICIAR);
  return valor === 'true' || valor === '1';
}

/**
 * Nivel raiz da hierarquia. No container o topo vale 1 e no titulo vale 0, por isso a
 * comparacao e `<= 1` em vez de igualdade — a igualdade a 0 deixava o ramo inalcancavel
 * no container e a opcao `secaoTamanhoFonte` sem efeito nenhum.
 */
export function ehNivelRaiz(nivel: number): boolean {
  return nivel <= 1;
}

/**
 * Converte o nivel publicado no DOM (base 1) para o `ilvl` do Word (base 0),
 * respeitando o teto de niveis configurado.
 *
 * O `lvlText` do `abstractNum` reflete essa base: `%1.` no `ilvl` 0 e `%1.%2.` no
 * `ilvl` 1. Sem o `-1` todo nivel subia um degrau e ganhava um "1." fantasma — `1.1.`
 * no lugar de `1.`.
 */
export function nivelParaIlvl(nivel: number, nivelMaximo?: number): number {
  const maximo = (nivelMaximo || NIVEL_MAXIMO_NUMERACAO_PADRAO) - 1;
  return Math.max(0, Math.min(nivel - 1, maximo));
}

/** Atributos `data-word-*` do container de secao (`div`). */
export function atributosDeSecao(opcoes: {
  nivel: number;
  numeracaoPropria: boolean;
  numeracaoEfetiva: boolean;
  reiniciar: boolean;
}): Record<string, string> {
  return {
    [WORD_ATTR_TIPO]: WORD_TIPO_SECAO,
    [WORD_ATTR_NIVEL]: String(opcoes.nivel),
    [WORD_ATTR_NUMERAR]: opcoes.numeracaoPropria ? 'true' : 'false',
    [WORD_ATTR_NUMERAR_EFETIVO]: opcoes.numeracaoEfetiva ? 'true' : 'false',
    [WORD_ATTR_REINICIAR]: opcoes.reiniciar ? 'true' : 'false',
  };
}

/** Atributos `data-word-*` do container de conteudo da secao. */
export const ATRIBUTOS_SECAO_CONTEUDO: Record<string, string> = {
  [WORD_ATTR_TIPO]: WORD_TIPO_SECAO_CONTEUDO,
};

/** Atributos `data-word-*` do titulo de secao (`h3`), que usa a base bruta do nivel. */
export function atributosDeTituloDeSecao(opcoes: {
  nivel: number;
  numeracaoPropria: boolean;
}): Record<string, string> {
  return {
    [WORD_ATTR_TIPO]: WORD_TIPO_SECAO_TITULO,
    [WORD_ATTR_NIVEL]: String(opcoes.nivel),
    [WORD_ATTR_NUMERAR]: opcoes.numeracaoPropria ? 'true' : 'false',
  };
}
