// @vitest-environment jsdom
// O preview renderiza React no DOM; é ele que publica o contrato data-word-* e o
// #documento-visualizado de onde os exportadores leem.

import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DocumentViewer } from './DocumentViewer';
import type { AstNode, FormStructure } from '../types';
import { ATRIBUTOS_SECAO_CONTEUDO, WORD_ATTR_TIPO } from '../utils/wordDom';

const estrutura: FormStructure = {
  grupos: [],
  campos: { nome: { id: 'nome', label: 'Nome', tipo: 'input' } },
};

const conteudo: AstNode = {
  tipo: 'conteudo',
  filhos: [
    {
      tipo: 'secao',
      atributos: { titulo: 'DISPOSIÇÕES GERAIS' },
      filhos: [
        { tipo: 'p', filhos: [{ tipo: 'texto', texto: 'Primeiro {{nome}}.' }] },
        { tipo: 'p', filhos: [{ tipo: 'texto', texto: 'Segundo parágrafo.' }] },
      ],
    },
  ],
};

function montar(extra: Partial<Parameters<typeof DocumentViewer>[0]> = {}) {
  return render(
    <DocumentViewer
      conteudo={conteudo}
      dados={{ nome: 'Fulano' }}
      estrutura={estrutura}
      ultimoCampoAlterado={null}
      versaoCampoAlterado={0}
      origemCampoAlterado={null}
      onFocusField={vi.fn()}
      onUpdateField={vi.fn()}
      numeracaoAtiva
      edicaoInline={false}
      irParaCampoAtivo={false}
      deslocarDocumento={false}
      variaveisVermelhasWord={false}
      zoom={100}
      modoA4
      {...extra}
    />
  );
}

describe('DocumentViewer — recuo hierárquico na tela', () => {
  const hierarquico: AstNode = {
    tipo: 'conteudo',
    filhos: [
      {
        tipo: 'secao',
        atributos: { titulo: 'CAPÍTULO' },
        filhos: [
          { tipo: 'p', filhos: [{ tipo: 'texto', texto: 'Parágrafo herdado nível 2' }] },
          {
            tipo: 'subtitulo',
            filhos: [{ tipo: 'texto', texto: 'Subtítulo sem alinhamento' }],
          },
          {
            tipo: 'p',
            atributos: { nivel: '3' },
            filhos: [{ tipo: 'texto', texto: 'Parágrafo com nivel 3 ignorado' }],
          },
          {
            tipo: 'secao',
            atributos: { titulo: 'SUBCAPÍTULO' },
            filhos: [
              { tipo: 'p', filhos: [{ tipo: 'texto', texto: 'Parágrafo herdado nível 3' }] },
              {
                tipo: 'p',
                atributos: { nivel: '4' },
                filhos: [{ tipo: 'texto', texto: 'Parágrafo com nivel 4 ignorado' }],
              },
            ],
          },
        ],
      },
    ],
  };

  const paragrafo = (texto: string): HTMLElement => {
    const encontrado = [...document.querySelectorAll<HTMLElement>('[data-word-type="paragrafo"]')].find(
      el => (el.textContent || '').includes(texto)
    );
    if (!encontrado) throw new Error(`Parágrafo "${texto}" não renderizado`);
    return encontrado;
  };

  it('publica o recuo absoluto do nível de contexto de cada parágrafo', () => {
    montar({ conteudo: hierarquico });

    // Níveis 1 e 2 compartilham a margem; o degrau começa no nível 3.
    expect(paragrafo('Parágrafo herdado nível 2').dataset.wordIndentCm).toBe('0');
    // `nivel` em <p> não tem mais efeito: vale o nível da seção.
    expect(paragrafo('Parágrafo com nivel 3 ignorado').dataset.wordIndentCm).toBe('0');
    expect(paragrafo('Parágrafo herdado nível 3').dataset.wordIndentCm).toBe('0.5');
    expect(paragrafo('Parágrafo com nivel 4 ignorado').dataset.wordIndentCm).toBe('0.5');
  });

  it('ignora nivel e numerado em <p>: vale apenas o contexto da seção', () => {
    const comAtributos: AstNode = {
      tipo: 'conteudo',
      filhos: [
        {
          tipo: 'secao',
          atributos: { titulo: 'CAPÍTULO' },
          filhos: [
            {
              tipo: 'p',
              atributos: { nivel: '5' },
              filhos: [{ tipo: 'texto', texto: 'Primeiro com nivel' }],
            },
            {
              tipo: 'p',
              atributos: { numerado: 'false' },
              filhos: [{ tipo: 'texto', texto: 'Segundo com numerado falso' }],
            },
          ],
        },
      ],
    };
    montar({ conteudo: comAtributos });

    const primeiro = paragrafo('Primeiro com nivel');
    const segundo = paragrafo('Segundo com numerado falso');

    // O nível 5 do atributo é ignorado; ambos ficam no nível 2 da seção.
    expect(primeiro.querySelector('[data-word-num]')?.textContent?.trim()).toBe('1.1.');
    expect(segundo.querySelector('[data-word-num]')?.textContent?.trim()).toBe('1.2.');
    expect(primeiro.dataset.wordIndentCm).toBe('0');
    expect(segundo.dataset.wordIndentCm).toBe('0');
  });

  it('mantém o subtítulo sem atributo alinhado à esquerda', () => {
    montar({ conteudo: hierarquico });

    const subtitulo = document.querySelector<HTMLElement>('[data-word-type="subtitulo"]');
    expect(subtitulo?.dataset.wordAlign).toBe('esquerda');
  });

  it('acrescenta apenas o degrau da seção e compensa no conteúdo', () => {
    montar({ conteudo: hierarquico });

    const secoes = [...document.querySelectorAll<HTMLElement>('[data-word-type="secao"]')];
    const raiz = secoes.find(el => el.dataset.wordLevel === '1');
    const aninhada = secoes.find(el => el.dataset.wordLevel === '2');

    expect(raiz?.style.marginLeft).toBe('');
    expect(aninhada?.style.marginLeft).toBe('');

    const seletorConteudo = `:scope > [${WORD_ATTR_TIPO}="${ATRIBUTOS_SECAO_CONTEUDO[WORD_ATTR_TIPO]}"]`;
    const conteudoRaiz = raiz?.querySelector<HTMLElement>(seletorConteudo);
    const conteudoAninhado = aninhada?.querySelector<HTMLElement>(seletorConteudo);
    expect(conteudoRaiz?.dataset.wordIndentBaseCm).toBe('0');
    expect(conteudoAninhado?.dataset.wordIndentBaseCm).toBe('0');
  });
});

