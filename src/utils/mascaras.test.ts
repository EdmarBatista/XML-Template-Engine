import { describe, expect, it } from 'vitest';
import { aplicarFiltroDocumento, aplicarMascaraCampo, normalizarValorCampo } from './mascaras';
import type { ValorCampo } from '../types';

describe('aplicarMascaraCampo — valor exibido no campo', () => {
  it('formata CPF, CNPJ, CEP e telefone', () => {
    expect(aplicarMascaraCampo('12345678901', 'cpf')).toBe('123.456.789-01');
    expect(aplicarMascaraCampo('12345678000199', 'cnpj')).toBe('12.345.678/0001-99');
    expect(aplicarMascaraCampo('70000000', 'cep')).toBe('70000-000');
    expect(aplicarMascaraCampo('61999998888', 'telefone')).toBe('(61) 99999-8888');
  });

  it('formata moeda', () => {
    expect(aplicarMascaraCampo(1234.5, 'moeda')).toBe('1.234,50');
  });

  it('devolve o valor original quando não há tipo de máscara', () => {
    expect(aplicarMascaraCampo('texto livre', '')).toBe('texto livre');
    expect(aplicarMascaraCampo('texto livre', 'tipo-desconhecido')).toBe('texto livre');
  });

  it('nunca devolve nulo ou indefinido para um campo de texto', () => {
    expect(aplicarMascaraCampo(null, '')).toBe('');
    expect(aplicarMascaraCampo(undefined, 'tipo-desconhecido')).toBe('');
  });
});

describe('normalizarValorCampo — valor guardado no estado', () => {
  it('guarda apenas os dígitos de um documento', () => {
    expect(normalizarValorCampo('123.456.789-01', 'cpf')).toBe('12345678901');
    expect(normalizarValorCampo('70.000-000', 'cep')).toBe('70000000');
  });

  it('converte moeda para número, respeitando o separador brasileiro', () => {
    expect(normalizarValorCampo('1.234,56', 'moeda')).toBe(1234.56);
    expect(normalizarValorCampo('1234.56', 'moeda')).toBe(1234.56);
    expect(normalizarValorCampo(987.65, 'moeda')).toBe(987.65);
  });

  it('aceita o valor com o prefixo R$ (copiado do texto do documento)', () => {
    expect(normalizarValorCampo('R$ 1.234,56', 'moeda')).toBe(1234.56);
    expect(normalizarValorCampo('R$ 10', 'moeda')).toBe(10);
  });

  it('faz o campo da barra lateral e o documento mostrarem o mesmo número', () => {
    // O NumberFieldInput exibe `aplicarMascaraCampo(normalizarValorCampo(valor, 'moeda'), 'moeda')`
    // e o documento exibe `aplicarFiltroDocumento(valor, 'moeda')`. Os dois (e o extenso, que lê
    // o valor como reais) precisam concordar — antes, um valor em texto vindo de JSON divergia.
    const casos: ValorCampo[] = ['100', '123456', '1.234,56', 'R$ 1.234,56', 1234.56, '10,50', 0];

    for (const valor of casos) {
      const noCampo = aplicarMascaraCampo(normalizarValorCampo(valor, 'moeda'), 'moeda');
      const noDocumento = aplicarFiltroDocumento(valor, 'moeda');

      expect(noCampo, `campo × documento para ${JSON.stringify(valor)}`).toBe(noDocumento);
      expect(noCampo, `campo vazio para ${JSON.stringify(valor)}`).not.toBe('');
      expect(
        aplicarFiltroDocumento(valor, 'moedaPorExtenso'),
        `extenso vazio para ${JSON.stringify(valor)}`
      ).not.toBe('');
    }

    // Os casos que antes divergiam: o campo lia o texto "100" como centavos (1,00) enquanto o
    // documento lia como reais (100,00).
    expect(aplicarMascaraCampo(normalizarValorCampo('100', 'moeda'), 'moeda')).toBe('100,00');
    expect(aplicarMascaraCampo(normalizarValorCampo('123456', 'moeda'), 'moeda')).toBe('123.456,00');
    expect(aplicarFiltroDocumento('123456', 'moedaPorExtenso')).toBe(
      'cento e vinte e três mil quatrocentos e cinquenta e seis reais'
    );
  });

  it('trata vazio como vazio, não como zero', () => {
    expect(normalizarValorCampo('', 'moeda')).toBe('');
    expect(normalizarValorCampo(null, 'cpf')).toBe('');
  });

  it('devolve o valor intacto quando o tipo não tem normalização', () => {
    expect(normalizarValorCampo('valor livre', 'texto')).toBe('valor livre');
  });
});
