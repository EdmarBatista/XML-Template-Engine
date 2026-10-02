import { describe, expect, it } from 'vitest';
import { aplicarMascaraCampo, normalizarValorCampo } from './mascaras';

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

  it('trata vazio como vazio, não como zero', () => {
    expect(normalizarValorCampo('', 'moeda')).toBe('');
    expect(normalizarValorCampo(null, 'cpf')).toBe('');
  });

  it('devolve o valor intacto quando o tipo não tem normalização', () => {
    expect(normalizarValorCampo('valor livre', 'texto')).toBe('valor livre');
  });
});
