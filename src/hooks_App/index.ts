/**
 * ============================================================================
 * Módulo de Hooks do Componente Principal (hooks_App)
 * ============================================================================
 *
 * Este diretório organiza a decomposição modular da arquitetura do `App.tsx`,
 * distribuindo as responsabilidades em hooks customizados de responsabilidade única:
 *
 * 1. useFormHistory:
 *    - Gerenciamento de estado `dados` do formulário com pilha de histórico (Undo/Redo).
 *    - Detecção de modificações pendentes (`isDirty`).
 *    - Atualizações pontuais (`updateField`) e em lote (`batchUpdateFields`).
 *    - Metadados de rastreamento do último campo alterado.
 *
 * 2. useDocumentEngine:
 *    - Ciclo de vida dos templates e compilação de XML para AST (`IntermediateModel`).
 *    - Tratamento e sinalização de erros de sintaxe XML (`xmlError`).
 *    - Persistência e alternância de modelos nativos e customizados no LocalStorage.
 *
 * 3. useDocumentExporters:
 *    - Camada unificada de exportações: Word (.docx), PDF (.pdf), Impressão nativa.
 *    - Download de preenchimento JSON e empacotamento de pacotes ZIP (XML + JSON).
 *    - Cópia do texto gerado para a área de transferência com feedback visual.
 *
 * 4. useModalsManager:
 *    - Controle dos estados de visibilidade dos modais (Editor XML, Inspetor de Modelo).
 *    - Métodos auxiliares de abertura, fechamento e toggle.
 *
 * 5. useKeyboardShortcuts:
 *    - Listener global de eventos de teclado (Ctrl+S, Ctrl+P, Ctrl+Z, Ctrl+Y, Ctrl+E, Ctrl+M, Esc).
 *
 * 6. useFilePackageActions:
 *    - Processamento de Drag & Drop e upload de arquivos (.xml, .json, .zip).
 *
 * 7. useSidebarResizer:
 *    - Controle de arrasto e limites do divisor entre formulário e visualizador.
 * ============================================================================
 */

export * from './useFormHistory';
export * from './useDocumentEngine';
export * from './useDocumentExporters';
export * from './useModalsManager';
export * from './useKeyboardShortcuts';
export * from './useFilePackageActions';
export * from './useSidebarResizer';
