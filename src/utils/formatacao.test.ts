import { describe, expect, it } from 'vitest';
import {
  converterFormatoData,
  converterParaRomano,
  dataPorExtenso,
  formatarMoeda,
  moedaPorExtenso,
  numeroPorExtenso,
  parseNumeroMoeda,
} from './formatacao';

describe('formatarMoeda', () => {
  it('formata número com duas casas e separador de milhar', () => {
    expect(formatarMoeda(1234.56)).toBe('1.234,56');
    expect(formatarMoeda(0)).toBe('0,00');
    expect(formatarMoeda(1000000)).toBe('1.000.000,00');
  });

  it('trata texto como centavos digitados (sem separador)', () => {
    expect(formatarMoeda('123456')).toBe('1.234,56');
    expect(formatarMoeda('R$ 1.234,56')).toBe('1.234,56');
    expect(formatarMoeda('50')).toBe('0,50');
  });

  it('devolve vazio para entrada vazia ou não numérica', () => {
    expect(formatarMoeda('')).toBe('');
    expect(formatarMoeda(null)).toBe('');
    expect(formatarMoeda(undefined)).toBe('');
    expect(formatarMoeda(Number.NaN)).toBe('');
    expect(formatarMoeda('abc')).toBe('');
  });
});

describe('converterFormatoData', () => {
  it('converte ISO para BR por padrão', () => {
    expect(converterFormatoData('2026-08-12')).toBe('12/08/2026');
  });

  it('converte BR para ISO quando pedido', () => {
    expect(converterFormatoData('12/08/2026', 'ISO')).toBe('2026-08-12');
  });

  it('mantém o ISO quando o destino é ISO ou US', () => {
    expect(converterFormatoData('2026-08-12', 'ISO')).toBe('2026-08-12');
    // US não faz MM/DD/YYYY: devolve o próprio ISO
    expect(converterFormatoData('2026-08-12', 'US')).toBe('2026-08-12');
    expect(converterFormatoData('12/08/2026', 'US')).toBe('2026-08-12');
  });

  it('devolve o texto original quando não reconhece o formato', () => {
    expect(converterFormatoData('12 de agosto')).toBe('12 de agosto');
    expect(converterFormatoData('')).toBe('');
  });
});

describe('dataPorExtenso', () => {
  it('escreve a data em português, nos dois formatos de entrada', () => {
    expect(dataPorExtenso('2026-08-12')).toBe('12 de agosto de 2026');
    expect(dataPorExtenso('12/08/2026')).toBe('12 de agosto de 2026');
    expect(dataPorExtenso('01/03/2026')).toBe('1 de março de 2026');
  });

  it('aceita Date', () => {
    expect(dataPorExtenso(new Date(2026, 0, 5))).toBe('5 de janeiro de 2026');
  });

  it('devolve vazio para valor vazio ou inválido', () => {
    expect(dataPorExtenso('')).toBe('');
    expect(dataPorExtenso(null)).toBe('');
    expect(dataPorExtenso('não é data')).toBe('');
  });
});

describe('numeroPorExtenso', () => {
  it('escreve unidades, dezenas e centenas', () => {
    expect(numeroPorExtenso(0)).toBe('zero');
    expect(numeroPorExtenso(1)).toBe('um');
    expect(numeroPorExtenso(15)).toBe('quinze');
    expect(numeroPorExtenso(21)).toBe('vinte e um');
    expect(numeroPorExtenso(100)).toBe('cem');
    expect(numeroPorExtenso(101)).toBe('cento e um');
    expect(numeroPorExtenso(123)).toBe('cento e vinte e três');
  });

  it('escreve milhares, milhões, bilhões e trilhões', () => {
    expect(numeroPorExtenso(1000)).toBe('mil');
    expect(numeroPorExtenso(1001)).toBe('mil e um');
    expect(numeroPorExtenso(1500)).toBe('mil e quinhentos');
    expect(numeroPorExtenso(100000)).toBe('cem mil');
    expect(numeroPorExtenso(1000000)).toBe('um milhão');
    expect(numeroPorExtenso(2000000)).toBe('dois milhões');
    expect(numeroPorExtenso(1000100)).toBe('um milhão e cem');
    expect(numeroPorExtenso(1000000000)).toBe('um bilhão');
    expect(numeroPorExtenso(1000000000000)).toBe('um trilhão');
  });

  it('usa vírgula quando o último grupo não é centena exata nem menor que 100', () => {
    expect(numeroPorExtenso(1234)).toBe('mil, duzentos e trinta e quatro');
    expect(numeroPorExtenso(2234)).toBe('dois mil, duzentos e trinta e quatro');
  });

  it('trunca decimais e trata negativos', () => {
    expect(numeroPorExtenso(1.9)).toBe('um');
    expect(numeroPorExtenso(-5)).toBe('menos cinco');
  });

  it('usa a forma feminina quando numDois é falso', () => {
    expect(numeroPorExtenso(2, false)).toBe('duas');
    expect(numeroPorExtenso(2002, false)).toBe('duas mil e duas');
  });

  it('devolve vazio para valor vazio ou não numérico', () => {
    expect(numeroPorExtenso('')).toBe('');
    expect(numeroPorExtenso(null)).toBe('');
    expect(numeroPorExtenso('abc')).toBe('');
  });
});

