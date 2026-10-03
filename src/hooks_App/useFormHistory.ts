/**
 * ============================================================================
 * useFormHistory (Gerenciador de Estado, Histórico e Modificações do Formulário)
 * ============================================================================
 *
 * Atribuições & Responsabilidades:
 * 1. Manter o estado `dados: DadosDocumento` dos campos do documento ativo.
 * 2. Gerenciar histórico de Desfazer/Refazer (Undo/Redo) com pilha de snapshots.
 * 3. Indicar se o formulário possui alterações não salvas (`isDirty`).
 * 4. Fornecer atualizações pontuais (`updateField`) e em lote (`batchUpdateFields`).
 * 5. Gerenciar limpeza e redefinição dos campos do formulário.
 * 6. Integrar a emissão de destaques e rastreamento do último campo modificado.
 *
 * Dados, pilha e índice vivem em UM único estado de propósito: com eles separados, cada
 * `setDados` lia o índice do closure (desatualizado dentro do mesmo lote/tick) e a pilha
 * podia ficar menor que o índice — o primeiro undo então entregava `undefined` e o hook
 * estourava em `isDirty`. Com um estado só, cada atualização é função do estado anterior.
 */

import type { DadosDocumento, ValorCampo } from '../types';

import React from 'react';

export interface FormHistoryOptions {
  initialData?: DadosDocumento;
  maxHistory?: number;
  onDataChange?: (data: DadosDocumento) => void;
}

interface EstadoFormulario {
  dados: DadosDocumento;
  /** Snapshots do mais antigo para o mais recente. */
  pilha: DadosDocumento[];
  /** Posição atual dentro da pilha (o que o undo devolve é `pilha[indice - 1]`). */
  indice: number;
}

export function useFormHistory(options: FormHistoryOptions = {}) {
  const { initialData = {}, maxHistory = 50, onDataChange } = options;

  const [estado, setEstado] = React.useState<EstadoFormulario>(() => ({
    dados: initialData,
    pilha: [initialData],
    indice: 0,
  }));

  // Referência do estado original inicial para cálculo de isDirty
  const baselineDataRef = React.useRef<DadosDocumento>(initialData);

  // Metadados de rastreamento do último campo alterado
  const [ultimoCampoAlterado, setUltimoCampoAlterado] = React.useState<string | null>(null);
  const [versaoCampoAlterado, setVersaoCampoAlterado] = React.useState(0);
  const [origemCampoAlterado, setOrigemCampoAlterado] = React.useState<string | null>(null);

  // Sincroniza quando o baseline/initialData muda externamente (ex.: ao trocar de template)
  const resetFormState = React.useCallback((novoEstado: DadosDocumento) => {
    baselineDataRef.current = novoEstado;
    setEstado({ dados: novoEstado, pilha: [novoEstado], indice: 0 });
    setUltimoCampoAlterado(null);
  }, []);

  // Setter compatível com React.Dispatch<React.SetStateAction<...>>
  const setDados = React.useCallback(
    (action: React.SetStateAction<DadosDocumento>) => {
      setEstado(prev => {
        const next = typeof action === 'function' ? action(prev.dados) : action;
        // Descarta o futuro (o que estava à frente do índice) e empurra o novo estado
        const corte = prev.pilha.slice(0, prev.indice + 1);
        const comNovo = [...corte, next];
        const pilha = comNovo.length > maxHistory ? comNovo.slice(comNovo.length - maxHistory) : comNovo;
        if (onDataChange) onDataChange(next);
        return { dados: next, pilha, indice: pilha.length - 1 };
      });
    },
    [maxHistory, onDataChange]
  );

  // Atualização pontual de campo único
  const updateField = React.useCallback(
    (id: string, value: ValorCampo, origem = 'painel') => {
      setDados(prev => ({ ...prev, [id]: value }));
      setUltimoCampoAlterado(id);
      setOrigemCampoAlterado(origem);
      setVersaoCampoAlterado(v => v + 1);
    },
    [setDados]
  );

  // Atualização em lote de múltiplos campos
  const batchUpdateFields = React.useCallback(
    (novosCampos: DadosDocumento, origem = 'lote') => {
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
  const canUndo = estado.indice > 0;
  const undo = React.useCallback(() => {
    if (estado.indice === 0) return;
    const alvo = estado.pilha[estado.indice - 1];
    setEstado(prev => {
      if (prev.indice === 0) return prev;
      const indice = prev.indice - 1;
      return { dados: prev.pilha[indice], pilha: prev.pilha, indice };
    });
    setVersaoCampoAlterado(v => v + 1);
    setOrigemCampoAlterado('undo');
    if (onDataChange) onDataChange(alvo);
  }, [estado.indice, estado.pilha, onDataChange]);

  // Refazer (Redo)
  const canRedo = estado.indice < estado.pilha.length - 1;
  const redo = React.useCallback(() => {
    if (estado.indice >= estado.pilha.length - 1) return;
    const alvo = estado.pilha[estado.indice + 1];
    setEstado(prev => {
      if (prev.indice >= prev.pilha.length - 1) return prev;
      const indice = prev.indice + 1;
      return { dados: prev.pilha[indice], pilha: prev.pilha, indice };
    });
    setVersaoCampoAlterado(v => v + 1);
    setOrigemCampoAlterado('redo');
    if (onDataChange) onDataChange(alvo);
  }, [estado.indice, estado.pilha, onDataChange]);

  // Checagem de formulário modificado em relação ao baseline
  const isDirty = React.useMemo(() => {
    const base = baselineDataRef.current;
    const keysAtual = Object.keys(estado.dados);
    const keysBase = Object.keys(base);
    if (keysAtual.length !== keysBase.length) return true;
    return keysAtual.some(k => estado.dados[k] !== base[k]);
  }, [estado.dados]);

  return {
    dados: estado.dados,
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
