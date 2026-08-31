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
import { DocumentInlineAutoTable } from '../inline/DocumentInlineAutoTable';

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

    if (node.tipo === 'texto') {
      const trimmed = (node.texto || '').trim();
      const match = trimmed.match(/^\{\{\s*([a-zA-Z0-9_]+)(?:\|[^}]+)?\s*\}\}$/);
      if (match) {
        const varName = match[1];
        const valorVar = escopo[varName];
        const isTable =
          estrutura?.campos?.[varName]?.tipo === 'tabela' ||
          (Array.isArray(valorVar) && valorVar.some(it => typeof it === 'object' && it !== null));
        if (isTable) {
          flushInlineBuffer(idx);
          const colunasSet = new Set<string>();
          if (Array.isArray(valorVar)) {
            valorVar.forEach(row => {
              if (typeof row === 'object' && row !== null) {
                Object.keys(row).forEach(k => {
                  if (k !== '_index' && k !== '_indice') colunasSet.add(k);
                });
              }
            });
          }
          const colunasMeta = estrutura?.campos?.[varName]?.colunas;
          const colunas = colunasMeta && colunasMeta.length > 0 ? colunasMeta.map(c => c.id) : Array.from(colunasSet);
          if (colunas.length > 0) {
            elementos.push(
              <DocumentInlineAutoTable
                key={`${blockKey}_standalone_table_${varName}`}
                chaveReal={varName}
                colunas={colunas}
                valorFormatado={valorVar}
                dados={dados}
                estrutura={estrutura}
                destaquesAtivos={destaquesAtivos}
                edicaoInline={edicaoInline}
                variaveisVermelhasWord={variaveisVermelhasWord}
                fontScale={fontScale}
                onFocusField={onFocusField}
                onUpdateField={onUpdateField}
              />
            );
            return;
          }
        }
      }
    }

    if (
      node.tipo === 'texto' ||
      node.tipo === 'b' ||
      node.tipo === 'i' ||
      node.tipo === 'u' ||
      node.tipo === 's' ||
      node.tipo === 'mark' ||
      node.tipo === 'cor' ||
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
    } else if (node.tipo === 'secao') {
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
    } else if (node.tipo === 'titulo' || node.tipo === 'subtitulo') {
      // titulo = nível 1 (h1), subtitulo = nível 2 (h2)
      const tag = node.tipo === 'titulo' ? 'h1' : 'h2';
      const alinhamento = node.atributos?.alinhamento || 'centro';
      const alignClass =
        alinhamento === 'centro' ? 'text-center' : alinhamento === 'direita' ? 'text-right' : 'text-left';

      const HeadingTag = tag as 'h1' | 'h2';
      const fontSize = tag === 'h1' ? 20 * fontScale : 16 * fontScale;

      elementos.push(
        <HeadingTag
          key={blockKey}
          data-word-type="titulo"
          data-word-level={tag === 'h1' ? '1' : '2'}
          data-word-align={alinhamento}
          className={`font-bold text-slate-900 dark:text-slate-100 my-4 tracking-tight uppercase select-text ${alignClass}`}
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.3 }}
        >
          {selfRenderInline(node.filhos || [], blockKey, ctxLocal)}
        </HeadingTag>
      );
    } else if (node.tipo === 'p') {
      const alinhamento = node.atributos?.alinhamento || 'justificar';
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
    } else if (node.tipo === 'hr') {
      elementos.push(
        <hr
          key={blockKey}
          data-word-type="divisor"
          className="border-t border-slate-300 dark:border-slate-600 my-4"
        />
      );
    } else if (node.tipo === 'lista' || node.tipo === 'lista_numerada') {
      elementos.push(
        <DocumentListNode
          key={blockKey}
          node={node}
          blockKey={blockKey}
          fontScale={fontScale}
          escopo={escopo}
          renderInlineNodes={selfRenderInline}
          contextoLocal={ctxLocal}
          destaquesAtivos={destaquesAtivos}
          onFocusField={onFocusField}
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
          variaveisVermelhasWord={variaveisVermelhasWord}
          onUpdateField={onUpdateField}
        />
      );
    }
  });

  flushInlineBuffer(blocos.length);
  return elementos;
}
