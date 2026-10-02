import { describe, expect, it } from 'vitest';
import {
  atributosDeSecao,
  atributosDeTituloDeSecao,
  ehNivelRaiz,
  lerNivelDeNumeracao,
  lerNumeracaoEfetiva,
  lerNumeracaoPropria,
  lerReinicio,
  nivelParaIlvl,
  WORD_ATTR_NIVEL,
  WORD_ATTR_NUMERAR,
  WORD_ATTR_NUMERAR_EFETIVO,
  WORD_ATTR_REINICIAR,
  WORD_ATTR_TIPO,
  WORD_TIPO_SECAO,
  WORD_TIPO_SECAO_TITULO,
} from './wordDom';

/** Dublê mínimo de `Element`: os acessores só usam `getAttribute`. */
function elemento(atributos: Record<string, string> = {}): Element {
  return {
    getAttribute: (nome: string) => (nome in atributos ? atributos[nome] : null),
  } as unknown as Element;
}

describe('nivelParaIlvl — nível 1-based do DOM para ilvl 0-based do Word', () => {
  it('mapeia o nível raiz para o ilvl 0', () => {
    expect(nivelParaIlvl(1)).toBe(0);
    expect(nivelParaIlvl(2)).toBe(1);
    expect(nivelParaIlvl(3)).toBe(2);
  });

  it('nunca produz ilvl negativo, mesmo recebendo nível 0', () => {
    expect(nivelParaIlvl(0)).toBe(0);
    expect(nivelParaIlvl(-5)).toBe(0);
  });

  it('respeita o teto de níveis configurado', () => {
    expect(nivelParaIlvl(99)).toBe(8);
    expect(nivelParaIlvl(99, 9)).toBe(8);
    expect(nivelParaIlvl(99, 3)).toBe(2);
  });
});

describe('ehNivelRaiz — o topo vale 1 no container e 0 no título', () => {
  it('reconhece como raiz o nível 0 (título) e o nível 1 (container)', () => {
    expect(ehNivelRaiz(0)).toBe(true);
    expect(ehNivelRaiz(1)).toBe(true);
  });

  it('não reconhece subseções como raiz', () => {
    expect(ehNivelRaiz(2)).toBe(false);
    expect(ehNivelRaiz(7)).toBe(false);
  });
});

describe('leitura dos atributos data-word-*', () => {
  it('trata numeração como ligada quando o atributo está ausente', () => {
    expect(lerNumeracaoPropria(elemento())).toBe(true);
    expect(lerNumeracaoEfetiva(elemento())).toBe(true);
  });

  it('lê a flag própria de data-word-numerar', () => {
    expect(lerNumeracaoPropria(elemento({ [WORD_ATTR_NUMERAR]: 'false' }))).toBe(false);
    expect(lerNumeracaoPropria(elemento({ [WORD_ATTR_NUMERAR]: 'true' }))).toBe(true);
  });

  it('dá precedência à flag efetiva sobre a própria', () => {
    // Caso que originou o bug: a seção é numerável por si só, mas está dentro de uma
    // seção com numerar="false", então o Word não pode numerá-la.
    const dentroDeSecaoNaoNumerada = elemento({
      [WORD_ATTR_NUMERAR]: 'true',
      [WORD_ATTR_NUMERAR_EFETIVO]: 'false',
    });
    expect(lerNumeracaoEfetiva(dentroDeSecaoNaoNumerada)).toBe(false);
  });

  it('cai para a flag própria quando a efetiva não foi publicada', () => {
    expect(lerNumeracaoEfetiva(elemento({ [WORD_ATTR_NUMERAR]: 'false' }))).toBe(false);
  });

  it('reconhece reinício tanto em "true" quanto em "1"', () => {
    expect(lerReinicio(elemento({ [WORD_ATTR_REINICIAR]: 'true' }))).toBe(true);
    expect(lerReinicio(elemento({ [WORD_ATTR_REINICIAR]: '1' }))).toBe(true);
    expect(lerReinicio(elemento({ [WORD_ATTR_REINICIAR]: 'false' }))).toBe(false);
    expect(lerReinicio(elemento())).toBe(false);
  });

  it('lê o nível e cai para o herdado quando ausente ou inválido', () => {
    expect(lerNivelDeNumeracao(elemento({ [WORD_ATTR_NIVEL]: '3' }), 0)).toBe(3);
    expect(lerNivelDeNumeracao(elemento(), 4)).toBe(4);
    expect(lerNivelDeNumeracao(elemento({ [WORD_ATTR_NIVEL]: 'abc' }), 4)).toBe(4);
  });
});

describe('atributos publicados pelo renderizador', () => {
  it('publica o container de seção com as quatro flags', () => {
    const atributos = atributosDeSecao({
      nivel: 2,
      numeracaoPropria: true,
      numeracaoEfetiva: false,
      reiniciar: true,
    });

    expect(atributos).toEqual({
      [WORD_ATTR_TIPO]: WORD_TIPO_SECAO,
      [WORD_ATTR_NIVEL]: '2',
      [WORD_ATTR_NUMERAR]: 'true',
      [WORD_ATTR_NUMERAR_EFETIVO]: 'false',
      [WORD_ATTR_REINICIAR]: 'true',
    });
  });

  it('publica o título com a base bruta do nível (0 na raiz)', () => {
    const atributos = atributosDeTituloDeSecao({ nivel: 0, numeracaoPropria: true });

    expect(atributos).toEqual({
      [WORD_ATTR_TIPO]: WORD_TIPO_SECAO_TITULO,
      [WORD_ATTR_NIVEL]: '0',
      [WORD_ATTR_NUMERAR]: 'true',
    });
  });
});
