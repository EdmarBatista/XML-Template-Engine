import React from 'react';
import { TableColumnMetadata } from '../../types';
import {
  aplicarMascaraCampo,
  converterFormatoData,
  normalizarValorCampo,
  obterTipoEfetivoColuna,
} from '../../utils/documentUtils';

interface DocumentTableCellProps {
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
  onFocusField?: (fieldId: string) => void;
  onUpdateField?: (fieldId: string, value: any, origem?: string) => void;
  dadosTabela?: any[];
  children?: React.ReactNode;
  fontScale?: number;
  className?: string;
  style?: React.CSSProperties;
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
  onFocusField,
  onUpdateField,
  dadosTabela,
  children,
  fontScale = 1,
  className = '',
  style = {},
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

  // Identificação unificada do tipo (considera também o `validar` da coluna)
  const tipoColuna = obterTipoEfetivoColuna(colMeta?.tipo, colMeta?.validar) || filtro || 'input';
  const isSelect = tipoColuna === 'select';
  const isDate = tipoColuna === 'date' || tipoColuna === 'data';
  const isCheckbox = tipoColuna === 'checkbox' || tipoColuna === 'booleano';
  const isTextArea = tipoColuna === 'textarea' || tipoColuna === 'texto_longo';
  const isNumber = tipoColuna === 'number' || tipoColuna === 'numero' || tipoColuna === 'inteiro';
  const isCurrency = tipoColuna === 'moeda' || tipoColuna === 'dinheiro';
  const isMasked = ['moeda', 'cpf', 'cnpj', 'cpfcnpj', 'cep'].includes(tipoColuna) || isCurrency;
  const maskName = isCurrency ? 'moeda' : tipoColuna;

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
      valFinal = normalizarValorCampo(valTexto, 'moeda');
    } else if (isNumber) {
      const clean = String(valTexto).replace(/[^\d.-]/g, '');
      valFinal = clean === '' ? '' : Number(clean);
    } else if (isCheckbox) {
      valFinal = Boolean(valTexto);
    } else if (isMasked) {
      valFinal = normalizarValorCampo(valTexto, maskName);
    }

    aplicarValorNaTabela(valFinal);
    setEditando(false);
  }, [isEditable, isCurrency, isNumber, isCheckbox, isMasked, maskName, aplicarValorNaTabela]);

  const salvarValorDireto = (val: any) => {
    aplicarValorNaTabela(val);
    setEditando(false);
  };

  const cancelar = () => {
    setEditando(false);
  };

  const clickTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (editando) return;
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) return;

    e.stopPropagation();

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }
    // Clique simples: Localiza e destaca o campo no painel lateral com animação azul de 7s
    clickTimerRef.current = setTimeout(() => {
      const currentSel = window.getSelection();
      if (currentSel && currentSel.toString().trim().length > 0) return;
      if (listaNome && onFocusField) {
        onFocusField(listaNome);
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
      if (isCheckbox) {
        const novoCheck = !valorBruto;
        salvarValorDireto(novoCheck);
        return;
      }

      let initialVal = valorBruto !== undefined && valorBruto !== null ? String(valorBruto) : '';
      if (isMasked) {
        initialVal = aplicarMascaraCampo(initialVal, maskName);
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

  return (
    <CellTag
      ref={containerRef}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      data-vars={listaNome ? `${listaNome} ${listaNome}.${colKey || ''}` : undefined}
      className={`border border-slate-300 dark:border-slate-600 px-3 py-2 text-left select-text relative transition-all duration-300 ${
        isHeader
          ? 'bg-slate-100 dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200 uppercase text-xs tracking-wider'
          : isHighlighted
          ? 'bg-emerald-100 text-emerald-950 font-medium'
          : isEditable
          ? 'cursor-pointer hover:bg-blue-50/70 dark:hover:bg-blue-950 text-slate-800 dark:text-slate-200'
          : 'text-slate-700 dark:text-slate-300'
      } ${editando ? 'p-0.5 bg-white dark:bg-slate-800 ring-2 ring-blue-500 z-30 shadow-md' : ''} ${className}`}
      style={{
        fontSize: `${(isHeader ? 12 : 13) * fontScale}px`,
        lineHeight: 1.3,
        ...style,
      }}
      title={
        isHeader
          ? undefined
          : isEditable && !editando
          ? `Clique duplo para editar célula ou clique para localizar no formulário (${colKey || 'célula'})`
          : undefined
      }
    >
      {editando ? (
        <div className="flex items-center w-full min-w-[80px]">
          {isSelect ? (
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
                  e.preventDefault();
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
                const fmt = aplicarMascaraCampo(e.target.value, maskName);
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
    </CellTag>
  );
};