describe('DocumentViewer — render do documento', () => {
  it('publica o anchor #documento-visualizado de onde os exportadores leem', () => {
    montar();

    expect(document.getElementById('documento-visualizado')).not.toBeNull();
  });

  it('renderiza o título da seção e os parágrafos', () => {
    const { container } = montar();
    const texto = container.textContent || '';

    expect(texto).toContain('DISPOSIÇÕES GERAIS');
    expect(texto).toContain('Primeiro');
    expect(texto).toContain('Segundo parágrafo.');
  });

  it('resolve a variável {{nome}} com o dado preenchido', () => {
    const { container } = montar();

    expect(container.textContent).toContain('Fulano');
    expect(container.textContent).not.toContain('{{nome}}');
  });

  it('numera a seção e o parágrafo quando a numeração está ativa', () => {
    const { container } = montar({ numeracaoAtiva: true });
    const texto = container.textContent || '';

    expect(texto).toMatch(/1\./);
  });

  it('não numera quando a numeração está desligada', () => {
    const { container } = montar({ numeracaoAtiva: false });
    const texto = container.textContent || '';

    expect(texto).toContain('DISPOSIÇÕES GERAIS');
    expect(texto).not.toMatch(/\d+\.\s*DISPOSIÇÕES/);
  });

  it('marca o texto do documento para a exportação saber o que copiar', () => {
    const { container } = montar();
    const documento = document.getElementById('documento-visualizado')!;

    expect(documento.className).toContain('select-text');
    expect(container.textContent?.length).toBeGreaterThan(0);
  });

  it('renderiza <if> com caminho pontuado dentro de foreach', () => {
    const conteudoIf: AstNode = {
      tipo: 'conteudo',
      filhos: [
        {
          tipo: 'foreach',
          atributos: { lista: 'linhas', var: 'item' },
          filhos: [
            {
              tipo: 'if',
              atributos: { expr: "item.frase != ''" },
              filhos: [
                { tipo: 'p', filhos: [{ tipo: 'texto', texto: 'COM-GUARD:{{item.frase}}' }] },
              ],
            },
          ],
        },
      ],
    };

    const { container } = montar({
      conteudo: conteudoIf,
      dados: {
        nome: 'Fulano',
        linhas: [{ frase: '' }, { frase: 'De acordo com o Aviso.' }],
      },
    });

    const texto = container.textContent || '';
    // Só a linha preenchida passa pelo guard; a vazia não gera parágrafo.
    expect(texto).toContain('COM-GUARD:De acordo com o Aviso.');
    expect((texto.match(/COM-GUARD:/g) || []).length).toBe(1);
  });
});

