// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SidebarToolbar } from './SidebarToolbar';
import type { Pendencia } from '../utils/pendencias';

afterEach(cleanup);

const pendencia: Pendencia = {
  id: 'servico_engenharia',
  rotulo: 'Serviço de engenharia?',
  grupo: 'Identificação',
  tipo: 'campo_obrigatorio',
  mensagem: 'Selecione sim ou não.',
};

function montar(overrides: Partial<React.ComponentProps<typeof SidebarToolbar>> = {}) {
  const props: React.ComponentProps<typeof SidebarToolbar> = {
    currentXmlName: 'teste.xml',
    customTemplates: [],
    onRemoveCustomTemplate: vi.fn(),
    onSelectTemplate: vi.fn(),
    onUploadXml: vi.fn(),
    onUploadJson: vi.fn(),
    onUploadZip: vi.fn(),
    onSaveJson: vi.fn(),
    onSaveZip: vi.fn(),
    onExportWord: vi.fn(),
    onExportPdf: vi.fn(),
    onOpenModelModal: vi.fn(),
    onClearForm: vi.fn(),
    variaveisVermelhasWord: false,
    onToggleVariaveisVermelhas: vi.fn(),
    numeracaoAtiva: true,
    onToggleNumeracao: vi.fn(),
    edicaoInline: false,
    onToggleEdicaoInline: vi.fn(),
    irParaCampoAtivo: false,
    onToggleIrParaCampo: vi.fn(),
    irParaDocumentoAtivo: false,
    onToggleIrParaDocumento: vi.fn(),
    modoA4: true,
    onToggleModoA4: vi.fn(),
    darkMode: false,
    onToggleDarkMode: vi.fn(),
    ...overrides,
  };

  return { props, ...render(<SidebarToolbar {...props} />) };
}

describe('SidebarToolbar — bloqueio por pendências', () => {
  it('bloqueia Word, PDF e pacote e oferece ir para o campo', () => {
    const onIrParaPendencia = vi.fn();
    const { props } = montar({
      pendencias: [pendencia],
      onIrParaPendencia,
    });

    for (const titulo of [
      'Exportar Documento Word (.docx)',
      'Salvar Documento PDF (.pdf)',
      'Baixar Pacote Completo (Modelo e Dados em .zip)',
    ]) {
      fireEvent.click(screen.getByTitle(titulo));

      expect(screen.getByText('Exportação bloqueada')).toBeTruthy();
      expect(screen.getByText('Identificação')).toBeTruthy();
      expect(screen.getByText('Serviço de engenharia?')).toBeTruthy();
      expect(screen.getByText('Selecione sim ou não.')).toBeTruthy();
      fireEvent.click(screen.getByTitle('Fechar'));
    }

    expect(props.onExportWord).not.toHaveBeenCalled();
    expect(props.onExportPdf).not.toHaveBeenCalled();
    expect(props.onSaveZip).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Exportar Documento Word (.docx)'));
    fireEvent.click(screen.getByText('Ir para o campo'));
    expect(onIrParaPendencia).toHaveBeenCalledWith('servico_engenharia');
    expect(screen.queryByText('Exportação bloqueada')).toBeNull();
  });

  it('exporta normalmente quando não há pendências', () => {
    const { props } = montar({ pendencias: [] });

    fireEvent.click(screen.getByTitle('Exportar Documento Word (.docx)'));
    fireEvent.click(screen.getByTitle('Salvar Documento PDF (.pdf)'));
    fireEvent.click(screen.getByTitle('Baixar Pacote Completo (Modelo e Dados em .zip)'));

    expect(props.onExportWord).toHaveBeenCalledTimes(1);
    expect(props.onExportPdf).toHaveBeenCalledTimes(1);
    expect(props.onSaveZip).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Exportação bloqueada')).toBeNull();
  });
});
