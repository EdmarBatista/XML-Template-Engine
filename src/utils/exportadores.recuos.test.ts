// @vitest-environment jsdom
// Os exportadores leem o DOM publicado pelo renderizador e geram arquivos reais:
// o Word é aberto de volta como zip e o PDF é capturado na definição entregue ao
// pdfMake. O teste cobre a matriz que originou o defeito: níveis 1..6 com recuo
// progressivo de 0,5 cm, inclusive dentro de seção, tabela e blocos if/foreach.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render } from '@testing-library/react';
import JSZip from 'jszip';
import type { AstNode } from '../types';
import { DocumentViewer } from '../components/DocumentViewer';
import { exportarParaWord } from './wordExporter';
import { exportarParaPdf } from './pdfExporter';
import {
  calcularRecuoHierarquicoCm,
  cmParaPt,
  cmParaTwip,
} from './domDocumentExtractor';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

const NIVEIS = [1, 2, 3, 4, 5, 6];

function montarDocumento(): HTMLElement {
  const paragrafos = NIVEIS.map(
    nivel =>
      `<div data-word-type="paragrafo" data-word-level="${nivel}" data-word-numerado="true">` +
      `<span data-word-num="true">N${nivel}.</span>Parágrafo nível ${nivel}` +
      `</div>`
  ).join('');

  document.body.innerHTML = `
    <div id="documento-visualizado">
      <div data-word-type="secao" data-word-level="1" data-word-numerar="true"
           data-word-numerar-efetivo="true" data-word-reiniciar="false">
        <h3 data-word-type="secao-titulo" data-word-level="0" data-word-numerar="true">
          <span data-word-num="true">1. </span>CAPÍTULO
        </h3>
        <div data-word-type="secao-conteudo">
          ${paragrafos}
          <div data-word-type="secao" data-word-level="2" data-word-numerar="true"
               data-word-numerar-efetivo="true" data-word-reiniciar="false">
            <h3 data-word-type="secao-titulo" data-word-level="2" data-word-numerar="true">
              <span data-word-num="true">1.1. </span>SUBCAPÍTULO
            </h3>
            <div data-word-type="secao-conteudo">
              <div data-word-type="paragrafo" data-word-level="4" data-word-numerado="true">
                Parágrafo da seção aninhada nível 4
              </div>
              <div data-word-conditional="true">
                <div data-word-type="paragrafo" data-word-level="5" data-word-numerado="true">
                  Parágrafo dentro do if nível 5
                </div>
              </div>
              <div>
                <div data-word-type="paragrafo" data-word-level="6" data-word-numerado="true">
                  Parágrafo dentro do foreach nível 6
                </div>
              </div>
              <div data-word-type="paragrafo" data-word-level="4" data-word-numerado="false">
                Texto antes da tabela
                <table><tr><td>Célula da tabela</td></tr></table>
                Texto depois da tabela
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  return document.getElementById('documento-visualizado') as HTMLElement;
}

async function abrirArquivoWord(blob: Blob, caminho: string): Promise<string> {
  const zip = await JSZip.loadAsync(blob);
  const arquivo = zip.file(caminho);
  if (!arquivo) throw new Error(`${caminho} não encontrado no .docx`);
  return arquivo.async('string');
}

async function abrirDocumentoWord(blob: Blob): Promise<string> {
  return abrirArquivoWord(blob, 'word/document.xml');
}

function paragrafoComTexto(xml: string, texto: string): string {
  const ocorrencia = xml.indexOf(texto);
  if (ocorrencia < 0) throw new Error(`Parágrafo "${texto}" não encontrado no document.xml`);
  // O docx pode emitir <w:p> sem atributos; o regex evita casar com <w:pPr>.
  const aberturas = [...xml.slice(0, ocorrencia).matchAll(/<w:p(?:\s[^>]*)?>/g)];
  const inicio = aberturas.length > 0 ? aberturas[aberturas.length - 1].index! : 0;
  const fim = xml.indexOf('</w:p>', ocorrencia);
  return xml.slice(inicio, fim + '</w:p>'.length);
}

function recuoWord(xml: string, texto: string): number {
  const paragrafo = paragrafoComTexto(xml, texto);
  const recuo = paragrafo.match(/<w:ind[^>]*w:left="(\d+)"/);
  // O docx omite w:ind quando o recuo é zero.
  return recuo ? Number(recuo[1]) : 0;
}

function ilvlWord(xml: string, texto: string): number | null {
  const paragrafo = paragrafoComTexto(xml, texto);
  const ilvl = paragrafo.match(/<w:numPr>[\s\S]*?<w:ilvl w:val="(\d+)"/);
  return ilvl ? Number(ilvl[1]) : null;
}

function abstractIdDoNumId(numbering: string, numId: number): number {
  const num = numbering.match(
    new RegExp(`<w:num w:numId="${numId}"[^>]*>[\\s\\S]*?<w:abstractNumId w:val="(\\d+)"`)
  );
  if (!num) throw new Error(`numId ${numId} sem abstractNumId no numbering.xml`);
  return Number(num[1]);
}

function niveisNumbering(
  xml: string,
  abstractId: number
): Map<number, { left: number; hanging: number }> {
  const abstract = xml.match(
    new RegExp(`<w:abstractNum w:abstractNumId="${abstractId}"[^>]*>([\\s\\S]*?)</w:abstractNum>`)
  );
  if (!abstract) throw new Error(`abstractNum ${abstractId} não encontrado no numbering.xml`);

  const mapa = new Map<number, { left: number; hanging: number }>();
  for (const bloco of abstract[1].matchAll(/<w:lvl [^>]*w:ilvl="(\d+)"[^>]*>([\s\S]*?)<\/w:lvl>/g)) {
    const ilvl = Number(bloco[1]);
    const left = bloco[2].match(/<w:ind[^>]*w:left="(\d+)"/);
    const hanging = bloco[2].match(/<w:ind[^>]*w:hanging="(\d+)"/);
    mapa.set(ilvl, {
      left: left ? Number(left[1]) : 0,
      hanging: hanging ? Number(hanging[1]) : 0,
    });
  }
  return mapa;
}

function textoPdf(no: { text?: unknown }): string {
  if (typeof no.text === 'string') return no.text;
  if (Array.isArray(no.text)) {
    return no.text.map(parte => (typeof parte === 'string' ? parte : String(parte?.text || ''))).join('');
  }
  return '';
}

function recuoPdf(conteudo: { text?: unknown }[], texto: string): number {
  const no = conteudo.find(item => textoPdf(item).includes(texto));
  if (!no) throw new Error(`Parágrafo "${texto}" não encontrado no conteúdo do PDF`);
  const margem = (no as unknown as { margin?: number[] }).margin;
  if (!margem) throw new Error(`Parágrafo "${texto}" sem margin no PDF`);
  return margem[0];
}

async function capturarDefinicaoPdf(
  documento: HTMLElement
): Promise<{ content: { text?: unknown }[] }> {
  let definicao: { content: { text?: unknown }[] } | null = null;
  (window as unknown as { pdfMake: unknown }).pdfMake = {
    createPdf: (definicaoRecebida: { content: { text?: unknown }[] }) => {
      definicao = definicaoRecebida;
      return { download: (_nome: string, aoConcluir?: () => void) => aoConcluir?.() };
    },
  };

  await exportarParaPdf(documento, 'recuos.pdf');
  if (!definicao) throw new Error('Definição do PDF não foi capturada');
  return definicao;
}

afterEach(() => {
  delete (window as unknown as { pdfMake?: unknown }).pdfMake;
  document.body.innerHTML = '';
});

function montarComRenderer(): { documento: HTMLElement; unmount: () => void } {
  const conteudo: AstNode = {
    tipo: 'conteudo',
    filhos: [
      {
        tipo: 'secao',
        atributos: { titulo: 'CAPÍTULO' },
        filhos: [
          {
            tipo: 'subtitulo',
            filhos: [{ tipo: 'texto', texto: 'Subtítulo sem alinhamento' }],
          },
          {
            tipo: 'if',
            atributos: { expr: "mostrar == 'sim'" },
            filhos: [
              {
                tipo: 'p',
                atributos: { nivel: '4' },
                filhos: [{ tipo: 'texto', texto: 'Gerado pelo if nível 4' }],
              },
            ],
          },
          {
            tipo: 'foreach',
            atributos: { lista: 'itens', var: 'item' },
            filhos: [
              {
                tipo: 'p',
                atributos: { nivel: '5' },
                filhos: [{ tipo: 'texto', texto: 'Gerado pelo foreach nível 5' }],
              },
            ],
          },
        ],
      },
    ],
  };

  const { unmount } = render(
    createElement(DocumentViewer, {
      conteudo,
      dados: { mostrar: 'sim', itens: [{ nome: 'A' }, { nome: 'B' }] },
      estrutura: { grupos: [], campos: {} },
      ultimoCampoAlterado: null,
      versaoCampoAlterado: 0,
      origemCampoAlterado: null,
      onFocusField: vi.fn(),
      onUpdateField: vi.fn(),
      numeracaoAtiva: true,
      edicaoInline: false,
      irParaCampoAtivo: false,
      deslocarDocumento: false,
      variaveisVermelhasWord: false,
      zoom: 100,
      modoA4: true,
    })
  );

  const documento = document.getElementById('documento-visualizado');
  if (!documento) throw new Error('#documento-visualizado não renderizado');
  return { documento, unmount };
}

describe('recuo hierárquico dos exportadores', () => {
  it('Word: aplica o recuo do nível do parágrafo, sem herdá-lo da seção', async () => {
    const xml = await abrirDocumentoWord(await exportarParaWord(montarDocumento(), 'recuos.docx', { ativarNumeracaoDocumento: true }));

    for (const nivel of NIVEIS) {
      expect(recuoWord(xml, `Parágrafo nível ${nivel}`)).toBe(
        cmParaTwip(calcularRecuoHierarquicoCm(nivel))
      );
    }

    // O documento de referência mantém 1. e 1.1. na mesma margem.
    expect(recuoWord(xml, 'Parágrafo nível 1')).toBe(recuoWord(xml, 'Parágrafo nível 2'));
    expect(recuoWord(xml, 'Parágrafo nível 1')).toBe(0);
  });

  it('Word: numbering.xml concorda com o recuo e o ilvl do parágrafo', async () => {
    const blob = await exportarParaWord(montarDocumento(), 'recuos.docx', { ativarNumeracaoDocumento: true });
    const xml = await abrirDocumentoWord(blob);
    const numbering = await abrirArquivoWord(blob, 'word/numbering.xml');

    const numId = paragrafoComTexto(xml, 'Parágrafo nível 1').match(/<w:numId w:val="(\d+)"/);
    if (!numId) throw new Error('Parágrafo sem w:numId');
    const niveis = niveisNumbering(numbering, abstractIdDoNumId(numbering, Number(numId[1])));

    for (const nivel of NIVEIS) {
      expect(ilvlWord(xml, `Parágrafo nível ${nivel}`)).toBe(nivel - 1);
    }

    // O ilvl 0 corresponde ao nível semântico 1 (data-word-level), e assim por diante.
    for (let ilvl = 0; ilvl <= 8; ilvl++) {
      const definicao = niveis.get(ilvl);
      expect(definicao, `nível ilvl=${ilvl} ausente no numbering.xml`).toBeDefined();
      expect(definicao!.left).toBe(cmParaTwip(calcularRecuoHierarquicoCm(ilvl + 1)));
      expect(definicao!.hanging).toBe(0);
    }
  });

  it('Word: mantém o recuo em seção aninhada, if/foreach e ao redor de tabela', async () => {
    const xml = await abrirDocumentoWord(
      await exportarParaWord(montarDocumento(), 'recuos.docx', { ativarNumeracaoDocumento: true })
    );

    expect(recuoWord(xml, 'Parágrafo da seção aninhada nível 4')).toBe(
      cmParaTwip(calcularRecuoHierarquicoCm(4))
    );
    expect(recuoWord(xml, 'Parágrafo dentro do if nível 5')).toBe(
      cmParaTwip(calcularRecuoHierarquicoCm(5))
    );
    expect(recuoWord(xml, 'Parágrafo dentro do foreach nível 6')).toBe(
      cmParaTwip(calcularRecuoHierarquicoCm(6))
    );
    expect(recuoWord(xml, 'Texto antes da tabela')).toBe(
      cmParaTwip(calcularRecuoHierarquicoCm(4))
    );
    expect(recuoWord(xml, 'Texto depois da tabela')).toBe(
      cmParaTwip(calcularRecuoHierarquicoCm(4))
    );
    expect(xml).toContain('<w:tbl>');
    expect(xml).toContain('Célula da tabela');
  });

  it('PDF: aplica o mesmo recuo do nível do parágrafo que o Word', async () => {
    const definicao = await capturarDefinicaoPdf(montarDocumento());

    for (const nivel of NIVEIS) {
      expect(recuoPdf(definicao.content, `Parágrafo nível ${nivel}`)).toBe(
        cmParaPt(calcularRecuoHierarquicoCm(nivel))
      );
    }

    // O documento de referência mantém 1. e 1.1. na mesma margem.
    expect(recuoPdf(definicao.content, 'Parágrafo nível 1')).toBe(
      recuoPdf(definicao.content, 'Parágrafo nível 2')
    );
    expect(recuoPdf(definicao.content, 'Parágrafo nível 1')).toBe(0);
  });

  it('Word e PDF: conteúdo realmente renderizado por if/foreach mantém o recuo', async () => {
    const { documento, unmount } = montarComRenderer();

    try {
      const xml = await abrirDocumentoWord(
        await exportarParaWord(documento, 'renderizado.docx', { ativarNumeracaoDocumento: true })
      );
      expect(recuoWord(xml, 'Gerado pelo if nível 4')).toBe(
        cmParaTwip(calcularRecuoHierarquicoCm(4))
      );
      expect(recuoWord(xml, 'Gerado pelo foreach nível 5')).toBe(
        cmParaTwip(calcularRecuoHierarquicoCm(5))
      );

      // Subtítulo sem alinhamento: esquerda e sem recuo no Word também.
      const subtituloWord = paragrafoComTexto(xml, 'Subtítulo sem alinhamento');
      expect(subtituloWord).toContain('<w:jc w:val="left"/>');
      expect(subtituloWord).toContain('<w:color w:val="0F172A"/>');
      expect(subtituloWord).not.toMatch(/<w:ind[^>]*w:left="[1-9]/);

      const definicao = await capturarDefinicaoPdf(documento);
      expect(recuoPdf(definicao.content, 'Gerado pelo if nível 4')).toBe(
        cmParaPt(calcularRecuoHierarquicoCm(4))
      );
      expect(recuoPdf(definicao.content, 'Gerado pelo foreach nível 5')).toBe(
        cmParaPt(calcularRecuoHierarquicoCm(5))
      );

      // Subtítulo sem alinhamento no XML: à esquerda, no mesmo eixo dos itens 1.1.
      const subtitulo = definicao.content.find(item =>
        textoPdf(item).includes('Subtítulo sem alinhamento')
      );
      expect(subtitulo).toBeDefined();
      expect((subtitulo as unknown as { alignment?: string }).alignment).toBe('left');
      expect((subtitulo as unknown as { margin?: number[] }).margin?.[0]).toBe(0);
      expect((subtitulo as unknown as { color?: string }).color).toBe('#0F172A');
    } finally {
      unmount();
    }
  });

  it('PDF: respeita o alinhamento do subtítulo publicado no DOM', async () => {
    document.body.innerHTML = `
      <div id="documento-visualizado">
        <h2 data-word-type="subtitulo" data-word-outline-level="2" data-word-align="esquerda">Subtítulo esquerda</h2>
        <h2 data-word-type="subtitulo" data-word-outline-level="2" data-word-align="centro">Subtítulo centro</h2>
        <h2 data-word-type="subtitulo" data-word-outline-level="2" data-word-align="direita">Subtítulo direita</h2>
        <h2 data-word-type="subtitulo" data-word-outline-level="2" data-word-align="justificar">Subtítulo justificado</h2>
      </div>`;
    const documento = document.getElementById('documento-visualizado') as HTMLElement;
    const definicao = await capturarDefinicaoPdf(documento);

    const alinhamento = (texto: string): string | undefined => {
      const no = definicao.content.find(item => textoPdf(item).includes(texto));
      if (!no) throw new Error(`Subtítulo "${texto}" não encontrado no conteúdo do PDF`);
      return (no as unknown as { alignment?: string }).alignment;
    };

    expect(alinhamento('Subtítulo esquerda')).toBe('left');
    expect(alinhamento('Subtítulo centro')).toBe('center');
    expect(alinhamento('Subtítulo direita')).toBe('right');
    expect(alinhamento('Subtítulo justificado')).toBe('justify');
  });

  it('Word: subtítulo não é itálico, mas preserva itálico marcado no texto', async () => {
    document.body.innerHTML = `
      <div id="documento-visualizado">
        <h2 data-word-type="subtitulo" data-word-outline-level="2" data-word-align="esquerda">Classificação do objeto quanto ao modelo de execução</h2>
        <h2 data-word-type="subtitulo" data-word-outline-level="2" data-word-align="esquerda">Subtítulo com <em>ênfase</em> interna</h2>
      </div>`;
    const documento = document.getElementById('documento-visualizado') as HTMLElement;
    const xml = await abrirDocumentoWord(await exportarParaWord(documento, 'subtitulo.docx'));

    expect(paragrafoComTexto(xml, 'Classificação do objeto')).not.toMatch(/<w:i(?:\s+w:val="(?:1|true|on)")?\s*\/>/);
    expect(paragrafoComTexto(xml, 'ênfase')).toMatch(/<w:i(?:\s+w:val="(?:1|true|on)")?\s*\/>/);
  });

  it('PDF: subtítulo não é itálico, mas preserva itálico marcado no texto', async () => {
    document.body.innerHTML = `
      <div id="documento-visualizado">
        <h2 data-word-type="subtitulo" data-word-outline-level="2" data-word-align="esquerda">Classificação do objeto quanto ao modelo de execução</h2>
        <h2 data-word-type="subtitulo" data-word-outline-level="2" data-word-align="esquerda">Subtítulo com <em>ênfase</em> interna</h2>
      </div>`;
    const documento = document.getElementById('documento-visualizado') as HTMLElement;
    const definicao = await capturarDefinicaoPdf(documento);

    const paragrafoPdf = (texto: string) => {
      const no = definicao.content.find(item => textoPdf(item).includes(texto)) as
        | { italics?: boolean; text?: unknown }
        | undefined;
      if (!no) throw new Error(`Subtítulo "${texto}" não encontrado no conteúdo do PDF`);
      return no;
    };

    const simples = paragrafoPdf('Classificação do objeto');
    const runsSimples = Array.isArray(simples.text) ? (simples.text as { italics?: boolean }[]) : [];
    expect(simples.italics).toBeFalsy();
    expect(runsSimples.every(run => !run.italics)).toBe(true);

    const comEnfase = paragrafoPdf('ênfase');
    const runsComEnfase = Array.isArray(comEnfase.text)
      ? (comEnfase.text as { italics?: boolean }[])
      : [];
    expect(comEnfase.italics).toBeFalsy();
    expect(runsComEnfase.some(run => run.italics)).toBe(true);
  });

  it('PDF: mantém o recuo em seção aninhada, if/foreach e ao redor de tabela', async () => {
    const definicao = await capturarDefinicaoPdf(montarDocumento());

    expect(recuoPdf(definicao.content, 'Parágrafo da seção aninhada nível 4')).toBe(
      cmParaPt(calcularRecuoHierarquicoCm(4))
    );
    expect(recuoPdf(definicao.content, 'Parágrafo dentro do if nível 5')).toBe(
      cmParaPt(calcularRecuoHierarquicoCm(5))
    );
    expect(recuoPdf(definicao.content, 'Parágrafo dentro do foreach nível 6')).toBe(
      cmParaPt(calcularRecuoHierarquicoCm(6))
    );
    expect(recuoPdf(definicao.content, 'Texto antes da tabela')).toBe(
      cmParaPt(calcularRecuoHierarquicoCm(4))
    );
    expect(recuoPdf(definicao.content, 'Texto depois da tabela')).toBe(
      cmParaPt(calcularRecuoHierarquicoCm(4))
    );
    expect(
      definicao.content.some(item => (item as unknown as { table?: unknown }).table !== undefined)
    ).toBe(true);
    expect(JSON.stringify(definicao.content)).toContain('Célula da tabela');
  });
});