describe('DocumentViewer — <secao> sem título continua a numeração', () => {
  const comContainers: AstNode = {
    tipo: 'conteudo',
    filhos: [
      {
        tipo: 'secao',
        atributos: { titulo: 'CAPÍTULO' },
        filhos: [
          { tipo: 'p', filhos: [{ tipo: 'texto', texto: 'a1' }] },
          {
            tipo: 'secao',
            filhos: [
              { tipo: 'p', filhos: [{ tipo: 'texto', texto: 'b1' }] },
              { tipo: 'p', filhos: [{ tipo: 'texto', texto: 'b2' }] },
              {
                tipo: 'if',
                // O grupo seguinte dentro do contêiner não pode reiniciar a série.
                atributos: { expr: "nome == 'Fulano'" },
                filhos: [{ tipo: 'p', filhos: [{ tipo: 'texto', texto: 'b3' }] }],
              },
            ],
          },
          {
            tipo: 'secao',
            filhos: [{ tipo: 'p', filhos: [{ tipo: 'texto', texto: 'b4' }] }],
          },
          { tipo: 'p', filhos: [{ tipo: 'texto', texto: 'a2' }] },
          {
            tipo: 'secao',
            filhos: [{ tipo: 'p', filhos: [{ tipo: 'texto', texto: 'b5' }] }],
          },
        ],
      },
    ],
  };

  const numeroDoParagrafo = (texto: string): string => {
    const encontrado = [...document.querySelectorAll<HTMLElement>('[data-word-type="paragrafo"]')].find(
      el => (el.textContent || '').includes(texto)
    );
    if (!encontrado) throw new Error(`Parágrafo "${texto}" não renderizado`);
    return (encontrado.querySelector<HTMLElement>('[data-word-num]')?.textContent || '').trim();
  };

  it('continua o contador do nível aberto entre grupos de subitens (1.1.4)', () => {
    montar({ conteudo: comContainers });

    expect(numeroDoParagrafo('a1')).toBe('1.1.');
    expect(numeroDoParagrafo('b1')).toBe('1.1.1.');
    expect(numeroDoParagrafo('b2')).toBe('1.1.2.');
    expect(numeroDoParagrafo('b3')).toBe('1.1.3.');
    // O segundo grupo de subitens continua em 1.1.4, sem reiniciar em 1.1.1.
    expect(numeroDoParagrafo('b4')).toBe('1.1.4.');
    // O contêiner sem título não consome número de seção: o próximo item é 1.2.
    expect(numeroDoParagrafo('a2')).toBe('1.2.');
    expect(numeroDoParagrafo('b5')).toBe('1.2.1.');
  });

  it('não imprime cabeçalho vazio para o contêiner sem título', () => {
    montar({ conteudo: comContainers });

    const titulosVazios = [...document.querySelectorAll<HTMLElement>('h3')].filter(
      el => !(el.textContent || '').trim()
    );
    expect(titulosVazios).toHaveLength(0);
  });

  it('aninha contêineres sem título até 1.1.1.1', () => {
    const aninhado: AstNode = {
      tipo: 'conteudo',
      filhos: [
        {
          tipo: 'secao',
          atributos: { titulo: 'CAPÍTULO' },
          filhos: [
            { tipo: 'p', filhos: [{ tipo: 'texto', texto: 'n1' }] },
            {
              tipo: 'secao',
              filhos: [
                { tipo: 'p', filhos: [{ tipo: 'texto', texto: 'n2' }] },
                {
                  tipo: 'secao',
                  filhos: [{ tipo: 'p', filhos: [{ tipo: 'texto', texto: 'n3' }] }],
                },
              ],
            },
          ],
        },
      ],
    };
    montar({ conteudo: aninhado });

    expect(numeroDoParagrafo('n1')).toBe('1.1.');
    expect(numeroDoParagrafo('n2')).toBe('1.1.1.');
    expect(numeroDoParagrafo('n3')).toBe('1.1.1.1.');
  });
});

