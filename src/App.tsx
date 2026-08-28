/**
 * ============================================================================
 * App.tsx (Orquestrador da Aplicação)
 * ============================================================================
 *
 * Arquitetura & Distribuição de Responsabilidades:
 *
 * 1. App.tsx (este arquivo):
 *    - Atua exclusivamente como orquestrador de alto nível e integrador de layout.
 *    - Conecta os hooks especializados de estado, visualizadores, formulário e modais.
 *    - Renderiza a estrutura visual split-screen, atalhos de teclado e os modais.
 *
 * 2. hooks_App (Hooks especializados do App):
 *    - A. useFormHistory: Gerenciamento do estado `dados`, histórico Undo/Redo e `isDirty`.
 *    - B. useDocumentEngine: Ciclo de vida dos templates, parsing XML -> AST e erros.
 *    - C. useDocumentExporters: Exportações (Word .docx, PDF .pdf, impressão, JSON, ZIP).
 *    - D. useModalsManager: Estados e controles declarativos de abertura de modais.
 *    - E. useKeyboardShortcuts: Atalhos de teclado (Ctrl+S, Ctrl+P, Ctrl+Z, Ctrl+Y, Ctrl+E, Ctrl+M, Esc).
 *    - F. useFilePackageActions: Drag & Drop e uploads de múltiplos arquivos (.xml, .json, .zip).
 *    - G. useSidebarResizer: Redimensionamento e limites do divisor lateral.
 *
 * 3. hooks Globais:
 *    - usePreferencias: Preferências persistentes de UI (zoom, modo A4, dark mode, etc.).
 *    - useCamposFoco: Sincronização de foco e scroll bidirecional formulário <-> documento.
 *    - useToast: Notificações visuais flutuantes.
 * ============================================================================
 */

import React from 'react';
import { DocumentViewer } from './components/DocumentViewer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ModelModal } from './components/ModelModal';
import { SidebarToolbar } from './components/SidebarToolbar';
import { Sidebar } from './components/Sidebar';
import { XmlEditorModal } from './components/XmlEditorModal';
import { useToast } from './hooks/useToast';
import { usePreferencias } from './hooks/usePreferencias';
import { useCamposFoco } from './hooks/useCamposFoco';
import {
  useFormHistory,
  useDocumentEngine,
  useDocumentExporters,
  useModalsManager,
  useKeyboardShortcuts,
  useFilePackageActions,
  useSidebarResizer,
} from './hooks_App';
import { StorageService } from './services/storageService';
import { construirEstadoInicial } from './utils/xmlParser';

