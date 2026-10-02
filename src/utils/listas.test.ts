import { describe, expect, it } from 'vitest';
import { formatarItemForeach, valoresDaLista } from './listas';

describe('formatarItemForeach', () => {
  it('remove as aspas que envolvem o item', () => {
    expect(formatarItemForeach('"Pintura, de fogo"')).toBe('Pintura, de fogo');
    expect(formatarItemForeach("'Cimento'")).toBe('Cimento');
  });

  it('não mexe no que não está entre aspas', () => {
    expect(formatarItemForeach('  cimento  ')).toBe('cimento');
    expect(formatarItemForeach('areia')).toBe('areia');
  });

  it('devolve objetos como estão', () => {
    const objeto = { nome: 'item' };
    expect(formatarItemForeach(objeto)).toBe(objeto);
  });

  it('trata nulo e indefinido como vazio', () => {
    expect(formatarItemForeach(null)).toBe('');
    expect(formatarItemForeach(undefined)).toBe('');
  });
});

describe('valoresDaLista — separa itens de uma lista', () => {
  it('separa por vírgula, ignorando espaços em volta', () => {
    expect(valoresDaLista('areia, cimento, brita')).toEqual(['areia', 'cimento', 'brita']);
  });

  it('separa por quebra de linha', () => {
    expect(valoresDaLista('areia\ncimento\r\nbrita')).toEqual(['areia', 'cimento', 'brita']);
  });

  it('mantém a vírgula interna de um item entre aspas', () => {
    expect(valoresDaLista('"Pintura, de fogo", cimento')).toEqual(['Pintura, de fogo', 'cimento']);
  });

  it('aceita uma lista já em array', () => {
    expect(valoresDaLista(['areia', '"cimento"'])).toEqual(['areia', 'cimento']);
  });

  it('devolve lista vazia para entrada vazia', () => {
    expect(valoresDaLista('')).toEqual([]);
    expect(valoresDaLista(undefined)).toEqual([]);
  });
});
