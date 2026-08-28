/**
 * ============================================================================
 * useFormHistory (Gerenciador de Estado, Histórico e Modificações do Formulário)
 * ============================================================================
 *
 * Atribuições & Responsabilidades:
 * 1. Manter o estado `dados: Record<string, any>` dos campos do documento ativo.
 * 2. Gerenciar histórico de Desfazer/Refazer (Undo/Redo) com pilha de snapshots.
 * 3. Indicar se o formulário possui alterações não salvas (`isDirty`).
 * 4. Fornecer atualizações pontuais (`updateField`) e em lote (`batchUpdateFields`).
 * 5. Gerenciar limpeza e redefinição dos campos do formulário.
 * 6. Integrar a emissão de destaques e rastreamento do último campo modificado.
 */

import React from 'react';

export interface FormHistoryOptions {
  initialData?: Record<string, any>;
  maxHistory?: number;
  onDataChange?: (data: Record<string, any>) => void;
}

export function useFormHistory(options: FormHistoryOptions = {}) {
  const { initialData = {}, maxHistory = 50, onDataChange } = options;

  // Estado dos dados do formulário
  const [dados, setDadosState] = React.useState<Record<string, any>>(initialData);

  // Pilha de histórico para Undo / Redo
  const [history, setHistory] = React.useState<Record<string, any>[]>([initialData]);
  const [currentIndex, setCurrentIndex] = React.useState<number>(0);

  // Referência do estado original inicial para cálculo de isDirty
  const baselineDataRef = React.useRef<Record<string, any>>(initialData);

  // Metadados de rastreamento do último campo alterado
  const [ultimoCampoAlterado, setUltimoCampoAlterado] = React.useState<string | null>(null);
  const [versaoCampoAlterado, setVersaoCampoAlterado] = React.useState(0);
  const [origemCampoAlterado, setOrigemCampoAlterado] = React.useState<string | null>(null);

  // Sincroniza quando o baseline/initialData muda externamente (ex.: ao trocar de template)
  const resetFormState = React.useCallback((novoEstado: Record<string, any>) => {
    baselineDataRef.current = novoEstado;
    setDadosState(novoEstado);
    setHistory([novoEstado]);
    setCurrentIndex(0);
    setUltimoCampoAlterado(null);
  }, []);

  // Setter compatível com React.Dispatch<React.SetStateAction<...>>
  const setDados = React.useCallback(
    (action: React.SetStateAction<Record<string, any>>) => {
      setDadosState(prev => {
        const next = typeof action === 'function' ? action(prev) : action;
        // Empurra para o histórico
        setHistory(prevHist => {
          const cut = prevHist.slice(0, currentIndex + 1);
          const nextHist = [...cut, next];
          if (nextHist.length > maxHistory) {
            return nextHist.slice(nextHist.length - maxHistory);
          }
          return nextHist;
        });
        setCurrentIndex(prevIdx => Math.min(prevIdx + 1, maxHistory - 1));
        if (onDataChange) onDataChange(next);
        return next;
      });
    },
    [currentIndex, maxHistory, onDataChange]
  );

  // Atualização pontual de campo único
  const updateField = React.useCallback(
    (id: string, value: any, origem = 'painel') => {
      setDados(prev => ({ ...prev, [id]: value }));
      setUltimoCampoAlterado(id);
      setOrigemCampoAlterado(origem);
      setVersaoCampoAlterado(v => v + 1);
    },
    [setDados]
  );

  // Atualização em lote de múltiplos campos
  const batchUpdateFields = React.useCallback(
    (novosCampos: Record<string, any>, origem = 'lote') => {
      setDados(prev => ({ ...prev, ...novosCampos }));
      const chaves = Object.keys(novosCampos);
      if (chaves.length > 0) {
        setUltimoCampoAlterado(chaves[chaves.length - 1]);
      }
      setOrigemCampoAlterado(origem);
      setVersaoCampoAlterado(v => v + 1);
    },
    [setDados]
  );

  // Desfazer (Undo)
  const canUndo = currentIndex > 0;
  const undo = React.useCallback(() => {
    if (!canUndo) return;
    const targetIdx = currentIndex - 1;
    const targetData = history[targetIdx];
    setCurrentIndex(targetIdx);
    setDadosState(targetData);
    setVersaoCampoAlterado(v => v + 1);
    setOrigemCampoAlterado('undo');
    if (onDataChange) onDataChange(targetData);
  }, [canUndo, currentIndex, history, onDataChange]);

  // Refazer (Redo)
  const canRedo = currentIndex < history.length - 1;
  const redo = React.useCallback(() => {
    if (!canRedo) return;
    const targetIdx = currentIndex + 1;
    const targetData = history[targetIdx];
    setCurrentIndex(targetIdx);
    setDadosState(targetData);
    setVersaoCampoAlterado(v => v + 1);
    setOrigemCampoAlterado('redo');
    if (onDataChange) onDataChange(targetData);
  }, [canRedo, currentIndex, history, onDataChange]);

  // Checagem de formulário modificado em relação ao baseline
  const isDirty = React.useMemo(() => {
    const base = baselineDataRef.current;
    const keysAtual = Object.keys(dados);
    const keysBase = Object.keys(base);
    if (keysAtual.length !== keysBase.length) return true;
    return keysAtual.some(k => dados[k] !== base[k]);
  }, [dados]);

  return {
    dados,
    setDados,
    updateField,
    batchUpdateFields,
    undo,
    redo,
    canUndo,
    canRedo,
    isDirty,
    resetFormState,
    ultimoCampoAlterado,
    versaoCampoAlterado,
    origemCampoAlterado,
  };
}
