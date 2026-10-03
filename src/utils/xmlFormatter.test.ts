// @vitest-environment jsdom
// formatarXmlString usa DOMParser para reorganizar o XML do editor.

import { describe, expect, it } from 'vitest';
import fs from 'fs';
import { formatarXmlString } from './xmlFormatter';
import { parseXmlDocument } from './xmlParser';

const doc = (miolo: string) =>
  `<documento><formulario><input id="nome" /></formulario><conteudo>${miolo}</conteudo></documento>`;

const linhaCom = (texto: string, alvo: string): string =>
  texto.split('\n').find(l => l.includes(alvo)) || '';

const espacosIniciais = (linha: string): number => linha.length - linha.trimStart().length;

/** O formatador insere indentação entre os blocos, então a comparação ignora espaços. */
const semEspacos = (texto: string | null | undefined): string => String(texto ?? '').replace(/\s+/g, '');

describe('formatarXmlString — organização do XML', () => {
  it('devolve a própria entrada quando é vazia ou só espaço', () => {
    expect(formatarXmlString('')).toBe('');
    expect(formatarXmlString('   ')).toBe('   ');
  });

  it('indenta os níveis e mantém o parágrafo inline em uma linha só', () => {
    const saida = formatarXmlString(doc('<secao titulo="Um"><p>Texto</p></secao>'));

    expect(saida.split('\n')[0]).toBe('<documento>');
    expect(saida).toContain('<p>Texto</p>');
    // o <p> é filho da <secao>, então entra mais fundo que ela
    expect(espacosIniciais(linhaCom(saida, '<secao'))).toBeLessThan(
      espacosIniciais(linhaCom(saida, '<p>Texto</p>'))
    );
  });

  it('usa o separador de indentação pedido', () => {
    const comDoisEspacos = formatarXmlString(doc('<secao><p>x</p></secao>'), '  ');
    const comQuatro = formatarXmlString(doc('<secao><p>x</p></secao>'));

    expect(espacosIniciais(linhaCom(comDoisEspacos, '<secao')) * 2).toBe(
      espacosIniciais(linhaCom(comQuatro, '<secao'))
    );
  });

  it('aceita fragmento sem raiz, com vários nós de nível zero', () => {
    const saida = formatarXmlString('<p>a</p>\n<p>b</p>');
    expect(saida).toContain('<p>a</p>');
    expect(saida).toContain('<p>b</p>');
  });

  it('mantém as tags self-closing dos campos e as tags vazias de container', () => {
    expect(formatarXmlString('<input id="a" label="A" />')).toContain('<input id="a" label="A" />');
    const vazio = formatarXmlString('<documento><conteudo></conteudo></documento>');
    expect(vazio).toContain('<conteudo>');
    expect(vazio).toContain('</conteudo>');
  });
});

describe('formatarXmlString — nada se perde na ida e volta', () => {
  it('preserva texto, formatação inline e quantidade de parágrafos', () => {
    const original = doc(
      '<secao titulo="Um"><p>Primeiro</p><p><b>Segundo</b> e <i>terceiro</i></p></secao>'
    );
    const formatado = formatarXmlString(original);

    const antes = parseXmlDocument(original);
    const depois = parseXmlDocument(formatado);

    expect(semEspacos(depois.querySelector('conteudo')?.textContent)).toBe(
      semEspacos(antes.querySelector('conteudo')?.textContent)
    );
    expect(depois.querySelectorAll('p').length).toBe(antes.querySelectorAll('p').length);
    expect(depois.querySelector('b')?.textContent).toBe('Segundo');
    expect(depois.querySelector('i')?.textContent).toBe('terceiro');
  });

  it('preserva a expressão do <if> com < e > vindos de entidades', () => {
    const original = doc('<if expr="valor &lt; 10 &amp;&amp; outro &gt; 2"><p>ok</p></if>');
    const formatado = formatarXmlString(original);

    // O formatador devolve a expressão sem entidade (< literal) no texto final…
    expect(formatado).toContain('expr="valor < 10 && outro > 2"');
    // …e mesmo assim a ida e volta é segura, porque o parser sanitiza ao reler.
    const depois = parseXmlDocument(formatado);
    expect(depois.querySelector('if')?.getAttribute('expr')).toBe('valor < 10 && outro > 2');
    expect(depois.querySelector('p')?.textContent).toBe('ok');
  });

  it('reformata a saída real do conversor sem perder seção nem parágrafo', () => {
    const bruto = fs.readFileSync('teste/output.xml', 'utf8');
    const formatado = formatarXmlString(bruto);
    const contar = (texto: string, re: RegExp) => (texto.match(re) || []).length;

    expect(contar(formatado, /<p[\s>]/g)).toBe(contar(bruto, /<p[\s>]/g));
    expect(contar(formatado, /<secao[\s>]/g)).toBe(contar(bruto, /<secao[\s>]/g));
    expect(contar(formatado, /<subtitulo[\s>]/g)).toBe(contar(bruto, /<subtitulo[\s>]/g));

    const antes = parseXmlDocument(bruto);
    const depois = parseXmlDocument(formatado);
    expect(depois.querySelectorAll('secao').length).toBe(antes.querySelectorAll('secao').length);
    expect(depois.querySelectorAll('p').length).toBe(antes.querySelectorAll('p').length);
  });
});