describe('parseNumeroMoeda', () => {
  it('aceita número e texto com vírgula decimal', () => {
    expect(parseNumeroMoeda(10.5)).toBe(10.5);
    expect(parseNumeroMoeda('1.234,56')).toBe(1234.56);
    expect(parseNumeroMoeda('0,10')).toBe(0.1);
    expect(parseNumeroMoeda('11000,23')).toBe(11000.23);
    expect(parseNumeroMoeda(' 10 ')).toBe(10);
  });

  it('sem vírgula, trata o ponto como decimal', () => {
    expect(parseNumeroMoeda('1234.56')).toBe(1234.56);
    // "1.234" sem vírgula é lido como mil e duzentos e trinta e quatro milésimos
    expect(parseNumeroMoeda('1.234')).toBe(1.234);
  });

  it('devolve NaN para vazio ou não numérico', () => {
    expect(Number.isNaN(parseNumeroMoeda(''))).toBe(true);
    expect(Number.isNaN(parseNumeroMoeda(null))).toBe(true);
    expect(Number.isNaN(parseNumeroMoeda(undefined))).toBe(true);
    expect(Number.isNaN(parseNumeroMoeda('abc'))).toBe(true);
    expect(Number.isNaN(parseNumeroMoeda(Number.NaN))).toBe(true);
  });
});

describe('moedaPorExtenso', () => {
  it('escreve reais e centavos', () => {
    expect(moedaPorExtenso(1)).toBe('um real');
    expect(moedaPorExtenso(10)).toBe('dez reais');
    expect(moedaPorExtenso(1.01)).toBe('um real e um centavo');
    expect(moedaPorExtenso(2.5)).toBe('dois reais e cinquenta centavos');
    expect(moedaPorExtenso(0.005)).toBe('um centavo');
  });

  it('trata zero, milhão redondo e texto mascarado sem o prefixo R$', () => {
    expect(moedaPorExtenso(0)).toBe('zero reais');
    expect(moedaPorExtenso(1000000)).toBe('um milhão de reais');
    expect(moedaPorExtenso(2000000)).toBe('dois milhões de reais');
    // O R$ fica no texto do template, não no valor do campo: com prefixo, não converte.
    expect(moedaPorExtenso('R$ 10,00')).toBe('');
    expect(moedaPorExtenso('10,00')).toBe('dez reais');
    expect(moedaPorExtenso('1.234,56')).toBe(
      'mil, duzentos e trinta e quatro reais e cinquenta e seis centavos'
    );
  });

  it('documenta a divergência com o filtro moeda: centavos x reais', () => {
    // O filtro `moeda` (máscara) interpreta o texto digitado sem separador como centavos…
    expect(formatarMoeda('123456')).toBe('1.234,56');
    // …enquanto moedaPorExtenso interpreta o mesmo texto como reais.
    expect(moedaPorExtenso('123456')).toBe(
      'cento e vinte e três mil, quatrocentos e cinquenta e seis reais'
    );
  });

  it('devolve vazio para valor vazio, inválido ou negativo', () => {
    expect(moedaPorExtenso('')).toBe('');
    expect(moedaPorExtenso(null)).toBe('');
    expect(moedaPorExtenso('abc')).toBe('');
    expect(moedaPorExtenso(-1)).toBe('');
  });
});

describe('converterParaRomano', () => {
  it('converte de 1 a 3999 com as subtrações', () => {
    expect(converterParaRomano(1)).toBe('I');
    expect(converterParaRomano(4)).toBe('IV');
    expect(converterParaRomano(12)).toBe('XII');
    expect(converterParaRomano(1990)).toBe('MCMXC');
    expect(converterParaRomano(3999)).toBe('MMMCMXCIX');
    expect(converterParaRomano('12')).toBe('XII');
  });

  it('trunca decimais', () => {
    expect(converterParaRomano(1.9)).toBe('I');
  });

  it('devolve vazio para zero, negativo ou não numérico', () => {
    expect(converterParaRomano(0)).toBe('');
    expect(converterParaRomano(-3)).toBe('');
    expect(converterParaRomano('abc')).toBe('');
    expect(converterParaRomano(null)).toBe('');
  });
});
