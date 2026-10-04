import { describe, expect, it } from 'vitest';
import { calcularProximoNumero } from './numbering';
import type { NumberingContext } from '../types';

/**
 * Contexto mínimo observável: o hook do renderizador só usa `prefixo` (número da seção),
 * `next`/`subNext`/`subSubNext` (sementes vindas do Word) e os `lastLevel*Number`
 * (contexto reidratado). Os demais campos entram preenchidos para o tipo fechar.
 */
function ctx(over: Partial<NumberingContext> = {}): NumberingContext {
  return {
    prefixo: '',
    next: 1,
    lastNumber: '',
    habilitado: true,
    numerarBlocos: true,
    ...over,
  };
}

describe('calcularProximoNumero — nível de seção', () => {
  it('numera sem prefixo quando não há seção', () => {
    const c = ctx();
    expect(calcularProximoNumero(c, 2, 2)).toBe('1');
    expect(calcularProximoNumero(c, 2, 2)).toBe('2');
    expect(calcularProximoNumero(c, 2, 2)).toBe('3');
  });

  it('prefixa com o número da seção quando há seção aberta', () => {
    const c = ctx({ prefixo: '2', next: 1 });
    expect(calcularProximoNumero(c, 2, 2)).toBe('2.1');
    expect(calcularProximoNumero(c, 2, 2)).toBe('2.2');
  });

  it('sincroniza next/lastNumber no contexto a cada número emitido', () => {
    const c = ctx();
    calcularProximoNumero(c, 2, 2);
    expect(c.next).toBe(2);
    expect(c.lastNumber).toBe('1');
    expect(c.levelCounters?.[2]).toBe(2);
    expect(c.levelNumbers?.[2]).toBe('1');
  });
});

describe('calcularProximoNumero — hierarquia', () => {
  it('desce para o nível abaixo usando o último número do pai', () => {
    const c = ctx();
    expect(calcularProximoNumero(c, 2, 2)).toBe('1');
    // effectiveNivel 3 com nivel 2 => nível relativo 3 => filho do "1"
    expect(calcularProximoNumero(c, 3, 2)).toBe('1.1');
    expect(calcularProximoNumero(c, 3, 2)).toBe('1.2');
  });

  it('voltar ao nível de cima reinicia os contadores dos níveis mais profundos', () => {
    const c = ctx();
    calcularProximoNumero(c, 2, 2); // 1
    expect(calcularProximoNumero(c, 3, 2)).toBe('1.1');
    expect(calcularProximoNumero(c, 2, 2)).toBe('2');
    // o filho do novo "2" começa do a, não continua de 1.2
    expect(calcularProximoNumero(c, 3, 2)).toBe('2.1');
    expect(c.levelCounters?.[3]).toBe(2);
  });

  it('sintetiza os pais que faltam com .1 quando o nível salta', () => {
    const c = ctx();
    // effectiveNivel 4 com nivel 2 => relativo 4, sem pai registrado
    expect(calcularProximoNumero(c, 4, 2)).toBe('1.1');
    const comPrefixo = ctx({ prefixo: '3' });
    expect(calcularProximoNumero(comPrefixo, 4, 2)).toBe('3.1.1.1');
  });

  it('limita o nível relativo entre 2 e 8', () => {
    const raso = ctx();
    // efetivo 1 e nivel 5 daria -2: cai no nível de seção
    expect(calcularProximoNumero(raso, 1, 5)).toBe('1');

    const fundo = ctx({ prefixo: '2' });
    // efetivo 20 daria 21: cai no teto 8 (prefixo + 6 níveis preenchidos + o atual)
    expect(calcularProximoNumero(fundo, 20, 1)).toBe('2.1.1.1.1.1.1.1');
  });
});

describe('calcularProximoNumero — contexto reidratado', () => {
  it('usa lastLevel2Number como pai quando o contexto vem do Word', () => {
    const c = ctx({ lastLevel2Number: '7' });
    expect(calcularProximoNumero(c, 3, 2)).toBe('7.1');
  });

  it('usa next como semente do contador quando o contexto vem do Word', () => {
    const c = ctx({ prefixo: '1', next: 5 });
    expect(calcularProximoNumero(c, 2, 2)).toBe('1.5');
    // Sem semente para o nível 3, o filho do primeiro pai do nível 2 começa em 1.
    expect(calcularProximoNumero(c, 3, 2)).toBe('1.5.1');
  });

  it('usa subNext como semente quando o primeiro número é de nível mais fundo', () => {
    const c = ctx({ prefixo: '1', subNext: 3 });
    expect(calcularProximoNumero(c, 3, 2)).toBe('1.1.3');
  });

  it('não descarta a semente subNext antes de o nível ser emitido', () => {
    const c = ctx({ prefixo: '1', next: 5, subNext: 3 });

    expect(calcularProximoNumero(c, 2, 2)).toBe('1.5');
    // O nível 3 ainda não foi emitido: a semente 3 vinda do Word continua valendo, mesmo
    // depois de o número de nível 2 ter reiniciado os contadores mais profundos.
    expect(calcularProximoNumero(c, 3, 2)).toBe('1.5.3');
    expect(calcularProximoNumero(c, 3, 2)).toBe('1.5.4');
    // Consumida a semente, o filho do novo pai do nível 2 recomeça em 1.
    expect(calcularProximoNumero(c, 2, 2)).toBe('1.6');
    expect(calcularProximoNumero(c, 3, 2)).toBe('1.6.1');
  });

  it('não descarta a semente subSubNext antes de o nível ser emitido', () => {
    const c = ctx({ prefixo: '1', next: 5, subNext: 3, subSubNext: 2 });

    expect(calcularProximoNumero(c, 2, 2)).toBe('1.5');
    expect(calcularProximoNumero(c, 4, 2)).toBe('1.5.1.2');
  });
});
