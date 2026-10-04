// @vitest-environment jsdom
// O valor que o campo da barra lateral mostra precisa ser o mesmo número que o documento
// mostra: aqui a prova é o próprio input renderizado.

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NumberFieldInput } from './NumberFieldInput';
import type { FieldMetadata } from '../../../types';

// O vitest.config.ts não registra o setup global do Testing Library, então a limpeza entre
// testes é explícita (sem ela o mesmo input apareceria várias vezes no documento).
afterEach(cleanup);

const campoMoeda: FieldMetadata = {
  id: 'valor',
  label: 'Valor',
  tipo: 'number',
  tipoInput: 'moeda',
};

function entradaDe(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input') as HTMLInputElement;
}

describe('NumberFieldInput — campo de moeda', () => {
  it('mostra o mesmo número que o documento, mesmo com o valor guardado como texto', () => {
    // "100" guardado como texto (vindo de JSON ou de edição direta) aparecia como 1,00 no
    // campo — lido como centavos — enquanto o documento mostrava 100,00.
    const { container, rerender } = render(
      <NumberFieldInput campo={campoMoeda} valor="100" onChange={vi.fn()} />
    );
    expect(entradaDe(container).value).toBe('100,00');

    rerender(<NumberFieldInput campo={campoMoeda} valor="123456" onChange={vi.fn()} />);
    expect(entradaDe(container).value).toBe('123.456,00');

    rerender(<NumberFieldInput campo={campoMoeda} valor={1234.56} onChange={vi.fn()} />);
    expect(entradaDe(container).value).toBe('1.234,56');
  });

  it('guarda o valor digitado como número em reais', () => {
    const onChange = vi.fn();
    const { container } = render(<NumberFieldInput campo={campoMoeda} valor="" onChange={onChange} />);

    // Digitar 123456 na máscara de moeda significa R$ 1.234,56 — e é o número que fica guardado,
    // de modo que o documento (algarismos e extenso) mostre o mesmo valor.
    fireEvent.change(entradaDe(container), { target: { value: '123456' } });

    expect(onChange).toHaveBeenCalledWith('valor', 1234.56);
  });

  it('mostra vazio quando não há valor', () => {
    const { container } = render(<NumberFieldInput campo={campoMoeda} valor="" onChange={vi.fn()} />);

    expect(entradaDe(container).value).toBe('');
  });
});
