import React from 'react';
import { FieldMetadata } from '../../types';
import {
  aplicarMascaraCampo,
  normalizarValorCampo,
} from '../../utils/documentUtils';

interface DocumentInlineVariableProps {
  id: string;
  valorBruto: any;
  valorExibido: string;
  filtro?: string;
  listaForeach?: boolean;
  campo?: FieldMetadata;
  tooltip: string;
  isHighlighted: boolean;
  edicaoInline: boolean;
  variaveisVermelhasWord: boolean;
  onFocusField: (fieldId: string) => void;
  onUpdateField: (fieldId: string, value: any, origem?: string) => void;
  fontScale?: number;
}

/**
 * Componente de Variável Interativa com Edição Inline (Duplo Clique) e Localização (Clique Único)
 */
export const DocumentInlineVariable: React.FC<DocumentInlineVariableProps> = ({
  id,
  valorBruto,
  valorExibido,
  filtro,
  listaForeach,
  campo,
  tooltip,
  isHighlighted,
  edicaoInline,
  variaveisVermelhasWord,
  onFocusField,
  onUpdateField,
  fontScale = 1,
}) => {
  const [editando, setEditando] = React.useState(false);
  const [valorTemp, setValorTemp] = React.useState(valorBruto ?? '');
  const containerRef = React.useRef<HTMLSpanElement>(null);
  const valorTempRef = React.useRef(valorTemp);
  valorTempRef.current = valorTemp;
  const clickTimerRef = React.useRef<any>(null);

  const tipoMascara = (campo?.tipoInput || filtro || '').toLowerCase();
  const isMasked = ['moeda', 'cpf', 'cnpj', 'cpfcnpj', 'cep'].includes(tipoMascara);

  React.useEffect(() => {
    if (!editando) {
      setValorTemp(valorBruto ?? '');
    }
  }, [valorBruto, editando]);

  React.useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  // Clicar fora confirma e salva automaticamente a alteração
  React.useEffect(() => {
    if (!editando) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const valFinal = isMasked
          ? normalizarValorCampo(valorTempRef.current, tipoMascara)
          : valorTempRef.current;
        onUpdateField(id, valFinal, 'inline');
        setEditando(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside, true);
    document.addEventListener('touchstart', handlePointerDownOutside, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside, true);
      document.removeEventListener('touchstart', handlePointerDownOutside, true);
    };
  }, [editando, id, isMasked, tipoMascara, onUpdateField]);

  const salvar = () => {
    const valFinal = isMasked
      ? normalizarValorCampo(valorTempRef.current, tipoMascara)
      : valorTempRef.current;
    onUpdateField(id, valFinal, 'inline');
    setEditando(false);
  };

  const cancelar = () => {
    setValorTemp(valorBruto ?? '');
    setEditando(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return;
    }

    e.stopPropagation();
    if (editando) return;
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }
    clickTimerRef.current = setTimeout(() => {
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) return;
      onFocusField(id);
    }, 260);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    if (edicaoInline) {
      const valInicial = isMasked
        ? aplicarMascaraCampo(valorBruto ?? '', tipoMascara)
        : valorBruto ?? '';
      setValorTemp(valInicial);
      setEditando(true);
    }
  };

  if (editando) {
    if (campo?.tipo === 'radio') {
      const opcoes =
        campo.opcoesDetalhadas || campo.opcoes?.map(o => ({ label: o, valor: o })) || [];
      return (
        <span
          ref={containerRef}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 flex-wrap bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-md px-2 py-0.5 shadow-md z-20 relative my-0.5 align-middle"
        >
          {opcoes.map((opt, i) => {
            const val = opt.valor ?? opt.label;
            const isChecked = String(valorTemp) === String(val);
            return (
              <label
                key={i}
                className={`inline-flex items-center gap-1 text-xs cursor-pointer px-1.5 py-0.5 rounded transition ${
                  isChecked
                    ? 'bg-blue-100 text-blue-900 font-semibold ring-1 ring-blue-300'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name={`inline-radio-${id}`}
                  value={val}
                  checked={isChecked}
                  onChange={() => {
                    setValorTemp(val);
                    onUpdateField(id, val, 'inline');
                  }}
                  className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="select-none">{opt.label}</span>
              </label>
            );
          })}
        </span>
      );
    }

    if (campo?.tipo === 'checkbox') {
      const isChecked = Boolean(valorTemp);
      return (
        <span
          ref={containerRef}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-md px-2 py-0.5 shadow-md z-20 relative my-0.5 align-middle"
        >
          <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer text-slate-800 font-medium">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={e => {
                const checked = e.target.checked;
                setValorTemp(checked);
                onUpdateField(id, checked, 'inline');
              }}
              className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
            />
            <span className="select-none">{campo.label || id}</span>
          </label>
        </span>
      );
    }

    if (
      campo?.tipo === 'date' ||
      campo?.tipoInput === 'date' ||
      filtro === 'data' ||
      filtro === 'dataPorExtenso'
    ) {
      let dateVal = String(valorTemp || '');
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateVal)) {
        const [d, m, y] = dateVal.split('/');
        dateVal = `${y}-${m}-${d}`;
      }
      return (
        <span
          ref={containerRef}
          onClick={e => e.stopPropagation()}
          className="inline-block align-middle my-0.5 z-20 relative max-w-full"
        >
          <input
            type="date"
            value={dateVal}
            autoFocus
            onFocus={e => {
              try {
                (e.target as any).showPicker?.();
              } catch {}
            }}
            onChange={e => {
              const novoVal = e.target.value;
              setValorTemp(novoVal);
              onUpdateField(id, novoVal, 'inline');
              setEditando(false);
            }}
            onBlur={salvar}
            onKeyDown={e => {
              if (e.key === 'Enter') salvar();
              if (e.key === 'Escape') cancelar();
            }}
            className="bg-white dark:bg-slate-900 dark:text-slate-100 border-2 border-blue-500 rounded px-2 py-1 text-xs text-slate-900 font-sans outline-none shadow-md font-medium cursor-pointer"
          />
        </span>
      );
    }

    if (campo?.tipo === 'select') {
      return (
        <span
          ref={containerRef}
          onClick={e => e.stopPropagation()}
          className="inline-block align-middle my-0.5 z-20 relative max-w-full"
        >
          <select
            value={String(valorTemp)}
            autoFocus
            onChange={e => {
              const novoVal = e.target.value;
              setValorTemp(novoVal);
              onUpdateField(id, novoVal, 'inline');
              setEditando(false);
            }}
            onBlur={salvar}
            onKeyDown={e => {
              if (e.key === 'Enter') salvar();
              if (e.key === 'Escape') cancelar();
            }}
            className="bg-white dark:bg-slate-900 dark:text-slate-100 border-2 border-blue-500 rounded px-2.5 py-1 text-xs text-slate-900 font-sans outline-none shadow-md font-medium"
          >
            <option value="">Selecione...</option>
            {campo.opcoes?.map((op, i) => (
              <option key={i} value={op}>
                {op}
              </option>
            ))}
          </select>
        </span>
      );
    }

    if (campo?.tipo === 'textarea' || listaForeach) {
      return (
        <span
          ref={containerRef}
          onClick={e => e.stopPropagation()}
          className="inline-block w-full my-1 z-20 relative"
        >
          <textarea
            value={String(valorTemp)}
            autoFocus
            rows={3}
            onChange={e => setValorTemp(e.target.value)}
            onBlur={salvar}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) salvar();
              if (e.key === 'Escape') cancelar();
            }}
            className="w-full bg-white dark:bg-slate-900 dark:text-slate-100 border-2 border-blue-500 rounded p-2 text-xs text-slate-900 font-sans outline-none shadow-md"
          />
        </span>
      );
    }

    const isNumberField = campo?.tipo === 'number' || filtro === 'numero' || filtro === 'inteiro';

    return (
      <span
        ref={containerRef}
        onClick={e => e.stopPropagation()}
        className="inline-block align-middle my-0.5 z-20 relative max-w-full"
      >
        <input
          type={isNumberField && !isMasked ? 'number' : 'text'}
          inputMode={isNumberField || isMasked ? 'numeric' : undefined}
          pattern={isNumberField ? '[0-9]*' : undefined}
          min={campo?.min}
          max={campo?.max}
          step={campo?.step}
          value={String(valorTemp)}
          size={Math.max(String(valorTemp).length + 3, 16)}
          autoFocus
          onFocus={e => e.target.select()}
          onKeyDown={e => {
            if (isNumberField && !isMasked && ['e', 'E', '+'].includes(e.key)) {
              e.preventDefault();
            } else if (e.key === 'Enter') {
              salvar();
            } else if (e.key === 'Escape') {
              cancelar();
            }
          }}
          onChange={e => {
            const raw = e.target.value;
            if (isMasked) {
              const formatado = aplicarMascaraCampo(raw, tipoMascara);
              setValorTemp(formatado);
            } else {
              setValorTemp(raw);
            }
          }}
          onBlur={salvar}
          className="bg-white dark:bg-slate-900 dark:text-slate-100 border-2 border-blue-500 rounded px-2.5 py-1 text-xs text-slate-900 font-sans outline-none shadow-md font-medium min-w-[200px] max-w-full"
        />
      </span>
    );
  }

  const hasValue = valorExibido !== '' && valorExibido !== undefined && valorExibido !== null;

  return (
    <span
      data-vars={id}
      title={`${tooltip}\n(Clique: localizar no formulário | Duplo-clique: ${
        edicaoInline ? 'editar aqui' : 'edição desativada'
      })`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`inline cursor-pointer px-1 py-0.5 rounded border transition-colors duration-500 ease-in-out select-text ${
        hasValue
          ? isHighlighted
            ? 'bg-emerald-200 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 border-emerald-400 dark:border-emerald-500'
            : variaveisVermelhasWord
            ? 'text-red-600 dark:text-rose-400 bg-red-50 dark:bg-rose-950/40 border-transparent dark:border-rose-900/30 hover:bg-red-100 dark:hover:bg-rose-900/60 hover:border-red-400 dark:hover:border-rose-600/60'
            : 'text-slate-900 dark:text-slate-100 bg-blue-50/80 dark:bg-slate-800/70 border-transparent dark:border-slate-700/50 hover:bg-blue-100 dark:hover:bg-slate-700 hover:border-blue-400 dark:hover:border-blue-500'
          : isHighlighted
          ? 'bg-emerald-200 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 font-mono text-xs border-emerald-500'
          : 'text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/50 font-mono text-xs border-amber-300 dark:border-amber-700/60 hover:bg-amber-200 dark:hover:bg-amber-900/60'
      }`}
    >
      {hasValue ? valorExibido : `{{${id}${filtro ? ' | ' + filtro : ''}}}`}
    </span>
  );
};
