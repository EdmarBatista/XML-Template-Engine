import { describe, expect, it } from 'vitest';
import { DocxBlock, DocxParagraph, DocxTableCell, DocxTable, TextRun } from './ast';
import { generateXmlFromAst } from './generator';

/**
 * Regras normativas do projeto (AGENTS.md e teste/README.md) aplicadas pelo gerador.
 * O gerador não usa DOM: monta blocos da AST e confere a saída.
 *
 *   REGRA 1 — <p> sempre puro: banido qualquer atributo (nivel=, numerado=false...)
 *   REGRA 7 — conectivos, fórmulas e notas não numeradas ficam em <secao numerar="false">
 *   REGRA DE OURO — nunca emitir numero="..." em <secao> (a numeração é calculada em tela)
 */

const par = (texto: string, extra: Partial<DocxParagraph> = {}): DocxParagraph => ({
  type: 'p',
  runs: [{ text: texto }],
  ...extra,
});

const head = (texto: string, extra: Partial<DocxParagraph> = {}): DocxParagraph => ({
  type: 'h',
  runs: [{ text: texto }],
  ...extra,
});

const item = (texto: string, extra: Partial<DocxParagraph> = {}): DocxParagraph => ({
  type: 'li',
  runs: [{ text: texto }],
  ...extra,
});

const celula = (texto: string, extra: Partial<DocxTableCell> = {}): DocxTableCell => ({
  blocks: texto ? [par(texto)] : [],
  ...extra,
});

const tabela = (linhas: DocxTableCell[][]): DocxTable => ({
  type: 'table',
  rows: linhas.map(cells => ({ cells })),
});

const xml = (blocks: DocxBlock[]): string => generateXmlFromAst(blocks, 'teste.docx').xml;

const contar = (texto: string, re: RegExp): number => (texto.match(re) || []).length;

/** Documento de referência: cobre título, seção numerada, conectivo, nota, anexo e lista. */
const DOCUMENTO: DocxBlock[] = [
  par('TERMO DE REFERÊNCIA', { isDocumentTitle: true }),
  head('1. DISPOSIÇÕES GERAIS', { isNumbered: true }),
  par('Objeto da contratação', { isNumbered: true }),
  par('OU'),
  par('Nota: valores estimados.'),
  head('ANEXO I - PLANILHA'),
  item('primeiro item', { numFmt: 'bullet', numeroWord: '•' }),
  item('segundo item', { numFmt: 'bullet', numeroWord: '•' }),
];

describe('REGRA 1 — <p> sempre puro, sem atributo nenhum', () => {
  it('não emite atributo em parágrafo numerado', () => {
    const saida = xml([head('1. OBJETO', { isNumbered: true }), par('texto numerado', { isNumbered: true })]);

    expect(saida).toContain('<p>texto numerado</p>');
    expect(saida).not.toMatch(/<p[^>]+\s/);
  });

  it('não emite nenhum <p> com atributo no documento inteiro', () => {
    const saida = xml(DOCUMENTO);

    expect(contar(saida, /<p[\s>]/g)).toBeGreaterThan(0);
    expect(saida).not.toMatch(/<p\s[^>]*>/);
  });
});

describe('REGRA DE OURO — <secao> nunca recebe numero=', () => {
  it('não emite numero= com títulos numerados, anexos e reinício', () => {
    const saida = xml([
      head('1. PRIMEIRA', { isNumbered: true }),
      par('conteúdo', { isNumbered: true }),
      head('2. SEGUNDA', { isNumbered: true, numeroWord: '2.' }),
      head('ANEXO I', {}),
    ]);

    expect(saida).not.toMatch(/<secao[^>]*numero=/);
    expect(contar(saida, /<secao[\s>]/g)).toBeGreaterThan(0);
  });
});

describe('Títulos — <secao titulo="..."> com texto puro', () => {
  it('usa o título sem o prefixo numérico', () => {
    const saida = xml([head('1. DISPOSIÇÕES GERAIS', { isNumbered: true })]);

    expect(saida).toContain('<secao titulo="DISPOSIÇÕES GERAIS">');
    expect(saida).not.toContain('titulo="1.');
  });

  it('marca numerar="false" em título que não é numerado no Word', () => {
    const saida = xml([head('CONSIDERAÇÕES FINAIS')]);

    expect(saida).toContain('<secao titulo="CONSIDERAÇÕES FINAIS" numerar="false">');
  });

  it('marca numerar="false" em anexo', () => {
    const saida = xml([head('ANEXO I - PLANILHA')]);

    expect(saida).toContain('numerar="false"');
    expect(saida).not.toContain('numero=');
  });

  it('transforma o título do documento em <titulo> centralizado', () => {
    const saida = xml([par('TERMO DE REFERÊNCIA', { isDocumentTitle: true })]);

    expect(saida).toContain('<titulo alinhamento="centro">TERMO DE REFERÊNCIA</titulo>');
  });

  it('emite <subtitulo> para trecho sem numeração', () => {
    const saida = xml([{ type: 'subtitulo', runs: [{ text: 'Órgão Gerenciador:' }], level: 1 }]);

    expect(saida).toContain('<subtitulo nivel="1" alinhamento="esquerda">Órgão Gerenciador:</subtitulo>');
  });
});

