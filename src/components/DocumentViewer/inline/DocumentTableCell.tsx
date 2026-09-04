import React from 'react';
import { TableColumnMetadata } from '../../../types';
import {
  aplicarMascaraCampo,
  converterFormatoData,
  normalizarValorCampo,
  obterTipoEfetivoColuna,
} from '../../../utils/documentUtils';

export interface DocumentTableCellProps {
  valorBruto: any;
  filtro?: string;
  colMeta?: TableColumnMetadata;
  isHeader?: boolean;
  listaNome?: string;
  rowIndex?: number;
  colKey?: string;
  placeholder?: string;
  isHighlighted?: boolean;
  edicaoInline?: boolean;
  variaveisVermelhasWord?: boolean;
  isConditional?: boolean;
  conditionalExpr?: string;
  conditionalHighlight?: boolean;
  conditionalFocusVar?: string;
  onFocusField?: (fieldId: string) => void;
  onUpdateField?: (fieldId: string, value: any, origem?: string) => void;
  dadosTabela?: any[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
  fontScale?: number;
  className?: string;
  style?: React.CSSProperties;
  colSpan?: number;
  rowSpan?: number;
}

/**
 * Célula de tabela com edição inline direta e unificada.
 * Suporta input, number, moeda, date, select, textarea, checkbox e máscaras documentais.
 */
export const DocumentTableCell: React.FC<DocumentTableCellProps> = ({
  valorBruto,
  filtro,
  colMeta,
  isHeader = false,
  listaNome,
  rowIndex,
  colKey,
  placeholder,
  isHighlighted = false,
  edicaoInline = true,
  variaveisVermelhasWord = false,
  isConditional = false,
  conditionalExpr,
  conditionalHighlight = false,
  conditionalFocusVar,
  onFocusField,
  onUpdateField,
  dadosTabela,
  actions,
  children,
  fontScale = 1,
  className = '',
  style = {},
  colSpan,
  rowSpan,
}) => {
  const [editando, setEditando] = React.useState(false);
  const [valorTemp, setValorTemp] = React.useState<any>('');
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const containerRef = React.useRef<HTMLTableCellElement>(null);
  const valorTempRef = React.useRef(valorTemp);
  valorTempRef.current = valorTemp;

  const isEditable =
    !isHeader &&
    !!listaNome &&
    rowIndex !== undefined &&
    !!colKey &&
    !!onUpdateField &&
    edicaoInline &&
    colKey !== '_indice' &&
    colKey !== 'index' &&
    colKey !== '_index' &&
    colKey !== '_idx' &&
    colKey !== 'numero';

  // Identificação unificada do tipo
  const tipoColuna = obterTipoEfetivoColuna(colMeta?.tipo) || filtro || 'input';
  const isSelect = tipoColuna === 'select';
  const isRadio = tipoColuna === 'radio';
  const isDate = tipoColuna === 'date';
  const isCheckbox = tipoColuna === 'checkbox';
  const isTextArea = tipoColuna === 'textarea';
  const isNumber = tipoColuna === 'number';
  const isCurrency = tipoColuna === 'moeda';
  const isMasked = ['moeda', 'cpf', 'cnpj', 'cep', 'telefone'].includes(tipoColuna);
  const maskName = tipoColuna;

  React.useEffect(() => {
    if (editando && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current && typeof inputRef.current.select === 'function') {
        inputRef.current.select();
      }
    }
  }, [editando]);

  const aplicarValorNaTabela = React.useCallback((valFinal: any) => {
    if (!listaNome || rowIndex === undefined || !colKey || !onUpdateField) return;
    const listaAtual = Array.isArray(dadosTabela) ? [...dadosTabela] : [];
    while (listaAtual.length <= rowIndex) {
      listaAtual.push({});
    }
    const itemAtual = { ...(listaAtual[rowIndex] || {}) };
    itemAtual[colKey] = valFinal;
    listaAtual[rowIndex] = itemAtual;
    onUpdateField(listaNome, listaAtual, 'inline');
  }, [listaNome, rowIndex, colKey, onUpdateField, dadosTabela]);

