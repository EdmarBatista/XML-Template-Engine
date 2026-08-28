/**
 * ============================================================================
 * DocumentConditionalNode
 * ============================================================================
 *
 * Atribuições & Responsabilidades:
 * 1. Avaliar em tempo real a expressão lógica contida no atributo `expr`
 *    (ex.: `<if expr="tem_garantia == 'sim'">`) contra o escopo de dados.
 * 2. Suportar duas variantes de renderização:
 *    - DocumentInlineConditionalNode: Condicional no fluxo de texto/frases.
 *    - DocumentBlockConditionalNode: Condicional em nível de bloco estrutural.
 * 3. Identificar variáveis envolvidas na expressão para fornecer:
 *    - Feedback visual quando o campo correspondente estiver destacado no formulário.
 *    - Interatividade de clique para rolar e focar automaticamente no campo de origem.
 * 4. Omitir a renderização do nó (retornar `null`) caso a expressão seja avaliada como falsa.
 */

import React from 'react';
import { AstNode, NumberingContext } from '../../../types';
import { avaliarExpressao, extrairVariaveisDaExpressao } from '../../../utils/expressionEvaluator';

export interface DocumentInlineConditionalNodeProps {
  /** Nó AST do elemento <if> inline */
  node: AstNode;
  /** Chave única para o nó React */
  nodeKey: string;
  /** Escopo de dados atual (incluindo escopos locais de loop se houver) */
  escopo: Record<string, any>;
  /** Dicionário de variáveis atualmente sob destaque visual ativo */
  destaquesAtivos: Record<string, number>;
  /** Callback para focar no campo do formulário ao clicar */
  onFocusField: (fieldId: string) => void;
  /** Função de renderização para os nós inline filhos */
  renderInlineNodes: (
    inlineNodes: AstNode[],
    path: string,
    contextoLocal?: Record<string, any>
  ) => React.ReactNode[];
  /** Contexto local de variáveis */
  contextoLocal?: Record<string, any>;
}

/**
 * Renderiza uma condicional inline (<if>) dentro de texto/parágrafo.
 */
export const DocumentInlineConditionalNode: React.FC<DocumentInlineConditionalNodeProps> = ({
  node,
  nodeKey,
  escopo,
  destaquesAtivos,
  onFocusField,
  renderInlineNodes,
  contextoLocal,
}) => {
  const expr = node.atributos?.expr || '';
  const avaliado = avaliarExpressao(expr, escopo);
  if (!avaliado) return null;

  const variaveisUsadas = extrairVariaveisDaExpressao(expr);
  const estaDestacado = variaveisUsadas.some(v => Boolean(destaquesAtivos[v]));
  const primeiroId = variaveisUsadas[0];

  return (
    <span
      key={nodeKey}
      onClick={primeiroId ? (e) => { e.stopPropagation(); onFocusField(primeiroId); } : undefined}
      className={`transition-all rounded select-text ${
        estaDestacado
          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500 font-semibold px-1'
          : 'bg-blue-50/70 dark:bg-slate-800/80 border-b-2 border-blue-400 dark:border-blue-500 text-blue-950 dark:text-blue-200 px-0.5'
      } ${primeiroId ? 'cursor-pointer hover:bg-blue-100 dark:hover:bg-slate-700/80' : ''}`}
      title={primeiroId ? `Condição IF: ${expr} (Clique para localizar no formulário)` : undefined}
    >
      {renderInlineNodes(node.filhos || [], `${nodeKey}_if`, contextoLocal)}
    </span>
  );
};

export interface DocumentBlockConditionalNodeProps {
  /** Nó AST do elemento <if> em nível de bloco */
  node: AstNode;
  /** Chave única para o bloco React */
  blockKey: string;
  /** Escopo de dados atual */
  escopo: Record<string, any>;
  /** Dicionário de variáveis atualmente sob destaque visual */
  destaquesAtivos: Record<string, number>;
  /** Callback para focar no campo do formulário ao clicar */
  onFocusField: (fieldId: string) => void;
  /** Contexto de numeração sequencial */
  contextoNumeracao: NumberingContext;
  /** Nível de profundidade da seção */
  nivel: number;
  /** Função de renderização de blocos AST passada pelo despachante */
  renderAstBlocos: (
    nodes: AstNode[],
    contextoNumeracao: NumberingContext,
    pathPrefix: string,
    contextoLocal?: Record<string, any>,
    nivelSecao?: number
  ) => React.ReactNode[];
  /** Contexto local de variáveis */
  contextoLocal?: Record<string, any>;
}

/**
 * Renderiza uma condicional de bloco (<if>) envolvendo múltiplos elementos/parágrafos.
 */
export const DocumentBlockConditionalNode: React.FC<DocumentBlockConditionalNodeProps> = ({
  node,
  blockKey,
  escopo,
  destaquesAtivos,
  onFocusField,
  contextoNumeracao,
  nivel,
  renderAstBlocos,
  contextoLocal,
}) => {
  const expr = node.atributos?.expr || '';
  const avaliado = avaliarExpressao(expr, escopo);
  if (!avaliado) return null;

  const variaveisUsadas = extrairVariaveisDaExpressao(expr);
  const estaDestacado = variaveisUsadas.some(v => Boolean(destaquesAtivos[v]));
  const primeiroId = variaveisUsadas[0];

  return (
    <div
      key={blockKey}
      onClick={primeiroId ? (e) => { e.stopPropagation(); onFocusField(primeiroId); } : undefined}
      className={`transition-all rounded select-text ${
        estaDestacado
          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500 pl-3 py-1 my-1'
          : 'border-l-2 border-blue-400 dark:border-blue-500 pl-3 py-1 my-1 bg-blue-50/30 dark:bg-slate-800/50'
      } ${primeiroId ? 'cursor-pointer hover:bg-blue-50/60 dark:hover:bg-slate-800/80' : ''}`}
      title={primeiroId ? `Bloco Condicional IF: ${expr} (Clique para localizar no formulário)` : undefined}
    >
      {renderAstBlocos(node.filhos || [], contextoNumeracao, `${blockKey}_if`, contextoLocal, nivel)}
    </div>
  );
};
