// @vitest-environment jsdom
// parseNumbering lê word/numbering.xml com DOMParser; as demais funções são puras.

import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { computeNextNumber, formatNumber, parseNumbering, toLetter, toRoman } from './numbering';
import type { NumberingState } from './numbering';

describe('toRoman', () => {
  it('converte os casos básicos e as subtrações', () => {
    expect(toRoman(1)).toBe('I');
    expect(toRoman(4)).toBe('IV');
    expect(toRoman(9)).toBe('IX');
    expect(toRoman(14)).toBe('XIV');
    expect(toRoman(40)).toBe('XL');
    expect(toRoman(90)).toBe('XC');
    expect(toRoman(1990)).toBe('MCMXC');
    expect(toRoman(3999)).toBe('MMMCMXCIX');
  });

  it('devolve o próprio número fora da faixa de romanos', () => {
    expect(toRoman(0)).toBe('0');
    expect(toRoman(-3)).toBe('-3');
    expect(toRoman(4000)).toBe('4000');
  });
});

describe('toLetter', () => {
  it('converte para letras, virando duas letras depois do Z', () => {
    expect(toLetter(1)).toBe('A');
    expect(toLetter(26)).toBe('Z');
    expect(toLetter(27)).toBe('AA');
    expect(toLetter(52)).toBe('AZ');
    expect(toLetter(53)).toBe('BA');
  });

  it('devolve o próprio número quando não é positivo', () => {
    expect(toLetter(0)).toBe('0');
  });
});

describe('formatNumber', () => {
  it('aplica o formato pedido pelo Word', () => {
    expect(formatNumber(3, 'decimal')).toBe('3');
    expect(formatNumber(3, 'lowerLetter')).toBe('c');
    expect(formatNumber(3, 'upperLetter')).toBe('C');
    expect(formatNumber(3, 'lowerRoman')).toBe('iii');
    expect(formatNumber(3, 'upperRoman')).toBe('III');
    expect(formatNumber(3, 'bullet')).toBe('•');
  });

  it('cai no decimal para formato desconhecido', () => {
    expect(formatNumber(3, 'ordinalText')).toBe('3');
    expect(formatNumber(3, '')).toBe('3');
  });
});

describe('computeNextNumber — contadores por nível', () => {
  function estado(over: Partial<NumberingState> = {}): NumberingState {
    return {
      abstractNumId: '1',
      levels: {
        '0': { start: 1, numFmt: 'decimal', lvlText: '%1.' },
        '1': { start: 1, numFmt: 'lowerLetter', lvlText: '%1.%2)' },
      },
      counters: { '0': 0, '1': 0 },
      overrides: {},
      ...over,
    };
  }

  const mapa = (state: NumberingState) => new Map([['7', state]]);

  it('devolve vazio para numId ou nível inexistente', () => {
    expect(computeNextNumber(new Map(), '7', '0')).toBe('');
    expect(computeNextNumber(mapa(estado()), '7', '9')).toBe('');
  });

  it('incrementa o nível pedido e monta o lvlText', () => {
    const m = mapa(estado());
    expect(computeNextNumber(m, '7', '0')).toBe('1.');
    expect(computeNextNumber(m, '7', '0')).toBe('2.');
  });

  it('substitui todos os placeholders %N do nível atual', () => {
    const m = mapa(estado());
    computeNextNumber(m, '7', '0');
    computeNextNumber(m, '7', '0');
    expect(computeNextNumber(m, '7', '1')).toBe('2.a)');
  });

  it('voltar a um nível superior reinicia os contadores mais profundos', () => {
    const m = mapa(estado());
    computeNextNumber(m, '7', '0'); // 1.
    computeNextNumber(m, '7', '1'); // 1.a)
    computeNextNumber(m, '7', '0'); // 2. (e zera o nível 1)
    // o pai agora é 2, mas a letra voltou ao começo em vez de continuar de b
    expect(computeNextNumber(m, '7', '1')).toBe('2.a)');
  });

  it('usa start - 1 como base do contador', () => {
    const m = mapa(estado({ levels: { '0': { start: 3, numFmt: 'decimal', lvlText: '%1.' } }, counters: { '0': 2 } }));
    expect(computeNextNumber(m, '7', '0')).toBe('3.');
  });

  it('aplica startOverride só na primeira vez do documento', () => {
    const st = estado({ overrides: { '0': 5 } });
    const m = mapa(st);
    expect(computeNextNumber(m, '7', '0')).toBe('5.');
    // o override já foi consumido: a segunda emissão segue a contagem normal
    expect(computeNextNumber(m, '7', '0')).toBe('6.');
  });

  it('devolve string vazia quando o nível não tem lvlText', () => {
    const m = mapa(estado({ levels: { '0': { start: 1, numFmt: 'bullet', lvlText: '' } }, counters: { '0': 0 } }));
    expect(computeNextNumber(m, '7', '0')).toBe('');
  });
});

describe('parseNumbering — leitura do word/numbering.xml', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl>
    <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%2)"/></w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0"><w:start w:val="4"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="10"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="11"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="12">
    <w:abstractNumId w:val="1"/>
    <w:lvlOverride w:ilvl="0"><w:startOverride w:val="7"/></w:lvlOverride>
  </w:num>
</w:numbering>`;

  async function ler() {
    const zip = new JSZip();
    zip.file('word/numbering.xml', xml);
    return parseNumbering(zip);
  }

  it('devolve mapa vazio quando não existe numbering.xml', async () => {
    const mapa = await parseNumbering(new JSZip());
    expect(mapa.size).toBe(0);
  });

  it('lê níveis, formato e texto de cada abstractNum', async () => {
    const mapa = await ler();
    const estado = mapa.get('10')!;
    expect(estado.abstractNumId).toBe('0');
    expect(estado.levels['0']).toEqual({ start: 1, numFmt: 'decimal', lvlText: '%1.' });
    expect(estado.levels['1']).toEqual({ start: 1, numFmt: 'lowerRoman', lvlText: '%2)' });
  });

  it('compartilha os contadores entre numIds do mesmo abstractNumId', async () => {
    const mapa = await ler();
    expect(mapa.get('10')!.counters).toBe(mapa.get('11')!.counters);
    // contadores começam em start - 1
    expect(mapa.get('10')!.counters).toEqual({ '0': 0, '1': 0 });
  });

  it('lê o startOverride de cada numId sem contaminar o outro', async () => {
    const mapa = await ler();
    expect(mapa.get('12')!.overrides).toEqual({ '0': 7 });
    expect(mapa.get('10')!.overrides).toEqual({});
    expect(mapa.get('12')!.counters).toEqual({ '0': 3 });
  });
});
