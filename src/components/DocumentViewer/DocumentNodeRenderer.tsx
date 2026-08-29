import React from 'react';
import { AstNode, FormStructure, NumberingContext } from '../../types';
import { renderDocumentAstBlocks } from './blocks';
import { extrairTooltip } from './inline';

export { extrairTooltip };

export interface DocumentNodeRendererProps {
  nodes: AstNode[];
  dados: Record<string, any>;
  estrutura: FormStructure;
  destaquesAtivos: Record<string, number>;
  onFocusField: (fieldId: string) => void;
  onUpdateField: (fieldId: string, value: any, origem?: string) => void;
  edicaoInline: boolean;
  variaveisVermelhasWord: boolean;
  fontScale: number;
  contextoNumeracao: NumberingContext;
  pathPrefix?: string;
  contextoLocal?: Record<string, any>;
  nivelSecao?: number;
}

/**
 * ============================================================================
 * DocumentNodeRenderer (Despachante Central e Ponto de Entrada da AST)
 * ============================================================================
 *
 * Responsabilidades:
 * - Atua como orquestrador e ponto de entrada da árvore de sintaxe abstrata (AST).
 * - Cria um contexto isolado de numeração para a passagem de renderização atual.
 * - Delega a resolução especializada para os domínios modulares:
 *   * `blocks/`: Gerenciamento e despacho de blocos estruturais (seção, parágrafo, tabela, lista).
 *   * `inline/`: Resolução de nós e variáveis inline (var, máscaras, texto, acessos a tabela).
 *   * `logic/`: Avaliação e renderização de nós condicionais (<if expr="...">).
 * ============================================================================
 */
export const DocumentNodeRenderer: React.FC<DocumentNodeRendererProps> = ({
  nodes,
  dados,
  estrutura,
  destaquesAtivos,
  onFocusField,
  onUpdateField,
  edicaoInline,
  variaveisVermelhasWord,
  fontScale,
  contextoNumeracao,
  pathPrefix = 'blk',
  contextoLocal,
  nivelSecao = 0,
}) => {
  // Cria contexto de numeração fresco e isolado para esta passagem de renderização
  const ctxNumLocal: NumberingContext = {
    prefixo: contextoNumeracao?.prefixo || '',
    next: contextoNumeracao?.next || 1,
    lastNumber: contextoNumeracao?.lastNumber || '',
    habilitado: Boolean(contextoNumeracao?.habilitado),
    numerarBlocos: Boolean(contextoNumeracao?.numerarBlocos),
  };

  const elementos = renderDocumentAstBlocks(
    nodes,
    ctxNumLocal,
    pathPrefix,
    contextoLocal,
    nivelSecao,
    {
      dados,
      estrutura,
      destaquesAtivos,
      onFocusField,
      onUpdateField,
      edicaoInline,
      variaveisVermelhasWord,
      fontScale,
      contextoNumeracao: ctxNumLocal,
    }
  );

  return <>{elementos}</>;
};