  const salvar = React.useCallback(() => {
    if (!isEditable) {
      setEditando(false);
      return;
    }

    const valTexto = valorTempRef.current;
    let valFinal: any = valTexto;

    if (isCurrency) {
      valFinal = normalizarValorCampo(valTexto, 'moeda' as any);
    } else if (isNumber) {
      const clean = String(valTexto).replace(/[^\d.-]/g, '');
      valFinal = clean === '' ? '' : Number(clean);
    } else if (isCheckbox) {
      valFinal = Boolean(valTexto);
    } else if (isMasked) {
      valFinal = normalizarValorCampo(valTexto, maskName as any);
    }

    aplicarValorNaTabela(valFinal);
    setEditando(false);
  }, [isEditable, isCurrency, isNumber, isCheckbox, isMasked, maskName, aplicarValorNaTabela]);

  React.useEffect(() => {
    if (!editando) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        salvar();
      }
    };
    document.addEventListener('mousedown', handleOutside, true);
    document.addEventListener('touchstart', handleOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside, true);
      document.removeEventListener('touchstart', handleOutside, true);
    };
  }, [editando, salvar]);

  const salvarValorDireto = (val: any) => {
    aplicarValorNaTabela(val);
    setEditando(false);
  };

  const cancelar = () => {
    setEditando(false);
  };

  const clickTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const focoId = listaNome || conditionalFocusVar;

  const handleClick = (e: React.MouseEvent) => {
    if (editando) return;
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) return;

    e.stopPropagation();

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }
    // Clique simples: Localiza e destaca o campo no painel lateral
    clickTimerRef.current = setTimeout(() => {
      const currentSel = window.getSelection();
      if (currentSel && currentSel.toString().trim().length > 0) return;
      if (focoId && onFocusField) {
        onFocusField(focoId);
      }
    }, 250);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    if (isEditable) {
      let initialVal: any = '';
      if (isCheckbox) {
        initialVal = Boolean(valorBruto);
      } else {
        initialVal = valorBruto !== undefined && valorBruto !== null ? String(valorBruto) : '';
        if (isMasked) {
          initialVal = aplicarMascaraCampo(initialVal, maskName as any);
        }
      }
      setValorTemp(initialVal);
      setEditando(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      salvar();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelar();
    }
  };

  const CellTag = isHeader ? 'th' : 'td';
  const hasValue = valorBruto !== undefined && valorBruto !== null && String(valorBruto).trim() !== '';
  const placeholderText = placeholder || colMeta?.label || (colKey ? `[${colKey.replace(/_/g, ' ')}]` : '...');

  const estaDestacadoEfetivo = isHighlighted || Boolean(conditionalHighlight);

  let bgTextClasses = '';
  if (isHeader) {
    if (isConditional) {
      bgTextClasses = estaDestacadoEfetivo
        ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 font-semibold border-b-2 border-emerald-500'
        : 'bg-blue-50 dark:bg-slate-800 text-blue-950 dark:text-blue-200 font-semibold border-b-2 border-blue-400 dark:border-blue-500';
    } else {
      bgTextClasses = 'bg-slate-100 dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200 uppercase text-xs tracking-wider';
    }
  } else {
    if (estaDestacadoEfetivo) {
      bgTextClasses = 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 font-medium border-emerald-400 dark:border-emerald-500';
    } else if (isConditional) {
      bgTextClasses = `bg-blue-50/60 dark:bg-blue-950/30 text-blue-950 dark:text-blue-200 border-l-2 border-blue-400 dark:border-blue-500 ${
        variaveisVermelhasWord && hasValue ? 'text-red-600 dark:text-rose-400 font-medium' : ''
      }`;
    } else if (variaveisVermelhasWord && hasValue) {
      bgTextClasses = 'text-red-600 dark:text-rose-400 bg-red-50/30 dark:bg-rose-950/20 font-medium hover:bg-red-100/50 dark:hover:bg-rose-900/40';
    } else if (isEditable) {
      bgTextClasses = 'cursor-pointer hover:bg-blue-50/70 dark:hover:bg-blue-950 text-slate-800 dark:text-slate-200';
    } else {
      bgTextClasses = 'text-slate-700 dark:text-slate-300';
    }
  }

  let tooltipTitulo: string | undefined = undefined;
  if (isConditional) {
    tooltipTitulo = `Célula Condicional IF: ${conditionalExpr || ''}${conditionalFocusVar ? ' (Clique para localizar no formulário)' : ''}`;
  } else if (!isHeader && isEditable && !editando) {
    tooltipTitulo = `Clique duplo para editar célula ou clique para localizar no formulário (${colKey || 'célula'})`;
  }

  return (
    <CellTag
      ref={containerRef}
      colSpan={colSpan}
      rowSpan={rowSpan}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      data-vars={!isHeader && listaNome && hasValue ? `${listaNome} ${listaNome}.${colKey || ''}` : (conditionalFocusVar || undefined)}
      className={`border border-slate-300 dark:border-slate-600 px-3 py-2 text-left select-text relative transition-all duration-300 ${bgTextClasses} ${
        editando ? 'p-0.5 bg-white dark:bg-slate-800 ring-2 ring-blue-500 z-30 shadow-md' : ''
      } ${className}`}
      style={{
        fontSize: `${(isHeader ? 12 : 13) * fontScale}px`,
        lineHeight: 1.3,
        ...style,
      }}
      title={tooltipTitulo}
    >
      {editando ? (
        <div className="flex items-center w-full min-w-[80px]">
          {isRadio && colMeta?.opcoes && colMeta.opcoes.length > 0 ? (
            <div
              className="inline-flex items-center gap-1.5 flex-wrap bg-white dark:bg-slate-800 p-0.5"
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
            >
              {colMeta.opcoes.map((opt, i) => {
                const isChecked = String(valorTemp) === String(opt);
                return (
                  <label
                    key={i}
                    className={`inline-flex items-center gap-1 text-xs cursor-pointer px-1.5 py-0.5 rounded transition ${
                      isChecked
                        ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-200 font-semibold ring-1 ring-blue-300'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`table-cell-radio-${listaNome}-${rowIndex}-${colKey}`}
                      value={opt}
                      checked={isChecked}
                      onChange={() => {
                        setValorTemp(opt);
                        aplicarValorNaTabela(opt);
                      }}
                      className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="select-none">{opt}</span>
                  </label>
                );
              })}
            </div>
          ) : isCheckbox ? (
            <div
              className="inline-flex items-center bg-white dark:bg-slate-800 p-0.5"
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
            >
              <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer text-slate-800 dark:text-slate-200 font-medium px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={Boolean(valorTemp)}
                  onChange={e => {
                    const checked = e.target.checked;
                    setValorTemp(checked);
                    aplicarValorNaTabela(checked);
                  }}
                  className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                />
                <span className="select-none">{Boolean(valorTemp) ? 'Sim' : 'Não'}</span>
              </label>
            </div>
          ) : isSelect ? (
            <select
              value={String(valorTemp)}
              autoFocus
              onChange={e => {
                const val = e.target.value;
                setValorTemp(val);
                salvarValorDireto(val);
              }}
              onBlur={salvar}
              onKeyDown={handleKeyDown}
              className="w-full bg-white dark:bg-slate-900 dark:text-slate-100 px-2 py-1 border border-blue-400 rounded text-slate-900 shadow-inner outline-none focus:ring-1 focus:ring-blue-500 text-xs font-normal cursor-pointer"
              style={{ fontSize: `${12 * fontScale}px` }}
            >
              <option value="">Selecione...</option>
              {colMeta?.opcoes?.map(op => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          ) : isDate ? (
            <input
              ref={inputRef as any}
              type="date"
              autoFocus
              value={converterFormatoData(valorTemp, 'ISO')}
              onChange={e => {
                const val = e.target.value;
                setValorTemp(val);
                salvarValorDireto(val);
              }}
              onBlur={salvar}
              onKeyDown={handleKeyDown}
              className="w-full bg-white dark:bg-slate-900 dark:text-slate-100 px-1.5 py-1 border border-blue-400 rounded text-slate-900 shadow-inner outline-none focus:ring-1 focus:ring-blue-500 text-xs font-normal cursor-pointer"
              style={{ fontSize: `${12 * fontScale}px` }}
            />
          ) : isTextArea ? (
            <textarea
              ref={inputRef as any}
              rows={2}
              autoFocus
              value={String(valorTemp)}
              placeholder={placeholderText}
              onChange={e => setValorTemp(e.target.value)}
              onBlur={salvar}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  salvar();
                } else if (e.key === 'Escape') {
                  cancelar();
                }
              }}
              className="w-full bg-white dark:bg-slate-900 dark:text-slate-100 px-2 py-1 border border-blue-400 rounded text-slate-900 shadow-inner outline-none focus:ring-1 focus:ring-blue-500 text-xs font-normal"
              style={{ fontSize: `${12 * fontScale}px` }}
            />
          ) : isNumber ? (
            <input
              ref={inputRef as any}
              type="number"
              inputMode="numeric"
              autoFocus
              defaultValue={String(valorTemp)}
              min={colMeta?.min}
              max={colMeta?.max}
              step={colMeta?.step}
              placeholder={placeholderText}
              onKeyDown={e => {
                if (['e', 'E', '+'].includes(e.key)) {
                  e.preventDefault();
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  salvar();
                } else if (e.key === 'Escape') {
                  cancelar();
                }
              }}
              onChange={e => {
                const raw = e.target.value;
                valorTempRef.current = raw;
                setValorTemp(raw);
              }}
              onBlur={salvar}
              className="w-full bg-white dark:bg-slate-900 dark:text-slate-100 px-2 py-1 border border-blue-400 rounded text-slate-900 shadow-inner outline-none focus:ring-1 focus:ring-blue-500 text-xs font-normal"
              style={{ fontSize: `${12 * fontScale}px` }}
            />
          ) : isMasked ? (
            <input
              ref={inputRef as any}
              type="text"
              inputMode="numeric"
              autoFocus
              value={String(valorTemp)}
              placeholder={placeholderText}
              onChange={e => {
                const fmt = aplicarMascaraCampo(e.target.value, maskName as any);
                setValorTemp(fmt);
              }}
              onBlur={salvar}
              onKeyDown={handleKeyDown}
              className="w-full bg-white dark:bg-slate-900 dark:text-slate-100 px-2 py-1 border border-blue-400 rounded text-slate-900 shadow-inner outline-none focus:ring-1 focus:ring-blue-500 text-xs font-normal"
              style={{ fontSize: `${12 * fontScale}px` }}
            />
          ) : (
            <input
              ref={inputRef as any}
              type="text"
              autoFocus
              value={String(valorTemp)}
              placeholder={placeholderText}
              onChange={e => setValorTemp(e.target.value)}
              onBlur={salvar}
              onKeyDown={handleKeyDown}
              className="w-full bg-white dark:bg-slate-900 dark:text-slate-100 px-2 py-1 border border-blue-400 rounded text-slate-900 shadow-inner outline-none focus:ring-1 focus:ring-blue-500 text-xs font-normal"
              style={{ fontSize: `${12 * fontScale}px` }}
            />
          )}
        </div>
      ) : (
        <>
          {hasValue ? (
            children
          ) : !isHeader && isEditable ? (
            <span className="text-slate-400 italic text-xs select-text">
              {placeholderText}
            </span>
          ) : (
            children || <span className="text-slate-300 select-text">—</span>
          )}
        </>
      )}
      {actions}
    </CellTag>
  );
};
