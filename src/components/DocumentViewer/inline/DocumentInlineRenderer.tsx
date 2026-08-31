import React from 'react';
import { AstNode, FormStructure } from '../../../types';
import { aplicarFiltroDocumento, formatarItemForeach, obterValorPorCaminho, valoresDaLista } from '../../../utils/documentUtils';
import { DocumentInlineVariable } from './DocumentInlineVariable';
import { DocumentInlineTableAccess } from './DocumentInlineTableAccess';
import { DocumentInlineAutoTable } from './DocumentInlineAutoTable';
import { DocumentInlineConditionalNode } from '../logic/DocumentConditionalNode';
import { extrairTooltip, processarTextoComVariaveis } from './textVariableProcessor';

export interface InlineRenderContext {
  dados: Record<string, any>;
  estrutura: FormStructure;
  destaquesAtivos: Record<string, number>;
  onFocusField: (fieldId: string) => void;
  onUpdateField: (fieldId: string, value: any, origem?: string) => void;
  edicaoInline: boolean;
  variaveisVermelhasWord: boolean;
  fontScale: number;
}

export function renderInlineAstNodes(
  inlineNodes: AstNode[],
  path: string = 'inline',
  ctxLocal: Record<string, any> | undefined,
  ctx: InlineRenderContext
): React.ReactNode[] {
  const {
    dados,
    estrutura,
    destaquesAtivos,
    onFocusField,
    onUpdateField,
    edicaoInline,
    variaveisVermelhasWord,
    fontScale,
  } = ctx;

  const escopo = { ...dados, ...(ctxLocal || {}) };
  const items: React.ReactNode[] = [];

  const selfRenderInline = (
    childInlineNodes: AstNode[],
    childPath: string,
    childCtxLocal?: Record<string, any>
  ) => renderInlineAstNodes(childInlineNodes, childPath, childCtxLocal, ctx);

  inlineNodes.forEach((node, idx) => {
    const key = `${path}_${idx}`;

    if (node.tipo === 'texto') {
      const texto = node.texto || (node as any).valor || '';
      items.push(
        ...processarTextoComVariaveis({
          textoOriginal: texto,
          prefixKey: key,
          ctxLocal,
          dados,
          estrutura,
          destaquesAtivos,
          onFocusField,
          onUpdateField,
          edicaoInline,
          variaveisVermelhasWord,
          fontScale,
        })
      );
    } else if (node.tipo === 'b') {
      items.push(
        <strong key={key} className="font-bold text-slate-900 dark:text-slate-100 select-text">
          {selfRenderInline(node.filhos || [], `${key}_b`, ctxLocal)}
        </strong>
      );
    } else if (node.tipo === 'i') {
      items.push(
        <em key={key} className="italic text-slate-900 dark:text-slate-100 select-text">
          {selfRenderInline(node.filhos || [], `${key}_i`, ctxLocal)}
        </em>
      );
    } else if (node.tipo === 'u') {
      items.push(
        <u key={key} className="underline text-slate-900 dark:text-slate-100 select-text">
          {selfRenderInline(node.filhos || [], `${key}_u`, ctxLocal)}
        </u>
      );
    } else if (node.tipo === 's') {
      items.push(
        <s key={key} className="line-through text-slate-700 select-text">
          {selfRenderInline(node.filhos || [], `${key}_s`, ctxLocal)}
        </s>
      );
    } else if (node.tipo === 'mark') {
      items.push(
        <mark key={key} className="bg-amber-200/80 text-amber-950 px-1 py-0.5 rounded select-text">
          {selfRenderInline(node.filhos || [], `${key}_mark`, ctxLocal)}
        </mark>
      );
    } else if (node.tipo === 'cor') {
      const cor = node.atributos?.cor;
      items.push(
        <span
          key={key}
          data-cor={cor}
          style={cor ? { color: cor } : undefined}
          className="select-text"
        >
          {selfRenderInline(node.filhos || [], `${key}_cor`, ctxLocal)}
        </span>
      );
    } else if (node.tipo === 'br') {
      items.push(<br key={key} />);
    } else if (node.tipo === 'a') {
      const href = node.atributos?.href;
      items.push(
        <a
          key={key}
          href={href || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline select-text"
        >
          {selfRenderInline(node.filhos || [], `${key}_a`, ctxLocal)}
        </a>
      );
    } else if (node.tipo === 'if') {
      items.push(
        <DocumentInlineConditionalNode
          key={key}
          node={node}
          nodeKey={key}
          escopo={escopo}
          destaquesAtivos={destaquesAtivos}
          onFocusField={onFocusField}
          renderInlineNodes={selfRenderInline}
          contextoLocal={ctxLocal}
        />
      );
    } else if (node.tipo === 'foreach') {
      const varName = node.atributos?.var || 'item';
      const listaNome = node.atributos?.lista || '';
      if (listaNome) {
        const valorListaBruto = escopo[listaNome] !== undefined ? escopo[listaNome] : obterValorPorCaminho(escopo, listaNome);
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
            ...ctxLocal,
            [varName]: itemFormatado,
            __edmListaOrigem: {
              ...(ctxLocal?.__edmListaOrigem || {}),
              [varName]: listaNome,
            },
            __edmLoopIndex: {
              ...(ctxLocal?.__edmLoopIndex || {}),
              [varName]: idxLoop,
            },
          };

          items.push(...selfRenderInline(node.filhos || [], `${key}_each_${idxLoop}`, loopCtx));
        });
      }
    }
  });

  return items;
}
