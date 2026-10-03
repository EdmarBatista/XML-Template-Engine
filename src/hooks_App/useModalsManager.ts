/**
 * ============================================================================
 * useModalsManager (Gerenciador de Abertura e Fechamento dos Modais)
 * ============================================================================
 *
 * Atribuições & Responsabilidades:
 * 1. Controlar o estado booleano de visibilidade do modal de modelo/variáveis.
 * 2. Disponibilizar métodos utilitários declarativos (`openModelModal`, `closeModelModal`,
 *    `toggleModelModal`, `closeAllModals`).
 *
 * O estado antigo do "editor de XML" (isXmlEditorOpen, setIsXmlEditorOpen, openXmlEditor,
 * closeXmlEditor, toggleXmlEditor) foi removido: nenhum componente o consumia — a edição
 * lado a lado vive no App (`isSideBySideEditing`) e não existe modal de XML na interface.
 */

import React from 'react';

export function useModalsManager() {
  const [isModelModalOpen, setIsModelModalOpen] = React.useState(false);

  const openModelModal = React.useCallback(() => setIsModelModalOpen(true), []);
  const closeModelModal = React.useCallback(() => setIsModelModalOpen(false), []);
  const toggleModelModal = React.useCallback(() => setIsModelModalOpen(prev => !prev), []);

  /** Fecha tudo que estiver aberto (hoje só o modal de modelo; mantido para o atalho Esc). */
  const closeAllModals = React.useCallback(() => {
    setIsModelModalOpen(false);
  }, []);

  return {
    isModelModalOpen,
    openModelModal,
    closeModelModal,
    toggleModelModal,
    closeAllModals,
  };
}
