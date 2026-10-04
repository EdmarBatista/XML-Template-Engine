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

// Tabelas transcritas do arquivo de referência do projeto para escrita de numerais e valores
// monetários por extenso (.reasonix/attachments/clipboard-20261004-062937.201357-000002.md):
// sem vírgula entre as classes numéricas, com " e " onde a estrutura do número exigir.
const NUMEROS_UNIDADES_A_CENTENAS: Array<[number, string]> = [
  [0, 'zero'], [1, 'um'], [2, 'dois'], [9, 'nove'], [10, 'dez'], [11, 'onze'], [20, 'vinte'],
  [21, 'vinte e um'], [99, 'noventa e nove'], [100, 'cem'], [101, 'cento e um'], [110, 'cento e dez'],
  [121, 'cento e vinte e um'], [200, 'duzentos'], [201, 'duzentos e um'],
  [234, 'duzentos e trinta e quatro'], [500, 'quinhentos'], [999, 'novecentos e noventa e nove'],
];

const NUMEROS_MILHAR: Array<[number, string]> = [
  [1000, 'mil'], [1001, 'mil e um'], [1010, 'mil e dez'], [1021, 'mil e vinte e um'], [1100, 'mil e cem'],
  [1101, 'mil cento e um'], [1110, 'mil cento e dez'], [1200, 'mil e duzentos'], [1201, 'mil duzentos e um'],
  [1234, 'mil duzentos e trinta e quatro'], [1500, 'mil e quinhentos'], [2000, 'dois mil'],
  [2001, 'dois mil e um'], [2010, 'dois mil e dez'], [2100, 'dois mil e cem'], [2101, 'dois mil cento e um'],
  [2200, 'dois mil e duzentos'], [2345, 'dois mil trezentos e quarenta e cinco'],
  [2500, 'dois mil e quinhentos'], [2501, 'dois mil quinhentos e um'],
  [9999, 'nove mil novecentos e noventa e nove'], [10000, 'dez mil'], [10001, 'dez mil e um'],
  [10100, 'dez mil e cem'], [10500, 'dez mil e quinhentos'],
  [12345, 'doze mil trezentos e quarenta e cinco'],
  [99999, 'noventa e nove mil novecentos e noventa e nove'], [100000, 'cem mil'], [100001, 'cem mil e um'],
  [100100, 'cem mil e cem'], [101000, 'cento e um mil'],
  [123456, 'cento e vinte e três mil quatrocentos e cinquenta e seis'],
  [999999, 'novecentos e noventa e nove mil novecentos e noventa e nove'],
];

const NUMEROS_MILHAO_E_ACIMA: Array<[number, string]> = [
  [1000000, 'um milhão'], [1000001, 'um milhão e um'], [1000100, 'um milhão e cem'],
  [1001000, 'um milhão e mil'], [1001001, 'um milhão e mil e um'],
  [1234000, 'um milhão duzentos e trinta e quatro mil'],
  [1234567, 'um milhão duzentos e trinta e quatro mil quinhentos e sessenta e sete'],
  [2000000, 'dois milhões'], [2000100, 'dois milhões e cem'], [2500000, 'dois milhões e quinhentos mil'],
  [9999999, 'nove milhões novecentos e noventa e nove mil novecentos e noventa e nove'],
  [100000000, 'cem milhões'], [1000000000, 'um bilhão'], [2000000000, 'dois bilhões'],
  [1234567890, 'um bilhão duzentos e trinta e quatro milhões quinhentos e sessenta e sete mil oitocentos e noventa'],
];

const TODOS_OS_NUMEROS = [...NUMEROS_UNIDADES_A_CENTENAS, ...NUMEROS_MILHAR, ...NUMEROS_MILHAO_E_ACIMA];

