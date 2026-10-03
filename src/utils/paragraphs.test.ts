import { describe, expect, it } from 'vitest';
import { dividirEmLinhas } from './paragraphs';
import type { AstNode } from '../types';

const texto = (t: string): AstNode => ({ tipo: 'texto', texto: t });

describe('dividirEmLinhas — quebra de linha vira parágrafo', () => {
  it('devolve lista vazia para entrada vazia', () => {
    expect(dividirEmLinhas([])).toEqual([]);
    expect(dividirEmLinhas(undefined as unknown as AstNode[])).toEqual([]);
  });

  it('mantém um único grupo quando não há quebra', () => {
    expect(dividirEmLinhas([texto('linha única')])).toEqual([[texto('linha única')]]);
  });

  it('quebra a cada \\n do texto', () => {
    expect(dividirEmLinhas([texto('primeira\nsegunda\nterceira')])).toEqual([
      [texto('primeira')],
      [texto('segunda')],
      [texto('terceira')],
    ]);
  });

  it('quebra também no nó <br> e descarta o próprio br', () => {
    const nos: AstNode[] = [texto('antes'), { tipo: 'br' }, texto('depois')];
    expect(dividirEmLinhas(nos)).toEqual([[texto('antes')], [texto('depois')]]);
  });

  it('remove a indentação que sobrou no começo da nova linha', () => {
    expect(dividirEmLinhas([texto('a\n    b')])).toEqual([[texto('a')], [texto('b')]]);
  });

  it('ignora quebras sem conteúdo (no início, no fim ou seguidas)', () => {
    expect(dividirEmLinhas([texto('\na')])).toEqual([[texto('a')]]);
    expect(dividirEmLinhas([texto('a\n')])).toEqual([[texto('a')]]);
    expect(dividirEmLinhas([texto('a\n\n\nb')])).toEqual([[texto('a')], [texto('b')]]);
    expect(dividirEmLinhas([{ tipo: 'br' }, texto('a')])).toEqual([[texto('a')]]);
  });

  it('acumula nós inline diferentes na mesma linha', () => {
    const nos: AstNode[] = [
      texto('valor: '),
      { tipo: 'b', filhos: [texto('1.000')] },
      texto(' reais'),
    ];
    expect(dividirEmLinhas(nos)).toEqual([
      [texto('valor: '), { tipo: 'b', filhos: [texto('1.000')] }, texto(' reais')],
    ]);
  });

  it('quebra pelo valor quando o nó não tem texto, mantendo o valor original', () => {
    // O nó ganha `texto` com o trecho, mas o `valor` resolvido segue intacto.
    expect(dividirEmLinhas([{ tipo: 'texto', valor: 'a\nb' }])).toEqual([
      [{ tipo: 'texto', valor: 'a\nb', texto: 'a' }],
      [{ tipo: 'texto', valor: 'a\nb', texto: 'b' }],
    ]);
  });

  it('ignora nós nulos da lista', () => {
    const nos = [null as unknown as AstNode, texto('a')];
    expect(dividirEmLinhas(nos)).toEqual([[texto('a')]]);
  });
});
