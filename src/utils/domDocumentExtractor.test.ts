// @vitest-environment jsdom
// extrairSegmentosDeDom e normalizarSegmentos trabalham sobre nós do DOM; as demais
// funções do módulo são puras mas compartilham o arquivo.

import { describe, expect, it } from 'vitest';
import {
  calcularRecuoHierarquicoCm,
  cmParaPt,
  cmParaTwip,
  extrairSegmentosDeDom,
  limparTexto,
  normalizarSegmentos,
  paraHexCor,
  paraHexCorComHash,
  precisaEspaco,
  ptParaHalfPoint,
} from './domDocumentExtractor';

const el = (html: string): HTMLElement => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
};

const estilo = {};
const opcoes = {};

describe('conversões de unidade (base do Word e do PDF)', () => {
  it('cmParaTwip converte centímetros para twips', () => {
    expect(cmParaTwip(1)).toBe(567);
    expect(cmParaTwip(2.5)).toBe(1418);
    expect(cmParaTwip(0)).toBe(0);
  });

  it('cmParaTwip devolve 0 para valor inválido ou negativo', () => {
    expect(cmParaTwip(-1)).toBe(0);
    expect(cmParaTwip(Number.NaN)).toBe(0);
    expect(cmParaTwip(undefined as unknown as number)).toBe(0);
  });

  it('cmParaPt converte centímetros para pontos', () => {
    expect(cmParaPt(1)).toBe(28.35);
    expect(cmParaPt(2)).toBe(56.69);
    expect(cmParaPt(0)).toBe(0);
    expect(cmParaPt(-2)).toBe(0);
  });

  it('ptParaHalfPoint dobra o valor e cai em 20 quando não dá para usar', () => {
    expect(ptParaHalfPoint(10)).toBe(20);
    expect(ptParaHalfPoint(10.5)).toBe(21);
    // 20 é o meio-ponto do padrão do Word (10pt)
    expect(ptParaHalfPoint(0)).toBe(20);
    expect(ptParaHalfPoint(-3)).toBe(20);
    expect(ptParaHalfPoint(Number.NaN)).toBe(20);
  });
});

describe('paraHexCor', () => {
  it('aceita hex de 6 e de 3 dígitos, com ou sem #', () => {
    expect(paraHexCor('#0284c7')).toBe('0284C7');
    expect(paraHexCor('0284c7')).toBe('0284C7');
    expect(paraHexCor('#08c')).toBe('0088CC');
  });

  it('aceita rgb e rgba, limitando ao intervalo de 0 a 255', () => {
    expect(paraHexCor('rgb(2, 132, 199)')).toBe('0284C7');
    expect(paraHexCor('rgba(2, 132, 199, 0.4)')).toBe('0284C7');
    expect(paraHexCor('rgb(300, 0, 20)')).toBe('FF0014');
    // valor negativo quebra o padrão de dígitos do regex e cai no default
    expect(paraHexCor('rgb(300, -5, 20)')).toBe('000000');
  });

  it('reconhece nomes de cor conhecidos', () => {
    expect(paraHexCor('red')).toBe('FF0000');
    expect(paraHexCor('  grey  ')).toBe('808080');
    expect(paraHexCor('orange')).toBe('FFA500');
  });

  it('cai no padrão quando não reconhece (ou não recebe cor)', () => {
    expect(paraHexCor('chartreuse')).toBe('000000');
    expect(paraHexCor('')).toBe('000000');
    expect(paraHexCor(undefined)).toBe('000000');
    expect(paraHexCor('chartreuse', 'FFFFFF')).toBe('FFFFFF');
  });

  it('paraHexCorComHash devolve sempre com #', () => {
    expect(paraHexCorComHash('#0284c7')).toBe('#0284C7');
    expect(paraHexCorComHash(undefined)).toBe('#000000');
    expect(paraHexCorComHash(undefined, '#123456')).toBe('#123456');
  });
});

describe('recuo hierárquico do documento', () => {
  it('começa a indentar do nível 2 em diante, meio centímetro por nível', () => {
    expect(calcularRecuoHierarquicoCm(0)).toBe(0);
    expect(calcularRecuoHierarquicoCm(1)).toBe(0);
    expect(calcularRecuoHierarquicoCm(2)).toBe(0.5);
    expect(calcularRecuoHierarquicoCm(3)).toBe(1);
    expect(calcularRecuoHierarquicoCm(4)).toBe(1.5);
  });
});

