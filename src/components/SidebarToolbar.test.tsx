// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SidebarToolbar } from './SidebarToolbar';

afterEach(cleanup);

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

describe('SidebarToolbar — exportação sem pendências', () => {
  it('chama Word, PDF e pacote diretamente', () => {
    const { props } = montar();

    fireEvent.click(screen.getByTitle('Exportar Documento Word (.docx)'));
    fireEvent.click(screen.getByTitle('Salvar Documento PDF (.pdf)'));
    fireEvent.click(screen.getByTitle('Baixar Pacote Completo (Modelo e Dados em .zip)'));

    expect(props.onExportWord).toHaveBeenCalledTimes(1);
    expect(props.onExportPdf).toHaveBeenCalledTimes(1);
    expect(props.onSaveZip).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Exportação bloqueada')).toBeNull();
  });
});