export default function App() {
  // Notificações visuais
  const { toastMessage, showToast } = useToast();

  // A. Hook de Histórico e Estado dos Dados do Formulário
  const {
    dados,
    setDados,
    updateField,
    undo,
    redo,
    canUndo,
    canRedo,
    isDirty,
    resetFormState,
    ultimoCampoAlterado,
    versaoCampoAlterado,
    origemCampoAlterado,
  } = useFormHistory();

  // B. Hook de Ciclo de Vida do Modelo, Templates e Engine XML
  const {
    customTemplates,
    currentTemplate,
    rawXml,
    xmlName,
    modelo,
    xmlError,
    aplicarNovoXmlEJson,
    handleSelectTemplate,
    adicionarTemplateSilencioso,
    handleRemoveCustomTemplate,
    carregarXmlEJson,
  } = useDocumentEngine({
    showToast,
    onNovoEstadoGerado: resetFormState,
  });

  // Inicializa e persiste dados do template ativo no LocalStorage
  React.useEffect(() => {
    if (modelo) {
      const saved = StorageService.loadFormData(currentTemplate.id);
      if (saved && Object.keys(saved).length > 0) {
        resetFormState(saved);
      } else {
        resetFormState(construirEstadoInicial(modelo.formulario.campos));
      }
    }
  }, [currentTemplate.id]);

  React.useEffect(() => {
    if (currentTemplate?.id && dados) {
      StorageService.saveFormDataForTemplate(currentTemplate.id, dados);
    }
  }, [dados, currentTemplate?.id]);

  // Hook de Preferências Visuais
  const {
    sidebarWidth,
    setSidebarWidth,
    sidebarCollapsed,
    setSidebarCollapsed,
    toolbarLateral,
    setToolbarLateral,
    zoomA4,
    setZoomA4,
    zoomFluido,
    setZoomFluido,
    modoA4,
    setModoA4,
    variaveisVermelhasWord,
    setVariaveisVermelhasWord,
    darkMode,
    setDarkMode,
    numeracaoAtiva,
    setNumeracaoAtiva,
    irParaCampoAtivo,
    setIrParaCampoAtivo,
    irParaDocumentoAtivo,
    setIrParaDocumentoAtivo,
    edicaoInline,
    setEdicaoInline,
    isResizing,
    setIsResizing,
  } = usePreferencias();

  // Hook de Foco e Sincronização Bidirecional Formulário <-> Documento
  const {
    campoFocadoDoc,
    campoFocadoSidebar,
    handleFocusFieldFromSidebar,
    handleFocusFieldInSidebar,
  } = useCamposFoco({
    sidebarCollapsed,
    irParaCampoAtivo,
    setSidebarCollapsed,
    setDados,
  });

  // C. Hook de Camada Unificada de Exportações e Downloads
  const {
    copiado,
    handleExportWord,
    handleExportPdf,
    handlePrint,
    handleSaveJson,
    handleSaveZip,
    handleCopiarTexto,
  } = useDocumentExporters({
    xmlName,
    rawXml,
    dados,
    numeracaoAtiva,
    variaveisVermelhasWord,
    showToast,
  });

  // D. Hook de Gerenciamento de Modais
  const {
    isXmlEditorOpen,
    setIsXmlEditorOpen,
    openXmlEditor,
    closeXmlEditor,
    toggleXmlEditor,
    isModelModalOpen,
    setIsModelModalOpen,
    openModelModal,
    closeModelModal,
    toggleModelModal,
    closeAllModals,
  } = useModalsManager();

  // E. Hook de Atalhos Globais de Teclado
  useKeyboardShortcuts({
    onSaveJson: handleSaveJson,
    onPrint: handlePrint,
    onUndo: undo,
    onRedo: redo,
    onToggleXmlEditor: toggleXmlEditor,
    onToggleModelModal: toggleModelModal,
    onEscape: closeAllModals,
  });

  // F. Hook de Drag & Drop e Uploads de Pacotes de Arquivos
  const {
    isDraggingFile,
    handleUploadXml,
    handleUploadZip,
    handleUploadJson,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useFilePackageActions({
    xmlName,
    rawXml,
    dados,
    setDados,
    carregarXmlEJson,
    adicionarTemplateSilencioso,
    showToast,
  });

  // G. Hook de Redimensionamento do Divisor
  const { startResizing } = useSidebarResizer({
    isResizing,
    setIsResizing,
    setSidebarWidth,
  });

  // Limpeza de formulário com confirmação
  const handleClearForm = React.useCallback(() => {
    if (!modelo) return;
    if (confirm(`Deseja limpar todos os dados preenchidos no documento "${xmlName}"?`)) {
      resetFormState(construirEstadoInicial(modelo.formulario.campos));
      showToast('Formulário limpo com sucesso.');
    }
  }, [modelo, xmlName, resetFormState, showToast]);

  // Handlers de controle do menu lateral
  const isTelaPequena = () => typeof window !== 'undefined' && window.innerWidth < 768;

  const handleToggleSidebar = () => {
    setSidebarCollapsed(collapsedAtual => {
      const proximo = !collapsedAtual;
      if (!proximo) setToolbarLateral(false);
      return proximo;
    });
  };

  const handleDoubleToggleSidebar = () => {
    if (isTelaPequena()) return;
    setSidebarCollapsed(false);
    setToolbarLateral(valor => !valor);
  };

  const handleRestaurarToolbarTopo = () => {
    setToolbarLateral(false);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans select-none"
    >
      {/* Notificação Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Overlay Visual de Drag & Drop */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-blue-600/20 backdrop-blur-xs border-4 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
          <div className="bg-white p-6 rounded-2xl shadow-2xl border border-blue-200 text-center space-y-2 max-w-sm mx-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto text-xl font-bold">
              +
            </div>
            <h3 className="text-base font-bold text-slate-800">Solte os arquivos aqui</h3>
            <p className="text-xs text-slate-500">
              Arraste XML, JSON, ambos juntos (XML + JSON) ou um Pacote ZIP (.zip) para carregamento automático.
            </p>
          </div>
        </div>
      )}

      {/* Área de Trabalho Dividida (Split Screen) */}
      <div className="flex-1 flex overflow-hidden relative">
        {modelo ? (
          <>
            {/* Barra Lateral do Formulário */}
            <ErrorBoundary fallbackTitle="Erro ao carregar o formulário lateral">
              <Sidebar
                estrutura={modelo.formulario}
                dados={dados}
                onChange={updateField}
                onFieldFocus={handleFocusFieldFromSidebar}
                campoFocadoSidebar={campoFocadoSidebar}
                deslocarSidebar={irParaCampoAtivo}
                collapsed={sidebarCollapsed}
                onToggleCollapse={handleToggleSidebar}
                onDoubleToggleCollapse={handleDoubleToggleSidebar}
                toolbarLateral={toolbarLateral}
                onToggleToolbarLateral={handleRestaurarToolbarTopo}
                sidebarWidth={sidebarWidth}
                headerActions={
                  <SidebarToolbar
                    customTemplates={customTemplates}
                    onRemoveCustomTemplate={handleRemoveCustomTemplate}
                    currentXmlName={xmlName}
                    onSelectTemplate={handleSelectTemplate}
                    onToggleSidebar={handleToggleSidebar}
                    onDoubleToggleSidebar={handleDoubleToggleSidebar}
                    onUploadXml={handleUploadXml}
                    onUploadJson={handleUploadJson}
                    onUploadZip={handleUploadZip}
                    onSaveJson={handleSaveJson}
                    onSaveZip={handleSaveZip}
                    onExportWord={handleExportWord}
                    onExportPdf={handleExportPdf}
                    onPrint={handlePrint}
                    onOpenXmlEditor={openXmlEditor}
                    onOpenModelModal={openModelModal}
                    onClearForm={handleClearForm}
                    variaveisVermelhasWord={variaveisVermelhasWord}
                    onToggleVariaveisVermelhas={() => setVariaveisVermelhasWord(v => !v)}
                    numeracaoAtiva={numeracaoAtiva}
                    onToggleNumeracao={() => setNumeracaoAtiva(!numeracaoAtiva)}
                    edicaoInline={edicaoInline}
                    onToggleEdicaoInline={() => setEdicaoInline(!edicaoInline)}
                    irParaCampoAtivo={irParaCampoAtivo}
                    onToggleIrParaCampo={() => {
                      setIrParaCampoAtivo(prev => {
                        const next = !prev;
                        showToast(next ? 'Ir para o Campo: Ativado (←)' : 'Ir para o Campo: Desativado');
                        return next;
                      });
                    }}
                    irParaDocumentoAtivo={irParaDocumentoAtivo}
                    onToggleIrParaDocumento={() => {
                      setIrParaDocumentoAtivo(prev => {
                        const next = !prev;
                        showToast(next ? 'Ir para o Documento: Ativado (→)' : 'Ir para o Documento: Desativado');
                        return next;
                      });
                    }}
                    modoA4={modoA4}
                    onToggleModoA4={() => setModoA4(m => !m)}
                    darkMode={darkMode}
                    onToggleDarkMode={() => setDarkMode(m => !m)}
                    collapsed={toolbarLateral || sidebarCollapsed}
                    zoom={modoA4 ? zoomA4 : zoomFluido}
                    onZoomIn={() => {
                      if (modoA4) {
                        setZoomA4(z => Math.min(200, z + 10));
                      } else {
                        setZoomFluido(z => Math.min(200, z + 10));
                      }
                    }}
                    onZoomOut={() => {
                      if (modoA4) {
                        setZoomA4(z => Math.max(50, z - 10));
                      } else {
                        setZoomFluido(z => Math.max(50, z - 10));
                      }
                    }}
                    onResetZoom={() => {
                      if (modoA4) {
                        setZoomA4(100);
                        showToast('Zoom da página A4 restaurado para 100%');
                      } else {
                        setZoomFluido(100);
                        showToast('Tamanho da fonte restaurado para 100%');
                      }
                    }}
                    onCopiarTexto={handleCopiarTexto}
                    copiado={copiado}
                  />
                }
              />
            </ErrorBoundary>

            {/* Divisor Redimensionável com Arraste */}
            {!sidebarCollapsed && (
              <div
                onMouseDown={startResizing}
                onDoubleClick={() => {
                  const defaultWidth = Math.round(window.innerWidth * 0.33);
                  setSidebarWidth(Math.max(280, Math.min(defaultWidth, 800)));
                  showToast('Largura do formulário restaurada para 33%');
                }}
                className={`w-[2px] hover:w-[4px] bg-slate-300 hover:bg-blue-500 cursor-col-resize shrink-0 transition-all z-20 relative group ${
                  isResizing ? 'bg-blue-600 w-[4px]' : ''
                }`}
                title="Arraste para redimensionar (Duplo clique para restaurar 33%)"
              >
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </div>
            )}

            {/* Visualizador do Documento em Tempo Real */}
            <ErrorBoundary fallbackTitle="Erro ao carregar o visualizador do documento">
              <DocumentViewer
                conteudo={modelo.conteudo}
                dados={dados}
                estrutura={modelo.formulario}
                ultimoCampoAlterado={ultimoCampoAlterado}
                versaoCampoAlterado={versaoCampoAlterado}
                origemCampoAlterado={origemCampoAlterado}
                campoFocadoDoc={campoFocadoDoc}
                onFocusField={handleFocusFieldInSidebar}
                onUpdateField={updateField}
                numeracaoAtiva={numeracaoAtiva}
                edicaoInline={edicaoInline}
                irParaCampoAtivo={irParaCampoAtivo}
                deslocarDocumento={irParaDocumentoAtivo}
                variaveisVermelhasWord={variaveisVermelhasWord}
                nomeDocumento={xmlName}
                zoom={modoA4 ? zoomA4 : zoomFluido}
                modoA4={modoA4}
              />
            </ErrorBoundary>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <p className="text-sm font-semibold text-slate-700">
              {xmlError ? `Erro ao carregar template: ${xmlError}` : 'Erro ao carregar o template XML.'}
            </p>
            <p className="text-xs mt-1">Abra o editor de código para verificar e corrigir a estrutura.</p>
            <button
              type="button"
              onClick={openXmlEditor}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-500 transition"
            >
              Abrir Editor de Código (XML & JSON)
            </button>
          </div>
        )}
      </div>

      {/* Modal de Variáveis e Inspetor de Modelo */}
      {modelo && (
        <ModelModal
          isOpen={isModelModalOpen}
          onClose={closeModelModal}
          modelo={{ ...modelo, dados }}
          rawXml={rawXml}
          xmlName={xmlName}
          onUpdateField={updateField}
          onUpdateMultipleFields={novosDados => {
            setDados(prev => ({
              ...prev,
              ...novosDados,
            }));
            showToast('Dados atualizados com sucesso!');
          }}
          onApplyAll={aplicarNovoXmlEJson}
          onApplyXml={(novoXml, novoNome) => aplicarNovoXmlEJson(novoXml, dados, novoNome)}
        />
      )}

      {/* Modal do Editor de Código-Fonte (XML & JSON) */}
      <XmlEditorModal
        isOpen={isXmlEditorOpen}
        onClose={closeXmlEditor}
        xmlContent={rawXml}
        dadosContent={dados}
        onApply={aplicarNovoXmlEJson}
        xmlName={xmlName}
      />
    </div>
  );
}
