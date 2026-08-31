import React from 'react';
import { AstNode } from '../../../types';
import { avaliarExpressao, extrairVariaveisDaExpressao } from '../../../utils/expressionEvaluator';
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
  /** Dicionário de destaques ativos */
  destaquesAtivos?: Record<string, number>;
  /** Callback para focar no campo do formulário ao clicar */
  onFocusField?: (fieldId: string) => void;
}

interface CondicionalContextoItem {
  expr: string;
  variaveisUsadas: string[];
  estaDestacado: boolean;
  primeiroId?: string;
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
  destaquesAtivos = {},
  onFocusField,
}) => {
  const numerada = node.tipo === 'lista_numerada';
  const ListTag = numerada ? 'ol' : 'ul';
  const listItems: React.ReactNode[] = [];

  const processarFilhosLista = (
    filhos: AstNode[],
    parentPath: string,
    localCtx?: Record<string, any>,
    condContext?: CondicionalContextoItem
  ) => {
    filhos.forEach((itemNode, lIdx) => {
      const itemKey = `${parentPath}_${lIdx}`;
      if (itemNode.tipo === 'item') {
        const estaCondicional = Boolean(condContext);
        const estaDestacado = Boolean(condContext?.estaDestacado);
        const primeiroId = condContext?.primeiroId;

        listItems.push(
          <li
            key={itemKey}
            data-vars={condContext?.variaveisUsadas?.join(' ') || undefined}
            data-word-type="item-lista"
            data-word-conditional={estaCondicional ? 'true' : undefined}
            onClick={
              primeiroId && onFocusField
                ? e => {
                    e.stopPropagation();
                    onFocusField(primeiroId);
                  }
                : undefined
            }
            title={
              condContext
                ? `Item Condicional IF: ${condContext.expr}${primeiroId ? ' (Clique para localizar no formulário)' : ''}`
                : undefined
            }
            className={`select-text transition-all rounded px-1.5 py-0.5 -ml-1.5 my-0.5 ${
              estaCondicional
                ? estaDestacado
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 border-l-2 border-emerald-500 font-semibold'
                  : 'bg-blue-50/70 dark:bg-slate-800/80 border-l-2 border-blue-400 dark:border-blue-500 text-blue-950 dark:text-blue-200'
                : ''
            } ${primeiroId && estaCondicional ? 'cursor-pointer hover:bg-blue-100/80 dark:hover:bg-slate-700/80' : ''}`}
          >
            {renderInlineNodes(itemNode.filhos || [], itemKey, localCtx)}
          </li>
        );
      } else if (itemNode.tipo === 'if') {
        const expr = itemNode.atributos?.expr || '';
        const escopoAtualizado = { ...escopo, ...(localCtx || {}) };
        if (avaliarExpressao(expr, escopoAtualizado)) {
          const variaveis = extrairVariaveisDaExpressao(expr);
          const dest = variaveis.some(v => Boolean(destaquesAtivos[v]));
          const subCond: CondicionalContextoItem = {
            expr,
            variaveisUsadas: variaveis,
            estaDestacado: dest,
            primeiroId: variaveis[0],
          };
          processarFilhosLista(itemNode.filhos || [], `${itemKey}_if`, localCtx, subCond);
        }
      } else if (itemNode.tipo === 'foreach') {
        const varName = itemNode.atributos?.var || 'item';
        const listaNome = itemNode.atributos?.lista || '';
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
                    _index: idxLoop + 1,
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
              loopCtx,
              condContext
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
