import { describe, expect, it } from 'vitest';
import { DocxBlock, DocxParagraph, TextRun } from './ast';
import { generateXmlFromAst } from './generator';

/**
 * Conta tags de fechamento sem a abertura correspondente. É o efeito visível do bug de
 * P1: o limpador de prefixo consumia a tag de abertura e deixava o `</i>` órfão, o que
 * gerava XML que o DOMParser rejeitava.
 */
function tagsOrfas(xml: string, tag: string): number {
  const abre = (xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>`, 'g')) || []).length;
  const fecha = (xml.match(new RegExp(`</${tag}>`, 'g')) || []).length;
  return fecha - abre;
}

function paragrafo(runs: TextRun[], extra: Partial<DocxParagraph> = {}): DocxParagraph {
  return { type: 'p', runs, ...extra };
}

function gerar(blocks: DocxBlock[]): string {
  return generateXmlFromAst(blocks, 'teste.docx').xml;
}

describe('limpeza de prefixo numérico não deixa tag inline órfã', () => {
  it('remove "1. " de parágrafo preservando o <i> que abre o trecho', () => {
    const xml = gerar([paragrafo([{ text: '1. texto do parágrafo', i: true }], { isNumbered: true })]);

    expect(xml).toContain('<p><i>texto do parágrafo</i></p>');
    // Forma órfã: a tag de abertura foi consumida junto com o prefixo.
    expect(xml).not.toContain('<p>texto do parágrafo</i></p>');
    expect(tagsOrfas(xml, 'i')).toBe(0);
  });

  it('remove "a) " de item de lista preservando o <i> que abre o trecho', () => {
    const xml = gerar([
      paragrafo([{ text: 'a) item de lista', i: true }], {
        type: 'li',
        numFmt: 'bullet',
        numeroWord: '•',
      }),
    ]);

    expect(xml).toContain('<item><i>item de lista</i></item>');
    expect(xml).not.toContain('<item>item de lista</i></item>');
    expect(tagsOrfas(xml, 'i')).toBe(0);
  });

  it('remove prefixo hierárquico de parágrafo sem tags', () => {
    const xml = gerar([paragrafo([{ text: '1.1.2. texto simples' }], { isNumbered: true })]);

    expect(xml).toContain('<p>texto simples</p>');
  });

  it('não altera o texto quando não há prefixo a remover', () => {
    const xml = gerar([paragrafo([{ text: 'Texto sem numeração', i: true }], { isNumbered: true })]);

    expect(xml).toContain('<p><i>Texto sem numeração</i></p>');
    expect(tagsOrfas(xml, 'i')).toBe(0);
  });

  it('mantém balanceadas várias tags inline no mesmo trecho', () => {
    const xml = gerar([
      paragrafo(
        [
          { text: '1. ', b: true },
          { text: 'negrito', b: true, i: true },
          { text: ' e final', u: true },
        ],
        { isNumbered: true }
      ),
    ]);

    expect(tagsOrfas(xml, 'b')).toBe(0);
    expect(tagsOrfas(xml, 'i')).toBe(0);
    expect(tagsOrfas(xml, 'u')).toBe(0);
  });
});