describe('limparTexto e precisaEspaco', () => {
  it('remove caracteres de controle mas preserva quebra de linha e tabulação', () => {
    expect(limparTexto('a\u0000b\u0007c\u001Fd')).toBe('abcd');
    expect(limparTexto('linha 1\nlinha\t2')).toBe('linha 1\nlinha\t2');
    expect(limparTexto(null)).toBe('');
    expect(limparTexto(5)).toBe('5');
  });

  it('pede espaço só entre texto que termina e começa com letra ou número', () => {
    expect(precisaEspaco('a', 'b')).toBe(true);
    expect(precisaEspaco('1', '2')).toBe(true);
    expect(precisaEspaco('a:', 'b')).toBe(true);
    expect(precisaEspaco('R$', '10')).toBe(false);
  });

  it('não pede espaço quando já existe, quando é pontuação ou abertura', () => {
    expect(precisaEspaco('a ', 'b')).toBe(false);
    expect(precisaEspaco('a', ' b')).toBe(false);
    expect(precisaEspaco('a', ',')).toBe(false);
    expect(precisaEspaco('a', ')')).toBe(false);
    expect(precisaEspaco('(', 'a')).toBe(false);
    expect(precisaEspaco('', 'b')).toBe(false);
    expect(precisaEspaco('a', '')).toBe(false);
  });
});

