/**
 * ============================================================================
 * DocumentListNode
 * ============================================================================
 *
 * Atribuições & Responsabilidades:
 * 1. Renderizar listas ordenadas (<ol>, <lista tipo="numerada">) e não-ordenadas
 *    (<ul>, <lista>) com estilização tipográfica adaptativa.
 * 2. Processar recursivamente os itens de lista (<item>, <li>).
 * 3. Suportar blocos condicionais (<if>) aninhados dentro da estrutura de itens da lista.
 * 4. Suportar iterações dinâmicas (<foreach>) diretamente dentro da lista, permitindo
 *    a geração de itens a partir de arrays de dados e tabelas dinâmicas com injeção
 *    de índices auxiliares (_indice, index, numero).
 * 5. Emitir atributos semânticos `data-word-type="lista"` e `data-word-type="item-lista"`
 *    para exportação precisa no Word (.docx) e PDF.
 */

import React from 'react';
import { AstNode } from '../../../types';
import { avaliarExpressao } from '../../../utils/expressionEvaluator';
import { formatarItemForeach, obterValorPorCaminho, valoresDaLista } from '../../../utils/documentUtils';

export interface DocumentListNodeProps {
  /** Nó AST da lista (<lista>, <ul>, <ol>) */
  node: AstNode;
  /** Chave única do bloco React */
  blockKey: string;
  /** Escala da fonte aplicada */
  fontScale: number;
  /** Escopo de dados atual para interpolação e repetições */
  escopo: Record<string, any>;
  /** Função de renderização de nós inline para o corpo dos itens */
  renderInlineNodes: (
    inlineNodes: AstNode[],
    path: string,
    contextoLocal?: Record<string, any>
  ) => React.ReactNode[];
  /** Contexto local de variáveis */
  contextoLocal?: Record<string, any>;
}

/**
 * Componente que renderiza nós de lista (<lista>, <ul>, <ol>) com suporte a marcadores,
 * numeração sequencial, condicionais <if> e repetições <foreach> em itens.
 */
export const DocumentListNode: React.FC<DocumentListNodeProps> = ({
  node,
  blockKey,
  fontScale,
  escopo,
  renderInlineNodes,
  contextoLocal,
}) => {
  const numerada = node.atributos?.tipo === 'numerada' || node.tipo === 'ol';
  const ListTag = numerada ? 'ol' : 'ul';
  const listItems: React.ReactNode[] = [];

  const processarFilhosLista = (
    filhos: AstNode[],
    parentPath: string,
    localCtx?: Record<string, any>
  ) => {
    filhos.forEach((itemNode, lIdx) => {
      const itemKey = `${parentPath}_${lIdx}`;
      if (itemNode.tipo === 'item' || itemNode.tipo === 'li') {
        listItems.push(
          <li key={itemKey} data-word-type="item-lista" className="select-text">
            {renderInlineNodes(itemNode.filhos || [], itemKey, localCtx)}
          </li>
        );
      } else if (itemNode.tipo === 'if') {
        const expr = itemNode.atributos?.expr || '';
        if (avaliarExpressao(expr, { ...escopo, ...(localCtx || {}) })) {
          processarFilhosLista(itemNode.filhos || [], `${itemKey}_if`, localCtx);
        }
      } else if (itemNode.tipo === 'foreach') {
        const varName = itemNode.atributos?.var || itemNode.atributos?.item || 'item';
        const listaNome = itemNode.atributos?.lista || itemNode.atributos?.de || itemNode.atributos?.items || '';
        if (listaNome) {
          const valorListaBruto =
            escopo[listaNome] !== undefined
              ? escopo[listaNome]
              : obterValorPorCaminho(escopo, listaNome);
          const itens = valoresDaLista(valorListaBruto);

          itens.forEach((it, idxLoop) => {
            const itemFormatado =
              typeof it === 'object' && it !== null
                ? {
                    _indice: idxLoop + 1,
                    _index: idxLoop + 1,
                    _idx: idxLoop + 1,
                    index: idxLoop + 1,
                    numero: idxLoop + 1,
                    ...it,
                  }
                : formatarItemForeach(it);

            const loopCtx = {
              ...localCtx,
              [varName]: itemFormatado,
              __edmListaOrigem: {
                ...(localCtx?.__edmListaOrigem || {}),
                [varName]: listaNome,
              },
              __edmLoopIndex: {
                ...(localCtx?.__edmLoopIndex || {}),
                [varName]: idxLoop,
              },
            };

            processarFilhosLista(
              itemNode.filhos || [],
              `${itemKey}_each_${idxLoop}`,
              loopCtx
            );
          });
        }
      }
    });
  };

  processarFilhosLista(node.filhos || [], `${blockKey}_list`, contextoLocal);

  return (
    <ListTag
      key={blockKey}
      data-word-type="lista"
      data-word-numerada={numerada ? 'true' : 'false'}
      className={`text-slate-800 dark:text-slate-200 space-y-1.5 my-3 pl-6 select-text ${
        numerada ? 'list-decimal' : 'list-disc'
      }`}
      style={{ fontSize: `${14 * fontScale}px`, lineHeight: 1.5 }}
    >
      {listItems}
    </ListTag>
  );
};
