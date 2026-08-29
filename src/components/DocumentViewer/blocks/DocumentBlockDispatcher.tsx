import React from 'react';
import { AstNode, NumberingContext } from '../../../types';
import { formatarItemForeach, obterValorPorCaminho, valoresDaLista } from '../../../utils/documentUtils';
import { renderDocumentSectionNode } from './DocumentSectionNode';
import { DocumentTableNode } from './DocumentTableNode';
import { DocumentBlockConditionalNode } from '../logic/DocumentConditionalNode';
import { DocumentListNode } from './DocumentListNode';
import { renderDocumentParagraphNodes } from './DocumentParagraphNode';
import { InlineRenderContext, renderInlineAstNodes } from '../inline/DocumentInlineRenderer';
import { processarTextoComVariaveis } from '../inline/textVariableProcessor';

export interface BlockDispatcherContext extends InlineRenderContext {
  contextoNumeracao?: NumberingContext;
}

export function renderDocumentAstBlocks(
  blocos: AstNode[],
  ctxNum: NumberingContext,
  prefix: string = 'blk',
  ctxLocal: Record<string, any> | undefined,
  nivel: number,
  ctx: BlockDispatcherContext
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
  const elementos: React.ReactNode[] = [];
  let inlineBuffer: AstNode[] = [];

  const selfRenderInline = (
    childInlineNodes: AstNode[],
    childPath: string = 'inline',
    childCtxLocal?: Record<string, any>
  ) => renderInlineAstNodes(childInlineNodes, childPath, childCtxLocal, ctx);

  const selfRenderBlocks = (
    childBlocos: AstNode[],
    childCtxNum: NumberingContext,
    childPrefix: string = 'blk',
    childCtxLocal?: Record<string, any>,
    childNivel: number = 0
  ) => renderDocumentAstBlocks(childBlocos, childCtxNum, childPrefix, childCtxLocal, childNivel, ctx);

  const flushInlineBuffer = (idx: number) => {
    if (inlineBuffer.length > 0) {
      const key = `${prefix}_p_buffered_${idx}`;
      elementos.push(
        ...renderDocumentParagraphNodes({
          nos: inlineBuffer,
          pPath: key,
          contextoNumeracao: ctxNum,
          fontScale,
          nivel,
          renderInlineNodes: selfRenderInline,
          contextoLocal: ctxLocal,
        })
      );
      inlineBuffer = [];
    }
  };

  blocos.forEach((node, idx) => {
    const blockKey = `${prefix}_${idx}`;

    if (
      node.tipo === 'texto' ||
      node.tipo === 'var' ||
      node.tipo === 'negrito' ||
      node.tipo === 'b' ||
      node.tipo === 'strong' ||
      node.tipo === 'italico' ||
      node.tipo === 'i' ||
      node.tipo === 'em' ||
      node.tipo === 'sublinhado' ||
      node.tipo === 'u' ||
      node.tipo === 'tachado' ||
      node.tipo === 's' ||
      node.tipo === 'strike' ||
      node.tipo === 'destaque' ||
      node.tipo === 'mark' ||
      node.tipo === 'cor' ||
      node.tipo === 'span' ||
      node.tipo === 'link' ||
      node.tipo === 'a' ||
      node.tipo === 'br'
    ) {
      inlineBuffer.push(node);
      return;
    }

    flushInlineBuffer(idx);

    if (node.tipo === 'if') {
      elementos.push(
        <DocumentBlockConditionalNode
          key={blockKey}
          node={node}
          blockKey={blockKey}
          escopo={escopo}
          destaquesAtivos={destaquesAtivos}
          onFocusField={onFocusField}
          contextoNumeracao={ctxNum}
          nivel={nivel}
          renderAstBlocos={selfRenderBlocks}
          contextoLocal={ctxLocal}
        />
      );
    } else if (node.tipo === 'foreach') {
      const varName = node.atributos?.var || node.atributos?.item || 'item';
      const listaNome = node.atributos?.lista || node.atributos?.de || node.atributos?.items || '';

      if (listaNome) {
        const valorListaBruto = escopo[listaNome] !== undefined ? escopo[listaNome] : obterValorPorCaminho(escopo, listaNome);
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

          elementos.push(
            ...selfRenderBlocks(
              node.filhos || [],
              ctxNum,
              `${blockKey}_each_${idxLoop}`,
              loopCtx,
              nivel
            )
          );
        });
      }
    } else if (node.tipo === 'secao' || node.tipo === 'section') {
      elementos.push(
        renderDocumentSectionNode(
          node,
          blockKey,
          ctxNum,
          nivel,
          fontScale,
          (texto, key, localCtx) =>
            processarTextoComVariaveis({
              textoOriginal: texto,
              prefixKey: key,
              ctxLocal: localCtx,
              dados,
              estrutura,
              destaquesAtivos,
              onFocusField,
              onUpdateField,
              edicaoInline,
              variaveisVermelhasWord,
              fontScale,
            }),
          selfRenderBlocks,
          ctxLocal
        )
      );
    } else if (node.tipo === 'titulo' || node.tipo === 'h1' || node.tipo === 'h2' || node.tipo === 'h3') {
      const tag = node.tipo === 'titulo' ? 'h1' : node.tipo;
      const alinhamento = node.atributos?.alinhamento || node.atributos?.align || 'center';
      const alignClass =
        alinhamento === 'center' ? 'text-center' : alinhamento === 'right' ? 'text-right' : 'text-left';

      const HeadingTag = tag as 'h1' | 'h2' | 'h3';
      const fontSize =
        tag === 'h1' ? 20 * fontScale : tag === 'h2' ? 16 * fontScale : 14 * fontScale;

      elementos.push(
        <HeadingTag
          key={blockKey}
          data-word-type="titulo"
          data-word-level={tag === 'h1' ? '1' : tag === 'h2' ? '2' : '3'}
          data-word-align={alinhamento}
          className={`font-bold text-slate-900 dark:text-slate-100 my-4 tracking-tight uppercase select-text ${alignClass}`}
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.3 }}
        >
          {selfRenderInline(node.filhos || [], blockKey, ctxLocal)}
        </HeadingTag>
      );
    } else if (node.tipo === 'paragrafo' || node.tipo === 'p') {
      const alinhamento = node.atributos?.alinhamento || node.atributos?.align || 'justify';
      elementos.push(
        ...renderDocumentParagraphNodes({
          nos: node.filhos || [],
          pPath: blockKey,
          contextoNumeracao: ctxNum,
          fontScale,
          nivel,
          alinhamentoPadrao: alinhamento,
          renderInlineNodes: selfRenderInline,
          contextoLocal: ctxLocal,
        })
      );
    } else if (node.tipo === 'citacao' || node.tipo === 'blockquote') {
      elementos.push(
        <blockquote
          key={blockKey}
          data-word-type="citacao"
          className="border-l-4 border-slate-400 pl-4 py-1.5 my-3 italic text-slate-700 dark:text-slate-300 bg-slate-50/70 dark:bg-slate-800/60 select-text"
          style={{ fontSize: `${13 * fontScale}px`, lineHeight: 1.5 }}
        >
          {selfRenderInline(node.filhos || [], blockKey, ctxLocal)}
        </blockquote>
      );
    } else if (node.tipo === 'caixa' || node.tipo === 'alerta' || node.tipo === 'box') {
      const variante = node.atributos?.tipo || 'info';
      const estilosPorTipo: Record<string, string> = {
        info: 'bg-blue-50 dark:bg-blue-950 border-blue-200 text-blue-900 dark:text-blue-100',
        aviso: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100',
        sucesso: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100',
        erro: 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100',
      };
      const estilo = estilosPorTipo[variante] || estilosPorTipo.info;

      elementos.push(
        <div
          key={blockKey}
          data-word-type="caixa"
          data-word-box-tipo={variante}
          className={`border rounded-lg p-3.5 my-3 select-text ${estilo}`}
          style={{ fontSize: `${13 * fontScale}px`, lineHeight: 1.5 }}
        >
          {selfRenderBlocks(node.filhos || [], ctxNum, `${blockKey}_box`, ctxLocal, nivel)}
        </div>
      );
    } else if (node.tipo === 'hr' || node.tipo === 'divisor' || node.tipo === 'separador') {
      elementos.push(
        <hr
          key={blockKey}
          data-word-type="divisor"
          className="border-t border-slate-300 dark:border-slate-600 my-4"
        />
      );
    } else if (node.tipo === 'lista' || node.tipo === 'ul' || node.tipo === 'ol') {
      elementos.push(
        <DocumentListNode
          key={blockKey}
          node={node}
          blockKey={blockKey}
          fontScale={fontScale}
          escopo={escopo}
          renderInlineNodes={selfRenderInline}
          contextoLocal={ctxLocal}
        />
      );
    } else if (node.tipo === 'tabela') {
      elementos.push(
        <DocumentTableNode
          key={blockKey}
          node={node}
          blockKey={blockKey}
          fontScale={fontScale}
          renderInlineNodes={selfRenderInline}
          contextoLocal={ctxLocal}
          dados={dados}
          estrutura={estrutura}
          destaquesAtivos={destaquesAtivos}
          onFocusField={onFocusField}
          edicaoInline={edicaoInline}
          onUpdateField={onUpdateField}
        />
      );
    }
  });

  flushInlineBuffer(blocos.length);
  return elementos;
}