describe('extrairSegmentosDeDom — texto e formatação inline', () => {
  it('extrai o texto simples de um parágrafo', () => {
    expect(extrairSegmentosDeDom(el('<p>Olá mundo</p>').firstChild!, estilo, opcoes)).toEqual([
      { texto: 'Olá mundo' },
    ]);
  });

  it('propaga negrito, itálico, sublinhado, tachado e marca', () => {
    const seg = extrairSegmentosDeDom(el('<p><b>a</b><i>b</i><u>c</u><s>d</s><mark>e</mark></p>').firstChild!, estilo, opcoes);
    expect(seg).toEqual([
      { texto: 'a', bold: true },
      { texto: 'b', italic: true },
      { texto: 'c', underline: true },
      { texto: 'd', strike: true },
      { texto: 'e', mark: true },
    ]);
  });

  it('reconhece strong/em e as classes utilitárias', () => {
    const seg = extrairSegmentosDeDom(
      el('<p><strong>a</strong><em>b</em><span class="font-semibold">c</span></p>').firstChild!,
      estilo,
      opcoes
    );
    expect(seg).toEqual([{ texto: 'a', bold: true }, { texto: 'b', italic: true }, { texto: 'c', bold: true }]);
  });

  it('quebra linha no <br> e no data-word-type soft-paragraph-break', () => {
    expect(extrairSegmentosDeDom(el('<p>a<br>b</p>').firstChild!, estilo, opcoes)).toEqual([
      { texto: 'a' },
      { texto: '\n' },
      { texto: 'b' },
    ]);

    const soft = el('<div data-word-type="soft-paragraph-break" data-word-num="1.1"></div>').firstChild!;
    expect(extrairSegmentosDeDom(soft, estilo, opcoes)).toEqual([
      { texto: '\n', isParagraphBreak: true, customNum: '1.1' },
      { texto: '1.1 ', bold: true },
    ]);
  });

  it('omite o número do título quando pedido (ignorarSpanNumeracao)', () => {
    const soft = el('<div data-word-type="soft-paragraph-break" data-word-num="2.3"></div>').firstChild!;
    expect(extrairSegmentosDeDom(soft, estilo, opcoes, true)).toEqual([
      { texto: '\n', isParagraphBreak: true, customNum: '2.3' },
    ]);
  });

  it('ignora nós marcados para não exportar', () => {
    expect(extrairSegmentosDeDom(el('<p>mantém</p>').firstChild!, estilo, opcoes)).toEqual([
      { texto: 'mantém' },
    ]);
    const comFlag = el('<p><span data-ignore-export="true">fora</span>dentro</p>').firstChild!;
    expect(extrairSegmentosDeDom(comFlag, estilo, opcoes)).toEqual([{ texto: 'dentro' }]);
    const botao = el('<div><button>clique</button>texto</div>').firstChild!;
    expect(extrairSegmentosDeDom(botao, estilo, opcoes)).toEqual([{ texto: 'texto' }]);
  });

  it('não extrai tabela como texto corrido', () => {
    expect(extrairSegmentosDeDom(el('<table><tr><td>célula</td></tr></table>').firstChild!, estilo, opcoes)).toEqual([]);
    expect(
      extrairSegmentosDeDom(el('<div data-word-type="tabela-container">x</div>').firstChild!, estilo, opcoes)
    ).toEqual([]);
  });

  it('lê valor de input, checkbox, select e textarea', () => {
    const texto = el('<input type="text" value="João" />').firstChild!;
    expect(extrairSegmentosDeDom(texto, estilo, opcoes)).toEqual([{ texto: 'João' }]);

    const marcado = el('<input type="checkbox" checked />').firstChild!;
    expect(extrairSegmentosDeDom(marcado, estilo, opcoes)).toEqual([{ texto: 'Sim' }]);

    const desmarcado = el('<input type="checkbox" />').firstChild!;
    expect(extrairSegmentosDeDom(desmarcado, estilo, opcoes)).toEqual([]);

    const select = el('<select><option>SP</option><option selected>RJ</option></select>').firstChild!;
    expect(extrairSegmentosDeDom(select, estilo, opcoes)).toEqual([{ texto: 'RJ' }]);

    const area = document.createElement('textarea');
    area.value = 'linha 1\nlinha 2';
    expect(extrairSegmentosDeDom(area, estilo, opcoes)).toEqual([
      { texto: 'linha 1' },
      { texto: '\n' },
      { texto: 'linha 2' },
    ]);
  });

  it('põe o número em negrito só quando é título principal', () => {
    const dentroDeH1 = el('<h1><span data-word-num="true">1.</span></h1>').firstChild!;
    expect(extrairSegmentosDeDom(dentroDeH1, estilo, opcoes)).toEqual([{ texto: '1.', bold: true }]);

    const dentroDeParagrafo = el('<div><span data-word-num="true">1.1</span></div>').firstChild!;
    expect(extrairSegmentosDeDom(dentroDeParagrafo, estilo, opcoes)).toEqual([{ texto: '1.1', bold: false }]);
  });

  it('aplica a cor do texto e a cor de variável', () => {
    const comDataCor = el('<p><span data-cor="#0284c7">azul</span></p>').firstChild!;
    expect(extrairSegmentosDeDom(comDataCor, estilo, opcoes)).toEqual([{ texto: 'azul', cor: '#0284c7' }]);

    const variavel = el('<p><span data-vars="true">x</span></p>').firstChild!;
    expect(extrairSegmentosDeDom(variavel, estilo, { variaveisVermelhas: true, corVariavel: '#ff0000' })).toEqual([
      { texto: 'x', cor: '#ff0000' },
    ]);
  });
});

describe('normalizarSegmentos — espaçamento entre palavras', () => {
  it('insere espaço entre palavras que foram separadas em nós diferentes', () => {
    expect(normalizarSegmentos([{ texto: 'valor' }, { texto: 'total' }])).toEqual([
      { texto: 'valor' },
      { texto: ' total' },
    ]);
  });

  it('não insere espaço antes de pontuação nem depois de abertura', () => {
    expect(normalizarSegmentos([{ texto: 'total' }, { texto: ':' }, { texto: '10' }])).toEqual([
      { texto: 'total' },
      { texto: ':' },
      { texto: ' 10' },
    ]);
  });

  it('recomeça o espaçamento depois da quebra de linha', () => {
    expect(normalizarSegmentos([{ texto: 'a' }, { texto: '\n' }, { texto: 'b' }])).toEqual([
      { texto: 'a' },
      { texto: '\n' },
      { texto: 'b' },
    ]);
  });

  it('descarta segmento vazio ou com texto solto de undefined/null', () => {
    expect(
      normalizarSegmentos([
        { texto: '' },
        { texto: 'undefined' },
        { texto: 'null' },
        { texto: 'real' },
      ])
    ).toEqual([{ texto: 'real' }]);
  });

  it('limpa caracteres de controle do texto', () => {
    expect(normalizarSegmentos([{ texto: 'a\u0000b' }])).toEqual([{ texto: 'ab' }]);
  });
});
