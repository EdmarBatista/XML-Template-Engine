import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  aplicarFiltroDocumento,
  formatarItemForeach,
  obterTipoEfetivoColuna,
  obterValorPorCaminho,
  valoresDaLista,
} from '../../utils/documentUtils';
import { AstNode, FormStructure, NumberingContext } from '../../types';
import { DocumentInlineVariable } from './DocumentInlineVariable';
import { DocumentInlineTableAccess } from './DocumentInlineTableAccess';
import { DocumentTableNode } from './DocumentTableNode';
import { DocumentTableCell } from './DocumentTableCell';
import { DocumentSectionNode, renderDocumentSectionNode } from './DocumentSectionNode';
import {
  renderDocumentParagraphNodes,
  DocumentInlineConditionalNode,
  DocumentBlockConditionalNode,
  DocumentListNode,
} from './nodes';

/**
 * ============================================================================
 * DocumentNodeRenderer (Despachante Central de Nós AST)
 * ============================================================================
 *
 * Arquitetura & Distribuição de Responsabilidades:
 *
 * 1. DocumentNodeRenderer (este arquivo):
 *    - Atua como o despachante (router/dispatcher) e coordenador da árvore AST.
 *    - Processa nós de primeiro nível e despacha cada tipo específico para seu
 *      componente especializado:
 *      * Seções (<secao>): DocumentSectionNode
 *      * Tabelas (<table>, <tabela>): DocumentTableNode
 *      * Células de Tabela (<td>, <th>): DocumentTableCell
 *      * Parágrafos (<p>, <paragrafo>, buffers inline): renderDocumentParagraphNodes
 *      * Condicionais (<if>): DocumentInlineConditionalNode / DocumentBlockConditionalNode
 *      * Listas (<ul>, <ol>, <lista>): DocumentListNode
 *      * Variáveis Inline ({{var}}): DocumentInlineVariable
 *      * Acessos a Tabelas Inline ({{tabela[i].col}}): DocumentInlineTableAccess
 *
 * 2. Módulo de Nós Especializados (./nodes/):
 *    - DocumentParagraphNode: Divisão em linhas, quebras e numeração sequencial.
 *    - DocumentConditionalNode: Avaliação dinâmica de expressões e destaque interativo.
 *    - DocumentListNode: Listas ordenadas/não-ordenadas com iteração <foreach> e <if>.
 * ============================================================================
 */

export const extrairTooltip = (id: string, estrutura?: FormStructure): string => {
  if (!estrutura || !estrutura.campos) return id;
  const campo = estrutura.campos[id];
  if (!campo) return id;
  const grupo = (estrutura.grupos || []).find(g => g.campos && g.campos.includes(id));
  const caminho = grupo ? `${grupo.titulo} > ${campo.label}` : campo.label;
  return campo.descricao ? `${caminho} — ${campo.descricao}` : caminho;
};

