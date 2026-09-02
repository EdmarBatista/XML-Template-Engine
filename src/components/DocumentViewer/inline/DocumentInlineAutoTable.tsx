import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FormStructure } from '../../../types';
import { aplicarFiltroDocumento, obterTipoEfetivoColuna } from '../../../utils/documentUtils';
import { DocumentTableCell } from './DocumentTableCell';

export interface DocumentInlineAutoTableProps {
  chaveReal: string;
  colunas: string[];
  valorFormatado: any[];
  dados: Record<string, any>;
  estrutura: FormStructure;
  destaquesAtivos: Record<string, number>;
  edicaoInline: boolean;
  variaveisVermelhasWord?: boolean;
  fontScale: number;
  onFocusField?: (fieldId: string) => void;
  onUpdateField?: (fieldId: string, value: any, origem?: string) => void;
}

export const DocumentInlineAutoTable: React.FC<DocumentInlineAutoTableProps> = ({
  chaveReal,
  colunas,
  valorFormatado,
  dados,
  estrutura,
  destaquesAtivos,
  edicaoInline,
  variaveisVermelhasWord = false,
  fontScale,
  onFocusField,
  onUpdateField,
}) => {
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

  return (
    <div
      data-vars={chaveReal}
      data-word-type="tabela-container"
      onClick={
        chaveReal && onFocusField
          ? e => {
              e.stopPropagation();
              onFocusField(chaveReal);
            }
          : undefined
      }
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
                  const colTipoEfetivo = obterTipoEfetivoColuna(colMeta?.tipo);
                  const isUltimaColuna = cIdx === colunas.length - 1;

                  let formattedVal = '';
                  if (val !== null && val !== undefined && val !== '') {
                    if (['moeda', 'cpf', 'cnpj', 'cep', 'telefone'].includes(colTipoEfetivo)) {
                      formattedVal = aplicarFiltroDocumento(val, colTipoEfetivo as any);
                    } else if (colTipoEfetivo === 'number') {
                      formattedVal = typeof val === 'number' ? String(val) : String(val);
                    } else if (typeof val === 'boolean') {
                      formattedVal = val ? 'Sim' : 'Não';
                    } else if (typeof val === 'object') {
                      formattedVal = Object.values(val)
                        .filter(v => v !== '' && v !== null && v !== undefined)
                        .join(' - ');
                    } else {
                      formattedVal = String(val);
                    }
                  }
                  const colPlaceholder = colMeta?.placeholder || colMeta?.label || `[${col.replace(/_/g, ' ')}]`;
                  const colFiltro = colTipoEfetivo === 'moeda' ? 'moeda' : colMeta?.tipo || undefined;
                  const isCellHighlighted = Boolean(
                    destaquesAtivos[chaveReal] || destaquesAtivos[`${chaveReal}.${col}`]
                  );
                  const removeAction =
                    isUltimaColuna && edicaoInline && Boolean(onUpdateField) ? (
                      <button
                        type="button"
                        data-ignore-export="true"
                        data-word-ignore="true"
                        onClick={e => handleRemoveRow(rIdx, e)}
                        onMouseDown={e => e.stopPropagation()}
                        onDoubleClick={e => e.stopPropagation()}
                        title={`Remover linha ${rIdx + 1}`}
                        className="absolute top-1 right-1 opacity-0 group-hover/row:opacity-100 transition-opacity z-20 pointer-events-auto p-1 text-slate-400 hover:text-rose-600 bg-white/95 dark:bg-slate-800/95 hover:bg-rose-50 dark:hover:bg-rose-950/80 border border-slate-200 dark:border-slate-700 hover:border-rose-300 rounded shadow-xs transition-all cursor-pointer flex items-center justify-center"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    ) : undefined;

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
                      variaveisVermelhasWord={variaveisVermelhasWord}
                      onFocusField={onFocusField}
                      onUpdateField={onUpdateField}
                      fontScale={fontScale}
                      actions={removeAction}
                    >
                      {formattedVal || ''}
                    </DocumentTableCell>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Botão de adicionar linha inline */}
      {edicaoInline && !!onUpdateField && (
        <div data-ignore-export="true" className="mt-2 flex items-center justify-start gap-2">
          <button
            type="button"
            data-ignore-export="true"
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
};
