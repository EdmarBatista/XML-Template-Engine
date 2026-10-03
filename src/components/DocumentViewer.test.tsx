// @vitest-environment jsdom
// O preview renderiza React no DOM; é ele que publica o contrato data-word-* e o
// #documento-visualizado de onde os exportadores leem.

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DocumentViewer } from './DocumentViewer';
import type { AstNode, FormStructure } from '../types';

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
