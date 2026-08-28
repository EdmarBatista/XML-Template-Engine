/**
 * ============================================================================
 * useModalsManager (Gerenciador de Abertura e Fechamento dos Modais)
 * ============================================================================
 *
 * Atribuições & Responsabilidades:
 * 1. Controlar os estados booleanos de visibilidade dos modais do App.
 *    - `isXmlEditorOpen`: Editor de código-fonte XML e dados JSON.
 *    - `isModelModalOpen`: Inspetor de modelo, variáveis e AST intermediário.
 * 2. Disponibilizar métodos utilitários declarativos (`openXmlEditor`, `closeXmlEditor`,
 *    `openModelModal`, `closeModelModal`, `closeAllModals`).
 */

import React from 'react';

export function useModalsManager() {
  const [isXmlEditorOpen, setIsXmlEditorOpen] = React.useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = React.useState(false);

  const openXmlEditor = React.useCallback(() => setIsXmlEditorOpen(true), []);
  const closeXmlEditor = React.useCallback(() => setIsXmlEditorOpen(false), []);
  const toggleXmlEditor = React.useCallback(() => setIsXmlEditorOpen(prev => !prev), []);

  const openModelModal = React.useCallback(() => setIsModelModalOpen(true), []);
  const closeModelModal = React.useCallback(() => setIsModelModalOpen(false), []);
  const toggleModelModal = React.useCallback(() => setIsModelModalOpen(prev => !prev), []);

  const closeAllModals = React.useCallback(() => {
    setIsXmlEditorOpen(false);
    setIsModelModalOpen(false);
  }, []);

  return {
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
  };
}