describe('REGRA 7 — não numerados agrupados em <secao numerar="false">', () => {
  it('agrupa conectivo e nota consecutivos em uma única seção não numerada', () => {
    const saida = xml([
      head('1. OBJETO', { isNumbered: true }),
      par('primeiro', { isNumbered: true }),
      par('OU'),
      par('Nota: sem numeração.'),
      par('segundo', { isNumbered: true }),
    ]);

    expect(contar(saida, /<secao numerar="false">/g)).toBe(1);
    expect(saida).toContain('<p>OU</p>');
    expect(saida).toContain('<p>Nota: sem numeração.</p>');
    expect(saida).toContain('<p>primeiro</p>');
    expect(saida).toContain('<p>segundo</p>');
    // os não numerados ficam entre a abertura e o fechamento da seção
    const abertura = saida.indexOf('<secao numerar="false">');
    expect(saida.indexOf('<p>OU</p>')).toBeGreaterThan(abertura);
    expect(saida.indexOf('</secao>', abertura)).toBeGreaterThan(saida.indexOf('<p>Nota: sem numeração.</p>'));
  });

  it('abre seção não numerada para o texto pré-textual, antes do primeiro título', () => {
    const saida = xml([par('Texto que vem antes de qualquer seção.'), head('1. PRIMEIRA', { isNumbered: true })]);

    expect(saida).toContain('<secao numerar="false">');
    expect(saida).toContain('<p>Texto que vem antes de qualquer seção.</p>');
  });

  it('agrupa tabela de fórmula em <secao numerar="false">', () => {
    const saida = xml([tabela([[celula('LG ='), celula('valor')], [celula('SG ='), celula('outro')]])]);

    expect(saida).toContain('<secao numerar="false">');
    expect(saida).toContain('<tabela borda="false">');
    expect(saida).toContain('<coluna>LG =</coluna>');
    expect(saida).not.toMatch(/<secao[^>]*numero=/);
  });
});

describe('Listas', () => {
  it('agrupa itens consecutivos do mesmo tipo em uma <lista>', () => {
    const saida = xml([
      item('primeiro', { numFmt: 'bullet', numeroWord: '•' }),
      item('segundo', { numFmt: 'bullet', numeroWord: '•' }),
    ]);

    expect(contar(saida, /<lista tipo="bullet">/g)).toBe(1);
    expect(saida).toContain('<item>primeiro</item>');
    expect(saida).toContain('<item>segundo</item>');
  });

  it('reconhece o tipo de lista e limpa o número digitado no item', () => {
    const saida = xml([item('I) item romano', { numFmt: 'upperRoman', numeroWord: 'I)' })]);

    expect(saida).toContain('<lista tipo="romano">');
    expect(saida).toContain('<item>item romano</item>');
  });
});

describe('Tabelas', () => {
  it('mantém tabela com mesclagem vertical como tabela estática e sem coluna repetida', () => {
    const saida = xml([
      tabela([[celula('Cabeçalho', { rowSpan: 2 })], [celula('', { isMergedContinuation: true })]]),
    ]);

    expect(saida).toContain('<tabela borda="false">');
    expect(saida).toContain('<coluna rowspan="2">Cabeçalho</coluna>');
    expect(contar(saida, /<coluna[\s>]/g)).toBe(1);
  });

  it('promove a primeira linha de uma célula só a <subtitulo>', () => {
    const saida = xml([
      tabela([
        [celula('Órgão Gerenciador:')],
        [celula('Nome'), celula('Valor')],
      ]),
    ]);

    expect(saida).toContain('<subtitulo alinhamento="esquerda">Órgão Gerenciador:</subtitulo>');
  });
});

describe('Estrutura de seções', () => {
  it('cria subseção sem título quando o nível do parágrafo aprofunda', () => {
    const saida = xml([
      head('1. PRIMEIRA', { isNumbered: true }),
      par('subitem profundo', { isNumbered: true, numeroWord: '1.1.1' }),
    ]);

    // a subseção sem título é aberta em linha própria, indentada dentro da seção com título
    expect(saida).toMatch(/\n\s+<secao>\n/);
    expect(saida).toContain('<p>subitem profundo</p>');
  });
});
