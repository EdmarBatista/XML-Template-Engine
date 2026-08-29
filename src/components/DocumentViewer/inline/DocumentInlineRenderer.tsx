import React from 'react';
import { AstNode, FormStructure } from '../../../types';
import { aplicarFiltroDocumento, formatarItemForeach, obterValorPorCaminho, valoresDaLista } from '../../../utils/documentUtils';
import { DocumentInlineVariable } from './DocumentInlineVariable';
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
    } else if (node.tipo === 'var') {
      const varId = node.atributos?.id || node.atributos?.nome || '';
      const filtro = node.atributos?.filtro;
      const isLocalVar = ctxLocal && Object.prototype.hasOwnProperty.call(ctxLocal, varId);
      let valorBruto = escopo[varId] !== undefined ? escopo[varId] : obterValorPorCaminho(escopo, varId);
      const valorFormatado = filtro ? aplicarFiltroDocumento(valorBruto, filtro) : valorBruto;

      const primeiroSegmentoCaminho = varId.includes('.') ? varId.split('.')[0] : varId;
      const ehCelulaForeachPorPonto =
        varId.includes('.') &&
        !ctxLocal?.__edmListaOrigem?.[varId] &&
        !!ctxLocal?.__edmListaOrigem?.[primeiroSegmentoCaminho];
      const origemLista =
        ctxLocal?.__edmListaOrigem?.[varId] ||
        (ehCelulaForeachPorPonto ? ctxLocal?.__edmListaOrigem?.[primeiroSegmentoCaminho] : undefined);
      const isForeachVar = !!origemLista;
      const chaveReal = origemLista || varId;
      const ehCelulaForeach = isForeachVar && ehCelulaForeachPorPonto;
      const valorBrutoReal = isForeachVar
        ? ehCelulaForeach
          ? valorBruto
          : escopo[chaveReal]
        : valorBruto;
      const listaForeachEstaVar = isForeachVar && !ehCelulaForeach;

      // Para acesso dot/index (ex.: tabela.descricao[0]), o foco/destaque aponta para a tabela
      const baseVarKey = varId.split(/[.[]/)[0];
      const varFoco =
        !isForeachVar &&
        (varId.includes('.') || varId.includes('[')) &&
        (estrutura?.campos?.[baseVarKey] || ctxLocal?.__edmListaOrigem?.[baseVarKey])
          ? ctxLocal?.__edmListaOrigem?.[baseVarKey] || baseVarKey
          : chaveReal;

      let textoExibicao = '';
      if (valorFormatado !== null && valorFormatado !== undefined) {
        if (typeof valorFormatado === 'object') {
          if (Array.isArray(valorFormatado)) {
            textoExibicao = valorFormatado
              .map(item =>
                typeof item === 'object' && item !== null
                  ? Object.values(item)
                      .filter(v => v !== '' && v !== null && v !== undefined)
                      .join(' - ')
                  : String(item)
              )
              .filter(Boolean)
              .join(', ');
          } else {
            const vals = Object.values(valorFormatado).filter(
              v => v !== '' && v !== null && v !== undefined
            );
            textoExibicao = vals.length > 0 ? vals.join(' - ') : '';
          }
        } else if (typeof valorFormatado === 'boolean') {
          textoExibicao = valorFormatado ? 'Sim' : 'Não';
        } else {
          textoExibicao = String(valorFormatado);
        }
      }

      if (isLocalVar && !origemLista) {
        items.push(
          <span key={key} className="text-slate-900 dark:text-slate-100">
            {textoExibicao || `{{${varId}}}`}
          </span>
        );
      } else {
        items.push(
          <DocumentInlineVariable
            key={key}
            id={varFoco}
            valorBruto={valorBrutoReal}
            valorExibido={textoExibicao}
            filtro={filtro}
            listaForeach={listaForeachEstaVar}
            campo={estrutura.campos[varFoco]}
            tooltip={extrairTooltip(varFoco, estrutura)}
            isHighlighted={Boolean(destaquesAtivos[varFoco])}
            edicaoInline={edicaoInline}
            variaveisVermelhasWord={variaveisVermelhasWord}
            onFocusField={onFocusField}
            onUpdateField={onUpdateField}
            fontScale={fontScale}
          />
        );
      }
    } else if (node.tipo === 'negrito' || node.tipo === 'b' || node.tipo === 'strong') {
      items.push(
        <strong key={key} className="font-bold text-slate-900 dark:text-slate-100 select-text">
          {selfRenderInline(node.filhos || [], `${key}_b`, ctxLocal)}
        </strong>
      );
    } else if (node.tipo === 'italico' || node.tipo === 'i' || node.tipo === 'em') {
      items.push(
        <em key={key} className="italic text-slate-900 dark:text-slate-100 select-text">
          {selfRenderInline(node.filhos || [], `${key}_i`, ctxLocal)}
        </em>
      );
    } else if (node.tipo === 'sublinhado' || node.tipo === 'u') {
      items.push(
        <u key={key} className="underline text-slate-900 dark:text-slate-100 select-text">
          {selfRenderInline(node.filhos || [], `${key}_u`, ctxLocal)}
        </u>
      );
    } else if (node.tipo === 'tachado' || node.tipo === 's' || node.tipo === 'strike') {
      items.push(
        <s key={key} className="line-through text-slate-700 select-text">
          {selfRenderInline(node.filhos || [], `${key}_s`, ctxLocal)}
        </s>
      );
    } else if (node.tipo === 'destaque' || node.tipo === 'mark') {
      items.push(
        <mark key={key} className="bg-amber-200/80 text-amber-950 px-1 py-0.5 rounded select-text">
          {selfRenderInline(node.filhos || [], `${key}_mark`, ctxLocal)}
        </mark>
      );
    } else if (node.tipo === 'cor' || node.tipo === 'span') {
      const cor = node.atributos?.hex || node.atributos?.cor || node.atributos?.style;
      items.push(
        <span key={key} style={cor ? { color: cor } : undefined} className="select-text">
          {selfRenderInline(node.filhos || [], `${key}_span`, ctxLocal)}
        </span>
      );
    } else if (node.tipo === 'br') {
      items.push(<br key={key} />);
    } else if (node.tipo === 'link' || node.tipo === 'a') {
      const href = node.atributos?.href || node.atributos?.url || '#';
      items.push(
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline select-text"
        >
          {selfRenderInline(node.filhos || [], `${key}_link`, ctxLocal)}
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

          items.push(...selfRenderInline(node.filhos || [], `${key}_each_${idxLoop}`, loopCtx));
        });
      }
    }
  });

  return items;
}
