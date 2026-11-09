// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';
import type { FieldMetadata, FormGroup } from '../types';
import type { Pendencia } from '../utils/pendencias';

const grupo: FormGroup = {
  titulo: 'Identificação',
  campos: ['servico_engenharia'],
  itens: [{ tipo: 'campo', id: 'servico_engenharia' }],
};

const campo: FieldMetadata = {
  id: 'servico_engenharia',
  label: 'Serviço de engenharia?',
  tipo: 'select',
  tipoInput: 'texto',
  opcoes: ['Sim', 'Não'],
  obrigatorio: 'true',
};

const pendencia: Pendencia = {
  id: 'servico_engenharia',
  rotulo: 'Serviço de engenharia?',
  grupo: 'Identificação',
  tipo: 'campo_obrigatorio',
  mensagem: 'Selecione sim ou não.',
};

afterEach(cleanup);

function montar(pendencias: Pendencia[]) {
  return render(
    <Sidebar
      estrutura={{ grupos: [grupo], campos: { servico_engenharia: campo } }}
      dados={{ servico_engenharia: '' }}
      onChange={vi.fn()}
      collapsed={false}
      onToggleCollapse={vi.fn()}
      sidebarWidth={360}
      pendencias={pendencias}
    />
  );
}

describe('Sidebar — marcação de pendências', () => {
  it('mostra asterisco, realce e contador de pendências', () => {
    montar([pendencia]);

    expect(screen.getByText('1 pendência bloqueia a exportação')).toBeTruthy();
    expect(screen.getByTitle('Campo obrigatório sem preenchimento')).toBeTruthy();

    const container = document.getElementById('campo-container-servico_engenharia');
    expect(container?.className).toContain('border-amber-400');
    expect(container?.className).toContain('ring-amber-200');
  });

  it('não marca nem conta quando não há pendência', () => {
    montar([]);

    expect(screen.queryByText(/pendência bloqueia|pendências bloqueiam/)).toBeNull();
    expect(screen.queryByTitle('Campo obrigatório sem preenchimento')).toBeNull();
  });
});
