// @vitest-environment jsdom
// renderHook precisa de DOM; o hook em si é estado puro de React.

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFormHistory } from './useFormHistory';

const inicial = { nome: '', valor: '' };

describe('useFormHistory — estado inicial', () => {
  it('começa no estado inicial, sem alteração pendente e sem undo/redo', () => {
    const { result } = renderHook(() => useFormHistory({ initialData: inicial }));

    expect(result.current.dados).toEqual(inicial);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});

describe('useFormHistory — alterações e histórico', () => {
  it('atualiza o campo, rastreia a origem e permite desfazer e refazer', () => {
    const { result } = renderHook(() => useFormHistory({ initialData: inicial }));

    act(() => result.current.updateField('nome', 'Fulano'));
    expect(result.current.dados.nome).toBe('Fulano');
    expect(result.current.isDirty).toBe(true);
    expect(result.current.ultimoCampoAlterado).toBe('nome');
    expect(result.current.origemCampoAlterado).toBe('painel');

    act(() => result.current.undo());
    expect(result.current.dados.nome).toBe('');
    expect(result.current.canRedo).toBe(true);
    expect(result.current.origemCampoAlterado).toBe('undo');

    act(() => result.current.redo());
    expect(result.current.dados.nome).toBe('Fulano');
    expect(result.current.origemCampoAlterado).toBe('redo');
  });

  it('atualiza em lote e registra a última chave mexida', () => {
    const { result } = renderHook(() => useFormHistory({ initialData: inicial }));

    act(() => result.current.batchUpdateFields({ nome: 'Fulano', valor: '10' }));

    expect(result.current.dados).toEqual({ nome: 'Fulano', valor: '10' });
    expect(result.current.ultimoCampoAlterado).toBe('valor');
    expect(result.current.origemCampoAlterado).toBe('lote');
  });

  it('aceita a forma funcional do setDados', () => {
    const { result } = renderHook(() => useFormHistory({ initialData: { contador: 1 } }));

    act(() => result.current.setDados(prev => ({ ...prev, contador: (prev.contador as number) + 1 })));

    expect(result.current.dados.contador).toBe(2);
  });

  it('descarta o futuro quando algo é alterado depois de desfazer', () => {
    const { result } = renderHook(() => useFormHistory({ initialData: inicial }));

    act(() => result.current.updateField('nome', 'primeiro'));
    act(() => result.current.updateField('nome', 'segundo'));
    act(() => result.current.undo());
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.updateField('nome', 'terceiro'));

    expect(result.current.dados.nome).toBe('terceiro');
    expect(result.current.canRedo).toBe(false);
  });

  it('limita a pilha ao maxHistory configurado', () => {
    const { result } = renderHook(() => useFormHistory({ initialData: { n: 0 }, maxHistory: 3 }));

    // uma alteração por vez, como no app (cada evento provoca um render)
    for (let i = 1; i <= 5; i++) {
      act(() => result.current.updateField('n', i));
    }
    expect(result.current.dados.n).toBe(5);

    // só os 3 últimos estados ficaram na pilha: desfaz até o "3"
    act(() => result.current.undo());
    act(() => result.current.undo());
    expect(result.current.dados.n).toBe(3);
    expect(result.current.canUndo).toBe(false);
  });

  it('desfaz e refaz depois de uma rajada no mesmo lote', () => {
    // Cada alteração vira um passo do histórico mesmo quando várias acontecem no mesmo tick:
    // dados, pilha e índice vivem no mesmo estado, então a atualização é sempre função da
    // anterior. Antes disso o primeiro undo entregava undefined e o hook estourava.
    const { result } = renderHook(() => useFormHistory({ initialData: { n: 0 } }));

    act(() => {
      for (let i = 1; i <= 5; i++) result.current.updateField('n', i);
    });
    expect(result.current.dados.n).toBe(5);

    act(() => result.current.undo());
    expect(result.current.dados.n).toBe(4);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(result.current.dados.n).toBe(5);
  });

  it('não faz nada ao desfazer sem histórico', () => {
    const { result } = renderHook(() => useFormHistory({ initialData: inicial }));

    act(() => result.current.undo());

    expect(result.current.dados).toEqual(inicial);
  });
});

describe('useFormHistory — reset e avisos', () => {
  it('resetFormState volta ao novo baseline, zera o histórico e limpa o rastreio', () => {
    const { result } = renderHook(() => useFormHistory({ initialData: inicial }));

    act(() => result.current.updateField('nome', 'Fulano'));
    act(() => result.current.resetFormState({ nome: 'Modelo padrão', valor: '0' }));

    expect(result.current.dados).toEqual({ nome: 'Modelo padrão', valor: '0' });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.ultimoCampoAlterado).toBeNull();
  });

  it('avisa o dono a cada mudança de dados', () => {
    const onDataChange = vi.fn();
    const { result } = renderHook(() => useFormHistory({ initialData: inicial, onDataChange }));

    act(() => result.current.updateField('nome', 'Fulano'));
    expect(onDataChange).toHaveBeenLastCalledWith({ nome: 'Fulano', valor: '' });

    act(() => result.current.undo());
    expect(onDataChange).toHaveBeenLastCalledWith(inicial);
  });
});
