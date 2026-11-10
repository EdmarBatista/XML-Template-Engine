// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocumentTableCell } from './DocumentTableCell';

afterEach(cleanup);

describe('DocumentTableCell — texto longo em tabela', () => {
  const texto = 'Execução da reforma da edificação anexa destinada à implantação da área de convivência, compreendendo serviços, projetos executivos, memoriais descritivos, especificações técnicas e cronograma físico-financeiro. '.repeat(4);

  it('quebra o texto na célula em vez de cortá-lo', () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <DocumentTableCell
              valorBruto={texto}
              listaNome="itens_contratacao"
              rowIndex={0}
              colKey="especificacao"
              colMeta={{ id: 'especificacao', label: 'Especificação', tipo: 'textarea' }}
              onUpdateField={vi.fn()}
              edicaoInline
            >
              <span>{texto}</span>
            </DocumentTableCell>
          </tr>
        </tbody>
      </table>
    );

    const celula = container.querySelector('td');
    expect(celula?.className).toContain('align-top');
    expect(celula?.className).toContain('[overflow-wrap:anywhere]');
    expect(celula?.className).toContain('whitespace-normal');
    // Em células, a caixa de destaque da variável não pode ter extensão vertical:
    // com line-height compacto ela invade a linha seguinte em alguns zooms do preview HTML.
    expect(celula?.className).toContain('[&_[data-vars]]:py-0');
    expect(celula?.className).toContain('[&_[data-vars]]:border-y-0');
  });

  it('aumenta a área de edição conforme o conteúdo', () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <DocumentTableCell
              valorBruto={texto}
              listaNome="itens_contratacao"
              rowIndex={0}
              colKey="especificacao"
              colMeta={{ id: 'especificacao', label: 'Especificação', tipo: 'textarea' }}
              onUpdateField={vi.fn()}
              edicaoInline
            >
              <span>{texto}</span>
            </DocumentTableCell>
          </tr>
        </tbody>
      </table>
    );

    fireEvent.doubleClick(container.querySelector('td')!);
    const textarea = container.querySelector('textarea');
    expect(textarea).not.toBeNull();
    expect(Number(textarea!.getAttribute('rows'))).toBeGreaterThan(2);
  });
});
