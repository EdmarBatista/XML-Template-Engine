import React from 'react';
import { AstNode, FormStructure } from '../../types';
import {
  formatarItemForeach,
  obterValorPorCaminho,
  valoresDaLista,
} from '../../utils/documentUtils';
import { avaliarExpressao } from '../../utils/expressionEvaluator';
import { DocumentTableCell } from './DocumentTableCell';
import { Plus } from 'lucide-react';

interface DocumentTableNodeProps {
  node: AstNode;
  blockKey: string;
  fontScale: number;
  renderInlineNodes: (nodes: AstNode[], path: string, contextoLocal?: Record<string, any>) => React.ReactNode[];
  contextoLocal?: Record<string, any>;
  dados?: Record<string, any>;
  estrutura?: FormStructure;
  destaquesAtivos?: Record<string, number>;
  onFocusField?: (fieldId: string) => void;
  edicaoInline?: boolean;
  onUpdateField?: (fieldId: string, value: any, origem?: string) => void;
}

/**
 * Renderizador de tabelas estruturadas (<tabela>), cabeçalhos, bordas, linhas e loops <foreach>
 * com suporte a edição inline por célula, placeholders, botão de adicionar linha e navegação bidirecional.
 */
export const DocumentTableNode: React.FC<DocumentTableNodeProps> = ({
  node,
  blockKey,
  fontScale,
  renderInlineNodes,
  contextoLocal,
  dados,
  estrutura,
  destaquesAtivos = {},
  onFocusField,
  edicaoInline = true,
  onUpdateField,
}) => {
  const rows: React.ReactNode[] = [];
  let rowCounter = 0;

  const escopoBase = { ...(dados || {}), ...(contextoLocal || {}) };

  // Detecta listas e colunas referenciadas na tabela
  const listasDetectadas = new Set<string>();
  const colunasDetectadas = new Set<string>();

  const scanParaMetadados = (nodes?: AstNode[]) => {
    if (!nodes) return;
    for (const n of nodes) {
      if (n.tipo === 'foreach') {
        const lNome = n.atributos?.lista || n.atributos?.de || n.atributos?.items;
        if (lNome) listasDetectadas.add(lNome);
      }
      if (n.tipo === 'var') {
        const vId = n.atributos?.id || n.atributos?.nome || '';
        if (vId.includes('.')) {
          const parts = vId.split('.');
          colunasDetectadas.add(parts.slice(1).join('.'));
        }
      }
      if (n.tipo === 'texto') {
        const txt = n.texto || (n as any).valor || '';
        const matches = txt.matchAll(/\{\{\s*([^}.|]+?)\.([^}|]+?)\s*(?:\|\s*([^}]+?)\s*)?\}\}/g);
        for (const m of matches) {
          colunasDetectadas.add(m[2].trim());
        }
      }
      if (n.filhos) scanParaMetadados(n.filhos);
    }
  };

  scanParaMetadados(node.filhos);

  const listaPrincipal =
    node.atributos?.id ||
    node.atributos?.nome ||
    node.atributos?.lista ||
    Array.from(listasDetectadas)[0] ||
    '';

  const extrairVarInfoDaCelula = (celulaNode: AstNode, ctx: Record<string, any>) => {
    let varName = '';
    let filtro = '';

    const scan = (filhos?: AstNode[]) => {
      if (!filhos) return;
      for (const f of filhos) {
        if (f.tipo === 'var') {
          varName = f.atributos?.id || f.atributos?.nome || '';
          filtro = f.atributos?.filtro || '';
          return;
        }
        if (f.tipo === 'texto') {
          const txt = f.texto || (f as any).valor || '';
          const match = txt.match(/\{\{\s*([^}|]+?)\s*(?:\|\s*([^}]+?)\s*)?\}\}/);
          if (match) {
            varName = match[1].trim();
            filtro = match[2]?.trim() || '';
            return;
          }
        }
        if (f.filhos) scan(f.filhos);
      }
    };

    scan(celulaNode.filhos);

    if (!varName) return null;

    if (varName.includes('.')) {
      const parts = varName.split('.');
      const loopVar = parts[0];
      const colKey = parts.slice(1).join('.');
      const listaNome = ctx.__edmListaOrigem?.[loopVar] || listaPrincipal;
      const rowIndex = ctx.__edmLoopIndex?.[loopVar];
      const valorBruto = ctx[loopVar]?.[colKey];

      if (listaNome && rowIndex !== undefined) {
        return {
          listaNome,
          rowIndex,
          colKey,
          valorBruto,
          filtro,
        };
      }
    }

    return null;
  };

  const processarLinha = (
    linhaNode: AstNode,
    rKey: string,
    ctx: Record<string, any>,
    isHeader: boolean
  ) => {
    const cells: React.ReactNode[] = [];
    let cellCounter = 0;

    const processarCelulas = (celulas: AstNode[], parentKey: string) => {
      celulas.forEach((celula, cIdx) => {
        if (!celula) return;
        const celulaKey = `${parentKey}_c${cellCounter++}_${cIdx}`;

        if (celula.tipo === 'celula' || celula.tipo === 'th' || celula.tipo === 'td') {
          const cellVarInfo = !isHeader ? extrairVarInfoDaCelula(celula, ctx) : null;
          const targetLista = cellVarInfo?.listaNome || listaPrincipal;
          const dadosLista = targetLista ? dados?.[targetLista] : undefined;

          // Placeholder específico da coluna
          const campoTabelaMeta = targetLista && estrutura?.campos ? estrutura.campos[targetLista] : undefined;
          const colMeta = campoTabelaMeta?.colunas?.find(c => c.id === cellVarInfo?.colKey);
          const colPlaceholder = colMeta?.placeholder || colMeta?.label || (cellVarInfo?.colKey ? `[${cellVarInfo.colKey.replace(/_/g, ' ')}]` : undefined);

          const isCellHighlighted = Boolean(
            (targetLista && destaquesAtivos[targetLista]) ||
            (targetLista && cellVarInfo?.colKey && destaquesAtivos[`${targetLista}.${cellVarInfo.colKey}`])
          );

          cells.push(
            <DocumentTableCell
              key={celulaKey}
              isHeader={isHeader}
              valorBruto={cellVarInfo?.valorBruto}
              filtro={cellVarInfo?.filtro}
              colMeta={colMeta}
              listaNome={targetLista}
              rowIndex={cellVarInfo?.rowIndex}
              colKey={cellVarInfo?.colKey}
              placeholder={colPlaceholder}
              isHighlighted={isCellHighlighted}
              dadosTabela={dadosLista}
              edicaoInline={edicaoInline}
              onFocusField={onFocusField}
              onUpdateField={onUpdateField}
              fontScale={fontScale}
            >
              {renderInlineNodes(celula.filhos || [], celulaKey, ctx)}
            </DocumentTableCell>
          );
        } else if (celula.tipo === 'if') {
          const expr = celula.atributos?.expr || '';
          if (avaliarExpressao(expr, { ...escopoBase, ...ctx })) {
            processarCelulas(celula.filhos || [], `${celulaKey}_if`);
          }
        }
      });
    };

    processarCelulas(linhaNode.filhos || [], rKey);

    if (cells.length > 0) {
      const rIdx = rowCounter++;
      rows.push(
        <tr
          key={rKey}
          className={
            isHeader
              ? 'bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-600'
              : rIdx % 2 === 0
              ? 'bg-white dark:bg-slate-800'
              : 'bg-slate-50/60 dark:bg-slate-700/50'
          }
        >
          {cells}
        </tr>
      );
    }
  };

  const processarFilhos = (
    filhos: AstNode[],
    pathKey: string,
    ctx: Record<string, any>
  ) => {
    filhos.forEach((child, idx) => {
      if (!child) return;
      const childKey = `${pathKey}_${child.tipo}_${idx}`;
      const escopoAtual = { ...escopoBase, ...ctx };

      if (child.tipo === 'cabecalho' || child.tipo === 'thead' || child.tipo === 'header') {
        processarLinha(child, childKey, ctx, true);
      } else if (child.tipo === 'linha' || child.tipo === 'tr' || child.tipo === 'row') {
        processarLinha(child, childKey, ctx, false);
      } else if (child.tipo === 'if') {
        const expr = child.atributos?.expr || '';
        if (avaliarExpressao(expr, escopoAtual)) {
          processarFilhos(child.filhos || [], `${childKey}_if`, ctx);
        }
      } else if (child.tipo === 'foreach') {
        const varName = child.atributos?.var || child.atributos?.item || 'item';
        const lNome = child.atributos?.lista || child.atributos?.de || child.atributos?.items || listaPrincipal || '';

        if (lNome) {
          const valorListaBruto =
            escopoAtual[lNome] !== undefined
              ? escopoAtual[lNome]
              : obterValorPorCaminho(escopoAtual, lNome);

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
              ...ctx,
              [varName]: itemFormatado,
              __edmListaOrigem: {
                ...(ctx.__edmListaOrigem || {}),
                [varName]: lNome,
              },
              __edmLoopIndex: {
                ...(ctx.__edmLoopIndex || {}),
                [varName]: idxLoop,
              },
            };

            processarFilhos(child.filhos || [], `${childKey}_each_${idxLoop}`, loopCtx);
          });
        }
      } else if (child.tipo === 'tbody') {
        processarFilhos(child.filhos || [], `${childKey}_tbody`, ctx);
      }
    });
  };

  processarFilhos(node.filhos || [], blockKey, contextoLocal || {});

  // Função para adicionar nova linha diretamente na tabela durante a edição inline
  const handleAddRow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!listaPrincipal || !onUpdateField) return;

    const listaAtual = Array.isArray(dados?.[listaPrincipal]) ? [...dados[listaPrincipal]] : [];
    const novaLinha: Record<string, any> = {};

    const colunasMeta = estrutura?.campos?.[listaPrincipal]?.colunas;
    if (colunasMeta && colunasMeta.length > 0) {
      colunasMeta.forEach(c => {
        novaLinha[c.id] = '';
      });
    } else if (listaAtual.length > 0 && typeof listaAtual[0] === 'object' && listaAtual[0] !== null) {
      Object.keys(listaAtual[0]).forEach(k => {
        if (k !== '_indice' && k !== 'index' && k !== '_index' && k !== '_idx' && k !== 'numero') {
          novaLinha[k] = '';
        }
      });
    } else {
      Array.from(colunasDetectadas).forEach(col => {
        novaLinha[col] = '';
      });
    }

    onUpdateField(listaPrincipal, [...listaAtual, novaLinha], 'inline');
    if (onFocusField) {
      onFocusField(listaPrincipal);
    }
  };

  const isTabelaDestacada = Boolean(
    (listaPrincipal && destaquesAtivos[listaPrincipal]) ||
    Array.from(listasDetectadas).some(l => destaquesAtivos[l])
  );

  const dataVarsAttr = listaPrincipal || Array.from(listasDetectadas).join(' ');

  return (
    <div
      key={blockKey}
      data-vars={dataVarsAttr || undefined}
      data-word-type="tabela-container"
      onClick={listaPrincipal && onFocusField ? (e) => {
        e.stopPropagation();
        onFocusField(listaPrincipal);
      } : undefined}
      className={`my-4 overflow-x-auto select-text rounded-lg transition-all duration-500 relative group/table ${
        isTabelaDestacada
          ? 'ring-2 ring-emerald-500 bg-emerald-50/20 p-1 rounded-lg'
          : 'p-0.5'
      }`}
    >
      <table
        data-word-type="tabela"
        className="w-full border-collapse border border-slate-300 dark:border-slate-600 shadow-2xs text-left"
        style={{ fontSize: `${13 * fontScale}px` }}
      >
        <tbody>{rows}</tbody>
      </table>

      {/* Botão de "+" para adicionar nova linha na edição inline */}
      {edicaoInline && !!listaPrincipal && !!onUpdateField && (
        <div className="mt-1.5 flex items-center justify-start gap-2">
          <button
            type="button"
            onClick={handleAddRow}
            title={`Adicionar nova linha à tabela (${listaPrincipal})`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/90 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-800/60 hover:text-blue-800 dark:hover:text-blue-200 border border-blue-200 dark:border-blue-800 rounded-md transition-all shadow-2xs cursor-pointer active:scale-95 group-hover/table:opacity-100"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Adicionar linha</span>
          </button>
        </div>
      )}
    </div>
  );
};
