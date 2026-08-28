/**
 * ============================================================================
 * useKeyboardShortcuts (Gerenciador Global de Atalhos de Teclado)
 * ============================================================================
 *
 * Atribuições & Responsabilidades:
 * 1. Capturar eventos de teclado globais (`keydown`) com verificação segura
 *    de contexto (evita interceptar atalhos quando o usuário digita em inputs,
 *    textareas ou editores Monaco).
 * 2. Atalhos suportados:
 *    - Ctrl+S / Cmd+S: Baixar preenchimento JSON.
 *    - Ctrl+P / Cmd+P: Imprimir / Exportar documento.
 *    - Ctrl+Z / Cmd+Z: Desfazer alteração no formulário (Undo).
 *    - Ctrl+Y / Cmd+Shift+Z: Refazer alteração no formulário (Redo).
 *    - Ctrl+E / Cmd+E: Abrir/fechar Editor de Código XML.
 *    - Ctrl+M / Cmd+M: Abrir/fechar Inspetor de Modelo.
 *    - Esc: Fechar modais abertos.
 */

import React from 'react';

export interface KeyboardShortcutsHandlers {
  onSaveJson?: () => void;
  onPrint?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onToggleXmlEditor?: () => void;
  onToggleModelModal?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onSaveJson,
  onPrint,
  onUndo,
  onRedo,
  onToggleXmlEditor,
  onToggleModelModal,
  onEscape,
  enabled = true,
}: KeyboardShortcutsHandlers) {
  React.useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('.monaco-editor'));

      // Esc para fechar modais sempre funciona
      if (e.key === 'Escape') {
        if (onEscape) {
          onEscape();
        }
        return;
      }

      // Atalhos combinados com Ctrl / Cmd
      if (isCtrlOrCmd) {
        const key = e.key.toLowerCase();

        // Ctrl + S -> Salvar JSON
        if (key === 's') {
          if (onSaveJson) {
            e.preventDefault();
            onSaveJson();
          }
          return;
        }

        // Ctrl + P -> Imprimir documento
        if (key === 'p') {
          if (onPrint) {
            e.preventDefault();
            onPrint();
          }
          return;
        }

        // Ctrl + E -> Abrir/fechar Editor XML
        if (key === 'e' && !isTyping) {
          if (onToggleXmlEditor) {
            e.preventDefault();
            onToggleXmlEditor();
          }
          return;
        }

        // Ctrl + M -> Abrir/fechar Modal de Modelo
        if (key === 'm' && !isTyping) {
          if (onToggleModelModal) {
            e.preventDefault();
            onToggleModelModal();
          }
          return;
        }

        // Ctrl + Z -> Undo (quando não estiver digitando em input nativo)
        if (key === 'z' && !e.shiftKey && !isTyping) {
          if (onUndo) {
            e.preventDefault();
            onUndo();
          }
          return;
        }

        // Ctrl + Y ou Ctrl + Shift + Z -> Redo
        if ((key === 'y' || (key === 'z' && e.shiftKey)) && !isTyping) {
          if (onRedo) {
            e.preventDefault();
            onRedo();
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled,
    onSaveJson,
    onPrint,
    onUndo,
    onRedo,
    onToggleXmlEditor,
    onToggleModelModal,
    onEscape,
  ]);
}