describe('numeroPorExtenso', () => {
  it('escreve unidades, dezenas e centenas', () => {
    for (const [entrada, esperado] of NUMEROS_UNIDADES_A_CENTENAS) {
      expect(numeroPorExtenso(entrada), `numeroPorExtenso(${entrada})`).toBe(esperado);
    }
  });

  it('escreve o milhar', () => {
    for (const [entrada, esperado] of NUMEROS_MILHAR) {
      expect(numeroPorExtenso(entrada), `numeroPorExtenso(${entrada})`).toBe(esperado);
    }
  });

  it('escreve milhão, milhões e bilhão', () => {
    for (const [entrada, esperado] of NUMEROS_MILHAO_E_ACIMA) {
      expect(numeroPorExtenso(entrada), `numeroPorExtenso(${entrada})`).toBe(esperado);
    }
  });

  it('não usa vírgula para separar classes numéricas (regressão principal do .md)', () => {
    for (const [entrada] of TODOS_OS_NUMEROS) {
      expect(numeroPorExtenso(entrada), `numeroPorExtenso(${entrada})`).not.toContain(',');
    }
    // os casos que antes saíam com vírgula
    expect(numeroPorExtenso(1234)).toBe('mil duzentos e trinta e quatro');
    expect(numeroPorExtenso(2234)).toBe('dois mil duzentos e trinta e quatro');
    expect(numeroPorExtenso(1234567)).toBe(
      'um milhão duzentos e trinta e quatro mil quinhentos e sessenta e sete'
    );
  });

  it('trunca decimais e trata negativos', () => {
    expect(numeroPorExtenso(1.9)).toBe('um');
    expect(numeroPorExtenso(-5)).toBe('menos cinco');
  });

  it('escreve trilhão e mantém números fora das tabelas', () => {
    expect(numeroPorExtenso(1000000000000)).toBe('um trilhão');
    expect(numeroPorExtenso(15)).toBe('quinze');
    expect(numeroPorExtenso(123)).toBe('cento e vinte e três');
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

  it('ignora o símbolo da moeda (valor copiado do texto do documento)', () => {
    expect(parseNumeroMoeda('R$ 1.234,56')).toBe(1234.56);
    expect(parseNumeroMoeda('R$ 10,00')).toBe(10);
    expect(parseNumeroMoeda('R$ 10')).toBe(10);
  });

  it('devolve NaN para vazio ou não numérico', () => {
    expect(Number.isNaN(parseNumeroMoeda(''))).toBe(true);
    expect(Number.isNaN(parseNumeroMoeda(null))).toBe(true);
    expect(Number.isNaN(parseNumeroMoeda(undefined))).toBe(true);
    expect(Number.isNaN(parseNumeroMoeda('abc'))).toBe(true);
    expect(Number.isNaN(parseNumeroMoeda(Number.NaN))).toBe(true);
  });
});

const MOEDA_REAIS_E_CENTAVOS: Array<[number, string]> = [
  [0, 'zero reais'], [1, 'um real'], [2, 'dois reais'], [0.01, 'zero reais e um centavo'],
  [1.01, 'um real e um centavo'], [1.5, 'um real e cinquenta centavos'], [10, 'dez reais'],
  [10.1, 'dez reais e dez centavos'], [21.3, 'vinte e um reais e trinta centavos'], [100, 'cem reais'],
  [101.05, 'cento e um reais e cinco centavos'],
  [234.56, 'duzentos e trinta e quatro reais e cinquenta e seis centavos'],
  [999.99, 'novecentos e noventa e nove reais e noventa e nove centavos'],
];

const MOEDA_MILHARES: Array<[number, string]> = [
  [1000, 'mil reais'], [1001, 'mil e um reais'], [1010, 'mil e dez reais'], [1100, 'mil e cem reais'],
  [1234, 'mil duzentos e trinta e quatro reais'],
  [1234.56, 'mil duzentos e trinta e quatro reais e cinquenta e seis centavos'],
  [1500, 'mil e quinhentos reais'], [2500, 'dois mil e quinhentos reais'],
  [2501, 'dois mil quinhentos e um reais'],
  [9999.99, 'nove mil novecentos e noventa e nove reais e noventa e nove centavos'],
  [10000, 'dez mil reais'], [10001.01, 'dez mil e um reais e um centavo'],
  [10500, 'dez mil e quinhentos reais'],
  [12345.67, 'doze mil trezentos e quarenta e cinco reais e sessenta e sete centavos'],
  [100000, 'cem mil reais'], [100100.1, 'cem mil e cem reais e dez centavos'],
  [123456.78, 'cento e vinte e três mil quatrocentos e cinquenta e seis reais e setenta e oito centavos'],
];

const MOEDA_MILHOES: Array<[number, string]> = [
  [1000000, 'um milhão de reais'], [1000000.01, 'um milhão de reais e um centavo'],
  [1000001, 'um milhão e um reais'], [1200000, 'um milhão e duzentos mil reais'],
  [1234567.89, 'um milhão duzentos e trinta e quatro mil quinhentos e sessenta e sete reais e oitenta e nove centavos'],
  [2000000, 'dois milhões de reais'], [2500000, 'dois milhões e quinhentos mil reais'],
  [10000000, 'dez milhões de reais'],
];

const MOEDA_TEXTO_BRASILEIRO: Array<[string, string]> = [
  ['1,00', 'um real'], ['10,50', 'dez reais e cinquenta centavos'], ['1.000,00', 'mil reais'],
  ['1.001,01', 'mil e um reais e um centavo'],
  ['1.234,56', 'mil duzentos e trinta e quatro reais e cinquenta e seis centavos'],
  ['2.500,00', 'dois mil e quinhentos reais'],
  ['12.345,67', 'doze mil trezentos e quarenta e cinco reais e sessenta e sete centavos'],
  ['100.000,00', 'cem mil reais'],
  ['123.456,78', 'cento e vinte e três mil quatrocentos e cinquenta e seis reais e setenta e oito centavos'],
  ['1.000.000,00', 'um milhão de reais'],
  ['1.234.567,89', 'um milhão duzentos e trinta e quatro mil quinhentos e sessenta e sete reais e oitenta e nove centavos'],
];

const TODOS_OS_VALORES_DE_MOEDA: Array<[number, string]> = [
  ...MOEDA_REAIS_E_CENTAVOS,
  ...MOEDA_MILHARES,
  ...MOEDA_MILHOES,
];

describe('moedaPorExtenso', () => {
  it('escreve reais e centavos, com singular e plural', () => {
    for (const [entrada, esperado] of MOEDA_REAIS_E_CENTAVOS) {
      expect(moedaPorExtenso(entrada), `moedaPorExtenso(${entrada})`).toBe(esperado);
    }
  });

  it('escreve os milhares (casos críticos da vírgula)', () => {
    for (const [entrada, esperado] of MOEDA_MILHARES) {
      expect(moedaPorExtenso(entrada), `moedaPorExtenso(${entrada})`).toBe(esperado);
    }
  });

  it('escreve os milhões, usando "de reais" no milhão redondo', () => {
    for (const [entrada, esperado] of MOEDA_MILHOES) {
      expect(moedaPorExtenso(entrada), `moedaPorExtenso(${entrada})`).toBe(esperado);
    }
  });

  it('aceita o valor escrito no formato brasileiro', () => {
    for (const [entrada, esperado] of MOEDA_TEXTO_BRASILEIRO) {
      expect(moedaPorExtenso(entrada), `moedaPorExtenso("${entrada}")`).toBe(esperado);
    }
  });

  it('não usa vírgula no extenso do valor', () => {
    for (const [entrada] of TODOS_OS_VALORES_DE_MOEDA) {
      expect(moedaPorExtenso(entrada), `moedaPorExtenso(${entrada})`).not.toContain(',');
    }
    // o caso que antes saía com vírgula
    expect(moedaPorExtenso(1234.56)).toBe(
      'mil duzentos e trinta e quatro reais e cinquenta e seis centavos'
    );
    expect(moedaPorExtenso('1.234.567,89')).toBe(
      'um milhão duzentos e trinta e quatro mil quinhentos e sessenta e sete reais e oitenta e nove centavos'
    );
  });

  it('começa por "zero reais" quando não há reais inteiros', () => {
    expect(moedaPorExtenso(0.01)).toBe('zero reais e um centavo');
    expect(moedaPorExtenso(0.005)).toBe('zero reais e um centavo');
    expect(moedaPorExtenso('0,10')).toBe('zero reais e dez centavos');
  });

  it('aceita o valor com o prefixo R$ (copiado do texto do documento)', () => {
    expect(moedaPorExtenso('R$ 10,00')).toBe('dez reais');
    expect(moedaPorExtenso('R$ 1.234,56')).toBe(
      'mil duzentos e trinta e quatro reais e cinquenta e seis centavos'
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