interface DocumentNodeRendererProps {
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
 * Dispatcher central e renderizador semântico dos nós AST do documento
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
  const processarTextoComVariaveis = (
    textoOriginal: string,
    prefixKey: string = 'text',
    ctxLocal?: Record<string, any>
  ): React.ReactNode[] => {
    const escopo = { ...dados, ...(ctxLocal || {}) };
    const regex = /\{\{\s*([^}|]+?)\s*(?:\|\s*([^}]+?)\s*)?\}\}/g;
    const partes: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    let matchCount = 0;

    while ((match = regex.exec(textoOriginal)) !== null) {
      if (match.index > lastIdx) {
        partes.push(textoOriginal.substring(lastIdx, match.index));
      }
      const chave = match[1].trim();
      const filtro = match[2]?.trim();
      const isLocalVar = ctxLocal && Object.prototype.hasOwnProperty.call(ctxLocal, chave);
      let valorBruto = escopo[chave] !== undefined ? escopo[chave] : obterValorPorCaminho(escopo, chave);
      const valorFormatado = filtro ? aplicarFiltroDocumento(valorBruto, filtro) : valorBruto;

      const primeiroSegmentoCaminho = chave.includes('.') ? chave.split('.')[0] : chave;
      const ehCelulaForeachPorPonto = chave.includes('.') && !ctxLocal?.__edmListaOrigem?.[chave] && !!ctxLocal?.__edmListaOrigem?.[primeiroSegmentoCaminho];
      const origemLista = ctxLocal?.__edmListaOrigem?.[chave] || (ehCelulaForeachPorPonto ? ctxLocal?.__edmListaOrigem?.[primeiroSegmentoCaminho] : undefined);
      const isForeachVar = !!origemLista;
      const chaveReal = origemLista || chave;

      // Para célula de foreach do tipo "item.propriedade", o valor individual é a célula
      // (não a tabela inteira), mas o foco/destaque deve apontar para o campo da tabela.
      const ehCelulaForeach = isForeachVar && ehCelulaForeachPorPonto;
      const valorBrutoReal = isForeachVar
        ? (ehCelulaForeach ? valorBruto : escopo[chaveReal])
        : valorBruto;
      // Célula de sub-campo (item.propriedade) não deve abrir editor de textarea ao editar
      const listaForeachEstaVar = isForeachVar && !ehCelulaForeach;

      // Se o valor for um array de objetos (tabela/grade de dados) e a chave representar uma tabela
      const isArrayOfObjects = Array.isArray(valorFormatado) && valorFormatado.length > 0 && valorFormatado.some(item => typeof item === 'object' && item !== null);

      if (isArrayOfObjects) {
        // Obter todas as colunas presentes nos objetos
        const colunasSet = new Set<string>();
        valorFormatado.forEach(row => {
          if (typeof row === 'object' && row !== null) {
            Object.keys(row).forEach(k => colunasSet.add(k));
          }
        });
        const colunas = Array.from(colunasSet);

        // Se tiver colunas estruturadas, renderiza como tabela HTML formatada com edição inline
        if (colunas.length > 0) {
          const isTabelaDestacada = Boolean(destaquesAtivos[chaveReal]);
          const handleAddRow = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (!chaveReal || !onUpdateField) return;
            const listaAtual = Array.isArray(dados?.[chaveReal]) ? [...dados[chaveReal]] : [];
            const novaLinha: Record<string, any> = {};
            const colunasMeta = estrutura?.campos?.[chaveReal]?.colunas;
            if (colunasMeta && colunasMeta.length > 0) {
              colunasMeta.forEach(c => {
                novaLinha[c.id] = '';
              });
            } else {
              colunas.forEach(col => {
                novaLinha[col] = '';
              });
            }
            onUpdateField(chaveReal, [...listaAtual, novaLinha], 'inline');
            if (onFocusField) {
              onFocusField(chaveReal);
            }
          };

          const handleRemoveRow = (rIdxToRemove: number, e: React.MouseEvent) => {
            e.stopPropagation();
            if (!chaveReal || !onUpdateField) return;
            const listaAtual = Array.isArray(dados?.[chaveReal]) ? [...dados[chaveReal]] : [];
            const novaLista = listaAtual.filter((_, idx) => idx !== rIdxToRemove);
            onUpdateField(chaveReal, novaLista, 'inline');
          };

          partes.push(
            <div
              key={`${prefixKey}_autotable_${chave}_${matchCount++}_${match.index}`}
              data-vars={chaveReal}
              data-word-type="tabela-container"
              onClick={chaveReal && onFocusField ? (e) => {
                e.stopPropagation();
                onFocusField(chaveReal);
              } : undefined}
              className={`my-4 overflow-x-auto select-text transition-all duration-500 rounded-lg group/table cursor-pointer ${
                isTabelaDestacada ? 'ring-2 ring-emerald-500 bg-emerald-50/20 p-1 rounded-lg' : 'p-0.5'
              }`}
            >
              <table
                data-word-type="tabela"
                className="w-full border-collapse border border-slate-300 dark:border-slate-600 shadow-2xs text-left"
                style={{ fontSize: `${13 * fontScale}px` }}
              >
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-600">
                    {colunas.map((col, cIdx) => (
                      <th
                        key={`th_${col}_${cIdx}`}
                        className="border border-slate-300 px-3 py-2 font-semibold text-slate-800 dark:text-slate-200 uppercase text-xs tracking-wider"
                      >
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                    {edicaoInline && onUpdateField && (
                      <th className="border border-slate-300 px-2 py-2 w-10 text-center text-slate-400 font-normal text-xs">
                        #
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {valorFormatado.map((row: any, rIdx: number) => {
                    const rowObj = typeof row === 'object' && row !== null ? row : {};
                    return (
                      <tr
                        key={`tr_${rIdx}`}
                        className={`group/row transition-colors ${
                          rIdx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/60 dark:bg-slate-700/50'
                        } hover:bg-blue-50/30`}
                      >
                        {colunas.map((col, cIdx) => {
                          const val = rowObj[col];
                          const colMeta = estrutura?.campos?.[chaveReal]?.colunas?.find(c => c.id === col);
                          const colTipoEfetivo = obterTipoEfetivoColuna(colMeta?.tipo, colMeta?.validar);

                          // Formata o valor exibido conforme o tipo efetivo da coluna.
                          // Ex.: coluna com validar="moeda" exibe igual {{item.valor_unitario | moeda}} (R$ 1.500,00)
                          let formattedVal = '';
                          if (val !== null && val !== undefined && val !== '') {
                            if (['moeda', 'cpf', 'cnpj', 'cpfcnpj', 'cep'].includes(colTipoEfetivo)) {
                              formattedVal = aplicarFiltroDocumento(val, colTipoEfetivo);
                            } else if (colTipoEfetivo === 'number' || colTipoEfetivo === 'numero' || colTipoEfetivo === 'inteiro' || colTipoEfetivo === 'decimal') {
                              formattedVal = typeof val === 'number' ? String(val) : String(val);
                            } else if (typeof val === 'boolean') {
                              formattedVal = val ? 'Sim' : 'Não';
                            } else if (typeof val === 'object') {
                              formattedVal = Object.values(val).filter(v => v !== '' && v !== null && v !== undefined).join(' - ');
                            } else {
                              formattedVal = String(val);
                            }
                          }
                          const colPlaceholder = colMeta?.placeholder || colMeta?.label || `[${col.replace(/_/g, ' ')}]`;
                          const colFiltro = colTipoEfetivo === 'moeda' ? 'moeda' : colMeta?.tipo || undefined;
                          const isCellHighlighted = Boolean(
                            destaquesAtivos[chaveReal] ||
                            destaquesAtivos[`${chaveReal}.${col}`]
                          );
                          return (
                            <DocumentTableCell
                              key={`td_${rIdx}_${col}_${cIdx}`}
                              valorBruto={val}
                              filtro={colFiltro}
                              colMeta={colMeta}
                              isHeader={false}
                              listaNome={chaveReal}
                              rowIndex={rIdx}
                              colKey={col}
                              placeholder={colPlaceholder}
                              isHighlighted={isCellHighlighted}
                              dadosTabela={dados?.[chaveReal]}
                              edicaoInline={edicaoInline}
                              onFocusField={onFocusField}
                              onUpdateField={onUpdateField}
                              fontScale={fontScale}
                            >
                              {formattedVal || ''}
                            </DocumentTableCell>
                          );
                        })}
                        {edicaoInline && onUpdateField && (
                          <td className="border border-slate-300 px-1 py-1 text-center align-middle w-10">
                            <button
                              type="button"
                              onClick={(e) => handleRemoveRow(rIdx, e)}
                              title={`Remover linha ${rIdx + 1}`}
                              className="opacity-0 group-hover/row:opacity-100 p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Botão de adicionar linha inline */}
              {edicaoInline && !!onUpdateField && (
                <div className="mt-2 flex items-center justify-start gap-2">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    title={`Adicionar nova linha à tabela (${chaveReal})`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/90 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-800/60 hover:text-blue-800 dark:hover:text-blue-200 border border-blue-200 dark:border-blue-800 rounded-md transition-all shadow-2xs cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Adicionar linha</span>
                  </button>
                </div>
              )}
            </div>
          );
          lastIdx = match.index + match[0].length;
          continue;
        }
      }

      // Normaliza o valor para renderização no documento (garante que objetos/arrays não causem erros do React)
      let textoExibicao: string = '';
      if (valorFormatado !== null && valorFormatado !== undefined) {
        if (typeof valorFormatado === 'object') {
          if (Array.isArray(valorFormatado)) {
            textoExibicao = valorFormatado
              .map(item => (typeof item === 'object' && item !== null ? Object.values(item).filter(v => v !== '' && v !== null && v !== undefined).join(' - ') : String(item)))
              .filter(Boolean)
              .join(', ');
          } else {
            const vals = Object.values(valorFormatado).filter(v => v !== '' && v !== null && v !== undefined);
            textoExibicao = vals.length > 0 ? vals.join(' - ') : '';
          }
        } else if (typeof valorFormatado === 'boolean') {
          textoExibicao = valorFormatado ? 'Sim' : 'Não';
        } else {
          textoExibicao = String(valorFormatado);
        }
      }

      // Se for acesso direto indexado a item/linha de tabela (ex: itens[0].valor ou tabela.0.etapa ou item.codigo)
      if (chave.includes('.') || chave.includes('[')) {
        const baseKey = chave.split(/[.[]/)[0];
        const baseListaFromFor = ctxLocal?.__edmListaOrigem?.[baseKey];
        const campoFoco = baseListaFromFor || baseKey;
        const ehCampoValido = Boolean(baseListaFromFor || estrutura?.campos?.[baseKey]);
        const comValor = textoExibicao !== '';
        const destacado = Boolean(destaquesAtivos[campoFoco]);

        // Identifica célula/coluna de tabela para edição inline
        const matchColIdx = chave.match(/^([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\[(\d+)\]$/);
        const matchLinhaIdx = chave.match(/^([a-zA-Z0-9_]+)\[(\d+)\]\.([a-zA-Z0-9_]+)$/);
        const matchColuna = chave.match(/^([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)$/);
        let tabelaAcesso: { listaNome: string; coluna: string; indice: number | null; listaAtual: any[] } | null = null;

        const listaParaTabela = (nome: string) =>
          Array.isArray(escopo[nome]) ? escopo[nome] : [];

        if (matchColIdx) {
          tabelaAcesso = {
            listaNome: matchColIdx[1],
            coluna: matchColIdx[2],
            indice: Number(matchColIdx[3]),
            listaAtual: listaParaTabela(matchColIdx[1]),
          };
        } else if (matchLinhaIdx) {
          tabelaAcesso = {
            listaNome: matchLinhaIdx[1],
            coluna: matchLinhaIdx[3],
            indice: Number(matchLinhaIdx[2]),
            listaAtual: listaParaTabela(matchLinhaIdx[1]),
          };
        } else if (matchColuna && estrutura?.campos?.[matchColuna[1]]?.tipo === 'tabela') {
          tabelaAcesso = {
            listaNome: matchColuna[1],
            coluna: matchColuna[2],
            indice: null,
            listaAtual: listaParaTabela(matchColuna[1]),
          };
        }

        if (tabelaAcesso) {
          partes.push(
            <DocumentInlineTableAccess
              key={`${prefixKey}_tabelaacesso_${chave}_${matchCount++}_${match.index}`}
              id={campoFoco}
              caminho={chave}
              valorBruto={valorBruto}
              valorExibido={textoExibicao}
              filtro={filtro}
              tooltip={extrairTooltip(campoFoco, estrutura)}
              isHighlighted={destacado}
              edicaoInline={edicaoInline}
              variaveisVermelhasWord={variaveisVermelhasWord}
              onFocusField={onFocusField}
              onUpdateField={onUpdateField}
              fontScale={fontScale}
              tabelaAcesso={tabelaAcesso}
            />
          );
        } else if (ehCampoValido) {
          // Span interativo: mostra o placeholder {{caminho.completo}} quando vazio e,
          // ao clicar, destaca/foca o campo da tabela (regra dos demais cliques de variáveis).
          partes.push(
            <span
              key={`${prefixKey}_nestedvar_${chave}_${matchCount++}_${match.index}`}
              data-vars={campoFoco}
              title={`${extrairTooltip(campoFoco, estrutura)}\n(Clique: localizar no formulário)`}
              onClick={(e) => {
                e.stopPropagation();
                onFocusField(campoFoco);
              }}
              className={`inline cursor-pointer px-1 py-0.5 rounded border transition-colors duration-500 ease-in-out select-text ${
                comValor
                  ? destacado
                    ? 'bg-emerald-200 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 border-emerald-400 dark:border-emerald-500'
                    : 'text-slate-900 dark:text-slate-100 bg-blue-50/80 dark:bg-slate-800/70 border-transparent dark:border-slate-700/50 hover:bg-blue-100 dark:hover:bg-slate-700 hover:border-blue-400 dark:hover:border-blue-500'
                  : destacado
                  ? 'bg-emerald-200 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 font-mono text-xs border-emerald-500'
                  : 'text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/50 font-mono text-xs border-amber-300 dark:border-amber-700/60 hover:bg-amber-200 dark:hover:bg-amber-900/60'
              }`}
            >
              {comValor ? textoExibicao : `{{${chave}${filtro ? ' | ' + filtro : ''}}}`}
            </span>
          );
        } else {
          partes.push(
            <span
              key={`${prefixKey}_nestedvar_${chave}_${matchCount++}_${match.index}`}
              className="text-slate-900 dark:text-slate-100 font-medium"
            >
              {textoExibicao !== '' ? textoExibicao : `{{${chave}}}`}
            </span>
          );
        }
        lastIdx = match.index + match[0].length;
        continue;
      }

      if (isLocalVar && !origemLista) {
        partes.push(
          <span
            key={`${prefixKey}_localvar_${chave}_${matchCount++}_${match.index}`}
            className="text-slate-900"
          >
            {textoExibicao || `{{${chave}}}`}
          </span>
        );
      } else {
        partes.push(
          <DocumentInlineVariable
            key={`${prefixKey}_var_${chave}_${matchCount++}_${match.index}`}
            id={chaveReal}
            valorBruto={valorBrutoReal}
            valorExibido={textoExibicao}
            filtro={filtro}
            listaForeach={listaForeachEstaVar}
            campo={estrutura.campos[chaveReal]}
            tooltip={extrairTooltip(chaveReal, estrutura)}
            isHighlighted={Boolean(destaquesAtivos[chaveReal])}
            edicaoInline={edicaoInline}
            variaveisVermelhasWord={variaveisVermelhasWord}
            onFocusField={onFocusField}
            onUpdateField={onUpdateField}
            fontScale={fontScale}
          />
        );
      }
      lastIdx = match.index + match[0].length;
    }

    if (lastIdx < textoOriginal.length) {
      partes.push(textoOriginal.substring(lastIdx));
    }

    return partes.length > 0 ? partes : [textoOriginal];
  };

  const renderInlineNodes = (
    inlineNodes: AstNode[],
    path: string = 'inline',
    ctxLocal?: Record<string, any>
  ): React.ReactNode[] => {
    const escopo = { ...dados, ...(ctxLocal || {}) };
    const items: React.ReactNode[] = [];
    inlineNodes.forEach((node, idx) => {
      const key = `${path}_${idx}`;
      if (node.tipo === 'texto') {
        const texto = node.texto || (node as any).valor || '';
        items.push(...processarTextoComVariaveis(texto, key, ctxLocal));
      } else if (node.tipo === 'var') {
        const varId = node.atributos?.id || node.atributos?.nome || '';
        const filtro = node.atributos?.filtro;
        const isLocalVar = ctxLocal && Object.prototype.hasOwnProperty.call(ctxLocal, varId);
        let valorBruto = escopo[varId] !== undefined ? escopo[varId] : obterValorPorCaminho(escopo, varId);
        const valorFormatado = filtro ? aplicarFiltroDocumento(valorBruto, filtro) : valorBruto;

        const primeiroSegmentoCaminho = varId.includes('.') ? varId.split('.')[0] : varId;
        const ehCelulaForeachPorPonto = varId.includes('.') && !ctxLocal?.__edmListaOrigem?.[varId] && !!ctxLocal?.__edmListaOrigem?.[primeiroSegmentoCaminho];
        const origemLista = ctxLocal?.__edmListaOrigem?.[varId] || (ehCelulaForeachPorPonto ? ctxLocal?.__edmListaOrigem?.[primeiroSegmentoCaminho] : undefined);
        const isForeachVar = !!origemLista;
        const chaveReal = origemLista || varId;
        const ehCelulaForeach = isForeachVar && ehCelulaForeachPorPonto;
        const valorBrutoReal = isForeachVar
          ? (ehCelulaForeach ? valorBruto : escopo[chaveReal])
          : valorBruto;
        const listaForeachEstaVar = isForeachVar && !ehCelulaForeach;

        // Para acesso dot/index (ex.: tabela.descricao[0]), o foco/destaque aponta para a tabela.
        const baseVarKey = varId.split(/[.[]/)[0];
        const varFoco = !isForeachVar && (varId.includes('.') || varId.includes('[')) && (estrutura?.campos?.[baseVarKey] || ctxLocal?.__edmListaOrigem?.[baseVarKey])
          ? (ctxLocal?.__edmListaOrigem?.[baseVarKey] || baseVarKey)
          : chaveReal;

        let textoExibicao = '';
        if (valorFormatado !== null && valorFormatado !== undefined) {
          if (typeof valorFormatado === 'object') {
            if (Array.isArray(valorFormatado)) {
              textoExibicao = valorFormatado
                .map(item => (typeof item === 'object' && item !== null ? Object.values(item).filter(v => v !== '' && v !== null && v !== undefined).join(' - ') : String(item)))
                .filter(Boolean)
                .join(', ');
            } else {
              const vals = Object.values(valorFormatado).filter(v => v !== '' && v !== null && v !== undefined);
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
            {renderInlineNodes(node.filhos || [], `${key}_b`, ctxLocal)}
          </strong>
        );
      } else if (node.tipo === 'italico' || node.tipo === 'i' || node.tipo === 'em') {
        items.push(
          <em key={key} className="italic text-slate-900 dark:text-slate-100 select-text">
            {renderInlineNodes(node.filhos || [], `${key}_i`, ctxLocal)}
          </em>
        );
      } else if (node.tipo === 'sublinhado' || node.tipo === 'u') {
        items.push(
          <u key={key} className="underline text-slate-900 dark:text-slate-100 select-text">
            {renderInlineNodes(node.filhos || [], `${key}_u`, ctxLocal)}
          </u>
        );
      } else if (node.tipo === 'tachado' || node.tipo === 's' || node.tipo === 'strike') {
        items.push(
          <s key={key} className="line-through text-slate-700 select-text">
            {renderInlineNodes(node.filhos || [], `${key}_s`, ctxLocal)}
          </s>
        );
      } else if (node.tipo === 'destaque' || node.tipo === 'mark') {
        items.push(
          <mark key={key} className="bg-amber-200/80 text-amber-950 px-1 py-0.5 rounded select-text">
            {renderInlineNodes(node.filhos || [], `${key}_mark`, ctxLocal)}
          </mark>
        );
      } else if (node.tipo === 'cor' || node.tipo === 'span') {
        const cor = node.atributos?.hex || node.atributos?.cor || node.atributos?.style;
        items.push(
          <span key={key} style={cor ? { color: cor } : undefined} className="select-text">
            {renderInlineNodes(node.filhos || [], `${key}_span`, ctxLocal)}
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
            {renderInlineNodes(node.filhos || [], `${key}_link`, ctxLocal)}
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
            renderInlineNodes={renderInlineNodes}
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

            items.push(...renderInlineNodes(node.filhos || [], `${key}_each_${idxLoop}`, loopCtx));
          });
        }
      }
    });
    return items;
  };

  const renderAstBlocos = (
    blocos: AstNode[],
    ctxNum: NumberingContext,
    prefix: string = 'blk',
    ctxLocal?: Record<string, any>,
    nivel: number = 0
  ): React.ReactNode[] => {
    const escopo = { ...dados, ...(ctxLocal || {}) };
    const elementos: React.ReactNode[] = [];
    let inlineBuffer: AstNode[] = [];

    /**
     * Divide os nós inline em grupos de parágrafos, quebrando a cada `\n` literal
     * presente no texto do XML ou a cada <br>. Restaura o comportamento da versão
     * que funcionava, em que cada linha virava um parágrafo separado no documento.
     */


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
            renderInlineNodes,
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
            renderAstBlocos={renderAstBlocos}
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
              ...renderAstBlocos(
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
            processarTextoComVariaveis,
            renderAstBlocos,
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
            {renderInlineNodes(node.filhos || [], blockKey, ctxLocal)}
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
            renderInlineNodes,
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
            {renderInlineNodes(node.filhos || [], blockKey, ctxLocal)}
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
            {renderAstBlocos(node.filhos || [], ctxNum, `${blockKey}_box`, ctxLocal, nivel)}
          </div>
        );
      } else if (node.tipo === 'hr' || node.tipo === 'divisor' || node.tipo === 'separador') {
        elementos.push(<hr key={blockKey} data-word-type="divisor" className="border-t border-slate-300 dark:border-slate-600 my-4" />);
      } else if (node.tipo === 'lista' || node.tipo === 'ul' || node.tipo === 'ol') {
        elementos.push(
          <DocumentListNode
            key={blockKey}
            node={node}
            blockKey={blockKey}
            fontScale={fontScale}
            escopo={escopo}
            renderInlineNodes={renderInlineNodes}
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
            renderInlineNodes={renderInlineNodes}
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
  };

  // Cria contexto de numeração fresco e isolado para esta passagem de renderização
  const ctxNumLocal: NumberingContext = {
    prefixo: contextoNumeracao?.prefixo || '',
    next: contextoNumeracao?.next || 1,
    lastNumber: contextoNumeracao?.lastNumber || '',
    habilitado: Boolean(contextoNumeracao?.habilitado),
    numerarBlocos: Boolean(contextoNumeracao?.numerarBlocos),
  };

  const elementos = renderAstBlocos(nodes, ctxNumLocal, pathPrefix, contextoLocal, nivelSecao);
  return <>{elementos}</>;
};