describe('DocumentViewer — alinhamento normalizado', () => {
  it('aceita a grafia documentada e a inglesa na prévia', () => {
    const conteudo: AstNode = {
      tipo: 'conteudo',
      filhos: [
        {
          tipo: 'p',
          atributos: { alinhamento: 'center' },
          filhos: [{ tipo: 'texto', texto: 'Centro EN' }],
        },
        {
          tipo: 'subtitulo',
          atributos: { alinhamento: 'justificar' },
          filhos: [{ tipo: 'texto', texto: 'Sub Justificado' }],
        },
      ],
    };

    const { container } = montar({ conteudo });

    const paragrafoCentro = [...container.querySelectorAll<HTMLElement>('[data-word-type="paragrafo"]')].find(
      el => (el.textContent || '').includes('Centro EN')
    );
    expect(paragrafoCentro?.className).toContain('text-center');
    expect(paragrafoCentro?.getAttribute('data-word-align')).toBe('centro');

    const subtitulo = container.querySelector<HTMLElement>('[data-word-type="subtitulo"]');
    expect(subtitulo?.className).toContain('text-justify');
    expect(subtitulo?.getAttribute('data-word-align')).toBe('justificado');
  });
});

describe('DocumentViewer — edição inline de horário', () => {
  it('abre input type="time" ao editar a variável com duplo clique', () => {
    const estruturaHora: FormStructure = {
      grupos: [],
      campos: {
        hora_inicio: { id: 'hora_inicio', label: 'Início', tipo: 'hora', tipoInput: 'hora' },
      },
    };

    const { container } = montar({
      conteudo: {
        tipo: 'conteudo',
        filhos: [
          {
            tipo: 'p',
            filhos: [{ tipo: 'texto', texto: 'Das {{hora_inicio}}h' }],
          },
        ],
      },
      dados: { nome: 'Fulano', hora_inicio: '08:00' },
      estrutura: estruturaHora,
      edicaoInline: true,
    });

    const variavel = container.querySelector<HTMLElement>('[data-vars="hora_inicio"]');
    if (!variavel) throw new Error('Variável de horário não renderizada');

    fireEvent.doubleClick(variavel);

    const input = container.querySelector<HTMLInputElement>('input[type="time"]');
    expect(input).not.toBeNull();
    expect(input?.value).toBe('08:00');
  });
});

describe('DocumentViewer — alinhamento do bloco condicional', () => {
  // O texto de um <if> tem de começar na mesma coluna dos parágrafos irmãos: a barra
  // indicadora vive na margem (margem negativa do tamanho da borda) e não como padding.
  const comIf: AstNode = {
    tipo: 'conteudo',
    filhos: [
      { tipo: 'p', filhos: [{ tipo: 'texto', texto: 'Parágrafo fora do if' }] },
      {
        tipo: 'if',
        atributos: { expr: "nome == 'Fulano'" },
        filhos: [{ tipo: 'p', filhos: [{ tipo: 'texto', texto: 'Parágrafo dentro do if' }] }],
      },
    ],
  };

  it('não recua o conteúdo do <if> em relação aos irmãos', () => {
    const { container } = montar({ conteudo: comIf });
    const bloco = container.querySelector<HTMLElement>('[data-word-conditional="true"]');
    if (!bloco) throw new Error('Bloco condicional não renderizado');

    expect(bloco.className).toContain('border-l-2');
    expect(bloco.className).toContain('-ml-0.5');
    expect(bloco.className).not.toContain('pl-3');
  });
});
