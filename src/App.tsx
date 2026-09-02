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
import { AlertTriangle, RotateCcw, X, Trash2 } from 'lucide-react';
import { DocumentViewer } from './components/DocumentViewer';
import { ModelModal } from './components/ModelModal';
import { ImportWordModal } from './components/ImportWordModal';
import { SidebarToolbar } from './components/SidebarToolbar';
import { Sidebar } from './components/Sidebar';
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
import { DEFAULT_TEMPLATES, TemplateItem } from './data/defaultTemplates';
import { StorageService } from './services/storageService';
import { construirEstadoInicial } from './utils/xmlParser';

export default function App() {
  // Notificações visuais
  const { toastMessage, showToast } = useToast();

  // Estado inicial derivado do LocalStorage para o template atual
  const initialFormState = React.useMemo(() => {
    const defaultTemplateId = (() => {
      try {
        const savedId = StorageService.getLastTemplateId();
        if (savedId) return savedId;
        const customList = StorageService.loadCustomTemplates();
        if (customList.length > 0) return customList[0].id;
      } catch {}
      return DEFAULT_TEMPLATES[0].id;
    })();

    const saved = StorageService.loadFormData(defaultTemplateId);
    if (saved && Object.keys(saved).length > 0) {
      return saved;
    }
    const tpl = DEFAULT_TEMPLATES.find(t => t.id === defaultTemplateId);
    if (tpl?.json) {
      try {
        const parsed = JSON.parse(tpl.json);
        return parsed.dados ? parsed.dados : parsed;
      } catch {}
    }
    return {};
  }, []);

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
  } = useFormHistory({ initialData: initialFormState });

  // B. Hook de Ciclo de Vida do Modelo, Templates e Engine XML
  const {
    customTemplates,
    currentTemplate,
    rawXml,
    xmlName,
    xmlParts,
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

  const handleNewTemplate = () => {
    import('./utils/xmlEditorCompletions').then(({ TEMPLATE_NOVO_DOCUMENTO }) => {
      carregarXmlEJson('Novo Documento.xml', TEMPLATE_NOVO_DOCUMENTO, null, undefined);
      showToast('Novo modelo em branco criado.');
    });
  };

  // Inicializa e sincroniza dados do template ativo no LocalStorage
  React.useEffect(() => {
    if (modelo) {
      const saved = StorageService.loadFormData(currentTemplate.id);
      if (saved && Object.keys(saved).length > 0) {
        resetFormState(saved);
      } else if (currentTemplate.json) {
        try {
          const parsed = JSON.parse(currentTemplate.json);
          const payload = parsed.dados ? parsed.dados : parsed;
          resetFormState(payload);
        } catch {
          const initial = construirEstadoInicial(modelo.formulario.campos);
          resetFormState(initial);
        }
      } else {
        const initial = construirEstadoInicial(modelo.formulario.campos);
        resetFormState(initial);
      }
    }
  }, [currentTemplate.id]);

  // Persiste dados no LocalStorage em tempo real quando alterados
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
    xmlParts,
    dados,
    numeracaoAtiva,
    variaveisVermelhasWord,
    showToast,
  });

  // D. Hook de Gerenciamento de Modais
  const {
    setIsXmlEditorOpen,
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
    onToggleModelModal: toggleModelModal,
    onEscape: closeAllModals,
  });

  const [wordFileToConvert, setWordFileToConvert] = React.useState<File | null>(null);
  const [isConvertingWord, setIsConvertingWord] = React.useState(false);

  const handleConvertWord = async () => {
    if (!wordFileToConvert) return;
    setIsConvertingWord(true);
    try {
      const { converterDocxParaModeloXml } = await import('./utils/docxToXmlConverter');
      const { xml, jsonInicial, comentariosXml, nomeSugerido } = await converterDocxParaModeloXml(wordFileToConvert);
      
      // Armazena ou apenas logs comentariosXml por enquanto conforme solicitado
      console.log('Comentários extraídos (para uso futuro):', comentariosXml);
      
      carregarXmlEJson(xml, nomeSugerido, jsonInicial, undefined);
      showToast(`Modelo importado com sucesso: ${nomeSugerido}`);
      setWordFileToConvert(null);
      openModelModal(); // Abre o painel para edição imediata
    } catch (error: any) {
      console.error(error);
      alert('Erro ao converter o documento Word: ' + error.message);
    } finally {
      setIsConvertingWord(false);
    }
  };

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
    xmlParts,
    dados,
    setDados,
    carregarXmlEJson,
    adicionarTemplateSilencioso,
    onWordFileDropped: (file: File) => setWordFileToConvert(file),
    showToast,
  });

  // G. Hook de Redimensionamento do Divisor
  const { startResizing } = useSidebarResizer({
    isResizing,
    setIsResizing,
    setSidebarWidth,
  });

  // Carregar string JSON pré-preenchida de um template
  const handleLoadJsonString = React.useCallback(
    (jsonStr: string) => {
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed && typeof parsed === 'object') {
          const payload = parsed.dados ? parsed.dados : parsed;
          resetFormState(payload);
          if (currentTemplate?.id) {
            StorageService.saveFormDataForTemplate(currentTemplate.id, payload);
          }
          showToast('Preenchimento do template carregado com sucesso!');
        }
      } catch (err: any) {
        showToast('Erro ao carregar dados do template: ' + err.message);
      }
    },
    [resetFormState, currentTemplate?.id, showToast]
  );

  // Estado do modal de confirmação de limpeza
  const [showClearConfirmModal, setShowClearConfirmModal] = React.useState(false);

  // Estado do modal de exclusão de template
  const [templateToDelete, setTemplateToDelete] = React.useState<TemplateItem | null>(null);

  // Solicitar limpeza de formulário
  const handleClearForm = React.useCallback(() => {
    if (!modelo) return;
    setShowClearConfirmModal(true);
  }, [modelo]);

  // Executar a limpeza confirmada
  const handleConfirmClear = React.useCallback(() => {
    if (!modelo) return;
    const initial = construirEstadoInicial(modelo.formulario.campos);
    resetFormState(initial);
    if (currentTemplate?.id) {
      StorageService.saveFormDataForTemplate(currentTemplate.id, initial);
    }
    setShowClearConfirmModal(false);
    showToast('Formulário limpo com sucesso.');
  }, [modelo, resetFormState, currentTemplate?.id, showToast]);

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
              Arraste Modelo, Dados, ambos juntos ou um Pacote ZIP para carregamento automático.
            </p>
          </div>
        </div>
      )}

      {/* Área de Trabalho Dividida (Split Screen) */}
      <div className="flex-1 flex overflow-hidden relative">
        {modelo ? (
          <>
            {/* Barra Lateral do Formulário */}
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
                    onRemoveCustomTemplate={setTemplateToDelete}
                    currentXmlName={xmlName}
                    onSelectTemplate={handleSelectTemplate}
                    onNewTemplate={handleNewTemplate}
                    onLoadJson={handleLoadJsonString}
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

            {/* Divisor Redimensionável com Arraste */}
            {!sidebarCollapsed && (
              <div
                onMouseDown={startResizing}
                onDoubleClick={() => {
                  const defaultWidth = Math.round(window.innerWidth * 0.33);
                  setSidebarWidth(Math.max(280, Math.min(defaultWidth, 800)));
                  showToast('Largura do formulário restaurada para 33%');
                }}
                className={`w-[4px] -ml-[2px] -mr-[2px] bg-transparent hover:bg-blue-500/20 cursor-col-resize shrink-0 transition-colors z-20 relative group ${
                  isResizing ? 'bg-blue-500/30' : ''
                }`}
                title="Arraste para redimensionar (Duplo clique para restaurar 33%)"
              >
                {/* Linha visual central estática sem alterar largura de layout */}
                <div
                  className={`w-[2px] h-full mx-auto transition-colors ${
                    isResizing
                      ? 'bg-blue-600'
                      : 'bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-500'
                  }`}
                />
                {/* Área de clique estendida invisível */}
                <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
              </div>
            )}

            {/* Visualizador do Documento em Tempo Real */}
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
                comentarios={modelo.comentarios}
              />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {xmlError ? `Erro ao carregar template: ${xmlError}` : 'Erro ao carregar o template XML.'}
            </p>
            <p className="text-xs mt-1 text-slate-400">Abra o editor de código para verificar e corrigir a estrutura ou restaure um modelo padrão.</p>
            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={openModelModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-500 transition shadow-xs"
              >
                Abrir Painel de Variáveis / Editor XML
              </button>
              <button
                type="button"
                onClick={() => handleSelectTemplate(DEFAULT_TEMPLATES[0])}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-md text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
              >
                Restaurar Modelo Padrão
              </button>
            </div>
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
            xmlParts={xmlParts}
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

      {/* Modal de Confirmação para Limpar Formulário */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 text-slate-800 dark:text-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-lg shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Limpar Formulário
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Tem certeza que deseja limpar todos os campos preenchidos do documento{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    "{xmlName}"
                  </span>
                  ? Essa ação irá resetar os valores salvos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="px-3.5 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 rounded-lg transition flex items-center gap-1.5 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar Formulário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Excluir Template */}
      {templateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 text-slate-800 dark:text-slate-100 space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-lg shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Excluir Modelo
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  O que você deseja excluir do modelo{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    "{templateToDelete.nome}"
                  </span>
                  ?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTemplateToDelete(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {templateToDelete.json ? (
                <>
                  <button
                    onClick={() => {
                      handleRemoveCustomTemplate(templateToDelete, true, false);
                      setTemplateToDelete(null);
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition group"
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 text-sm">
                      Apagar Modelo
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Remove o documento da lista, mas mantêm os dados prepreenchidos salvo para usar depois.
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      handleRemoveCustomTemplate(templateToDelete, false, true);
                      setTemplateToDelete(null);
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition group"
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 text-sm">
                      Apagar Dados
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Mantém o modelo na lista, mas remove os dados preenchidos históricos.
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      handleRemoveCustomTemplate(templateToDelete, true, true);
                      setTemplateToDelete(null);
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition group"
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 text-sm">
                      Apagar Tudo (Modelo e Dados)
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Remove o modelo da lista e deleta todos os dados associados.
                    </div>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    handleRemoveCustomTemplate(templateToDelete, true, false);
                    setTemplateToDelete(null);
                  }}
                  className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition group flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 text-sm">
                      Excluir Modelo
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Remove o modelo XML selecionado da sua lista.
                    </div>
                  </div>
                  <Trash2 className="w-5 h-5 text-slate-400 group-hover:text-red-500" />
                </button>
              )}
            </div>
            
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setTemplateToDelete(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ImportWordModal 
        file={wordFileToConvert}
        isOpen={!!wordFileToConvert}
        onClose={() => setWordFileToConvert(null)}
        onConfirm={handleConvertWord}
        isConverting={isConvertingWord}
      />
    </div>
  );
}
