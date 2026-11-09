// @vitest-environment jsdom
// O preview renderiza React no DOM; é ele que publica o contrato data-word-* e o
// #documento-visualizado de onde os exportadores leem.

import { render } from '@testing-library/react';
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
            filhos: [{ tipo: 'texto', texto: 'Parágrafo explícito nível 3' }],
          },
          {
            tipo: 'secao',
            atributos: { titulo: 'SUBCAPÍTULO' },
            filhos: [
              { tipo: 'p', filhos: [{ tipo: 'texto', texto: 'Parágrafo herdado nível 3' }] },
              {
                tipo: 'p',
                atributos: { nivel: '4' },
                filhos: [{ tipo: 'texto', texto: 'Parágrafo explícito nível 4' }],
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

  it('publica o recuo absoluto do nível efetivo de cada parágrafo', () => {
    montar({ conteudo: hierarquico });

    // Níveis 1 e 2 compartilham a margem; o degrau começa no nível 3.
    expect(paragrafo('Parágrafo herdado nível 2').dataset.wordIndentCm).toBe('0');
    expect(paragrafo('Parágrafo explícito nível 3').dataset.wordIndentCm).toBe('0.5');
    expect(paragrafo('Parágrafo herdado nível 3').dataset.wordIndentCm).toBe('0.5');
    expect(paragrafo('Parágrafo explícito nível 4').dataset.wordIndentCm).toBe('1');
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
});
