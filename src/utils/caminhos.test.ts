import { describe, expect, it } from 'vitest';
import { obterValorPorCaminho } from './caminhos';

const dados = {
  nome: 'Fulano',
  itens: [
    { nome: 'A', 'valor-total': '10' },
    { nome: 'B', 'valor-total': '20' },
    { nome: '' },
  ],
  etapas: { etapa: ['primeira', 'segunda'] },
  a: { b: { c: 'fundo' } },
  tabela: { coluna: 'objeto' },
  'chave.com.ponto': 'literal',
};

describe('obterValorPorCaminho — identificador simples e caminho pontuado', () => {
  it('resolve identificador simples', () => {
    expect(obterValorPorCaminho(dados, 'nome')).toBe('Fulano');
  });

  it('preserva a chave literal que contém ponto', () => {
    expect(obterValorPorCaminho(dados, 'chave.com.ponto')).toBe('literal');
  });

  it('resolve caminho com mais de um ponto', () => {
    expect(obterValorPorCaminho(dados, 'a.b.c')).toBe('fundo');
  });

  it('mantém a compatibilidade de tabela.coluna listando as linhas', () => {
    expect(obterValorPorCaminho(dados, 'itens.nome')).toBe('A, B');
    expect(obterValorPorCaminho(dados, 'itens.valor-total')).toBe('10, 20');
  });

  it('resolve a coluna de um objeto (não array)', () => {
    expect(obterValorPorCaminho(dados, 'tabela.coluna')).toBe('objeto');
  });
});

describe('obterValorPorCaminho — índice', () => {
  it('usa índice base 0 em tabela.coluna[n]', () => {
    expect(obterValorPorCaminho(dados, 'itens.nome[0]')).toBe('A');
    expect(obterValorPorCaminho(dados, 'itens.nome[1]')).toBe('B');
  });

  it('usa índice base 0 em tabela[n].coluna', () => {
    expect(obterValorPorCaminho(dados, 'itens[1].nome')).toBe('B');
  });

  it('aceita hífen no nome da coluna', () => {
    expect(obterValorPorCaminho(dados, 'itens.valor-total[1]')).toBe('20');
  });

  it('resolve índice no meio de caminho mais profundo', () => {
    expect(obterValorPorCaminho(dados, 'etapas.etapa[1]')).toBe('segunda');
  });

  it('devolve vazio para índice fora do intervalo', () => {
    expect(obterValorPorCaminho(dados, 'itens.nome[9]')).toBe('');
    expect(obterValorPorCaminho(dados, 'itens[9].nome')).toBe('');
  });
});
