import React from 'react';
import { TableColumnMetadata } from '../../../types';
import {
  aplicarMascaraCampo,
  normalizarValorCampo,
  obterTipoEfetivoColuna,
  converterFormatoData,
} from '../../../utils/documentUtils';

export interface TabelaAcessoInfo {
  listaNome: string;
  coluna: string;
  indice: number | null; // null = coluna inteira (lista de valores)
  listaAtual: any[];
}

export interface DocumentInlineTableAccessProps {
  id: string; // id do campo da tabela (usado no foco/destaque)
  caminho: string; // caminho original no template (ex.: tabela_testes.descricao[0])
  valorBruto: any; // valor da célula ou lista concatenada da coluna
  valorExibido: string;
  filtro?: string;
  tooltip: string;
  isHighlighted: boolean;
  edicaoInline: boolean;
  variaveisVermelhasWord: boolean;
  onFocusField: (fieldId: string) => void;
  onUpdateField: (fieldId: string, value: any, origem?: string) => void;
  fontScale?: number;
  tabelaAcesso: TabelaAcessoInfo;
  colMeta?: TableColumnMetadata;
}

/**
 * Variável interativa para acessos a células/colunas de tabela:
 * {{tabela.coluna[indice]}}, {{tabela[indice].coluna}}, {{tabela.coluna}} ou foreach.
 * - Clique: foca/destaca o campo da tabela.
 * - Duplo clique: edita a célula (select/radio/checkbox/date/moeda/text) ou a coluna inteira (como lista_csv).
 * - Quando vazio, mostra o placeholder {{caminho}}.
 */
export const DocumentInlineTableAccess: React.FC<DocumentInlineTableAccessProps> = ({
  id,
  caminho,
  valorBruto,
  valorExibido,
  filtro,
  tooltip,
  isHighlighted,
  edicaoInline,
  variaveisVermelhasWord,
  onFocusField,
  onUpdateField,
  fontScale = 1,
  tabelaAcesso,
  colMeta,
}) => {
  const [editando, setEditando] = React.useState(false);
  const [valorTemp, setValorTemp] = React.useState<any>('');
  const containerRef = React.useRef<HTMLSpanElement>(null);
  const valorTempRef = React.useRef(valorTemp);
  valorTempRef.current = valorTemp;
  const clickTimerRef = React.useRef<any>(null);

  const ehColunaInteira = tabelaAcesso.indice === null;
  const colTipo = colMeta
    ? obterTipoEfetivoColuna(colMeta.tipo, colMeta.validar)
    : (filtro || '').toLowerCase();
  const isSelect = colTipo === 'select';
  const isRadio = colTipo === 'radio';
  const isCheckbox = colTipo === 'checkbox' || colTipo === 'booleano';
  const isDate = colTipo === 'date' || colTipo === 'data';
  const isTextArea = colTipo === 'textarea' || colTipo === 'texto_longo';
  const isCurrency = colTipo === 'moeda' || colTipo === 'dinheiro';
  const isMasked = ['moeda', 'cpf', 'cnpj', 'cep'].includes(colTipo) || isCurrency;
  const maskName = isCurrency ? 'moeda' : colTipo;
  const isNumberField = ['number', 'numero', 'inteiro', 'decimal'].includes(colTipo);

  React.useEffect(() => {
    if (!editando) {
      setValorTemp(valorBruto ?? '');
    }
  }, [valorBruto, editando]);

  React.useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  // Salva alterações de célula/coluna na tabela de origem
  const salvarAcesso = React.useCallback((val: any) => {
    const listaAtual = Array.isArray(tabelaAcesso.listaAtual) ? [...tabelaAcesso.listaAtual] : [];

    if (!ehColunaInteira) {
      const indice = tabelaAcesso.indice ?? 0;
      while (listaAtual.length <= indice) {
        listaAtual.push(tabelaAcesso.coluna ? {} : '');
      }
      if (tabelaAcesso.coluna) {
        const item = typeof listaAtual[indice] === 'object' && listaAtual[indice] !== null
          ? { ...listaAtual[indice] }
          : {};
        item[tabelaAcesso.coluna] = val;
        listaAtual[indice] = item;
      } else {
        listaAtual[indice] = val;
      }
      onUpdateField(tabelaAcesso.listaNome, listaAtual, 'inline');
    } else {
      const itens = parseListaPreservandoVazios(val);

      // Preserva o número de linhas existentes, atribuindo cada item à linha correspondente.
      const numLinhas = Math.max(listaAtual.length, itens.length);
      const novaLista: any[] = [];
      for (let i = 0; i < numLinhas; i++) {
        const linhaPrev = listaAtual[i] && typeof listaAtual[i] === 'object' ? listaAtual[i] : {};
        const linha = { ...linhaPrev };
        const valorItem = i < itens.length ? itens[i] : '';
        if (tabelaAcesso.coluna) {
          linha[tabelaAcesso.coluna] = valorItem;
        }
        novaLista.push(linha);
      }

      // Remove apenas linhas que ficaram totalmente vazias (todas as colunas sem valor).
      const listaFinal = novaLista.filter(linha =>
        Object.values(linha).some(v => v !== '' && v !== null && v !== undefined)
      );

      onUpdateField(tabelaAcesso.listaNome, listaFinal, 'inline');
    }
  }, [ehColunaInteira, tabelaAcesso, onUpdateField]);

  const salvar = () => {
    const raw = valorTempRef.current;
    let valFinal: any = raw;
    if (isCheckbox) {
      valFinal = Boolean(raw);
    } else if (isMasked) {
      valFinal = normalizarValorCampo(raw, maskName);
    } else if (isNumberField && !ehColunaInteira) {
      valFinal = raw === '' || raw === null ? '' : Number(String(raw).replace(/[^\d.-]/g, ''));
    }
    if (!ehColunaInteira) {
      salvarAcesso(valFinal);
    } else {
      salvarAcesso(String(raw ?? ''));
    }
    setEditando(false);
  };

  const cancelar = () => {
    setValorTemp(valorBruto ?? '');
    setEditando(false);
  };

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

  const handleClick = (e: React.MouseEvent) => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) return;
    e.stopPropagation();
    if (editando) return;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      const currentSel = window.getSelection();
      if (currentSel && currentSel.toString().trim().length > 0) return;
      onFocusField(id);
    }, 260);
  };

  const citarValor = (valor: any): string => {
    const str = String(valor ?? '').trim();
    if (str === '') return '""';
    return `"${str.replace(/"/g, '\\"')}"`;
  };

  const parseListaPreservandoVazios = (texto: string): string[] => {
    const itens: string[] = [];
    let atual = '';
    let emAspas: string | null = null;

    for (let i = 0; i < texto.length; i++) {
      const ch = texto[i];

      if (emAspas !== null) {
        if (ch === '\\' && i + 1 < texto.length && texto[i + 1] === emAspas) {
          atual += emAspas;
          i++;
          continue;
        }
        if (ch === emAspas) {
          emAspas = null;
          continue;
        }
        atual += ch;
        continue;
      }

      if (ch === '"' || ch === "'") {
        emAspas = ch;
        if (atual === '' || atual.trim() === '') atual = '';
        continue;
      }

      if (ch === ',' || ch === '\n' || ch === '\r') {
        itens.push(atual.trim());
        atual = '';
        continue;
      }

      atual += ch;
    }

    if (atual !== '' || texto.endsWith(',') || texto.endsWith('\n')) {
      itens.push(atual.trim());
    }

    return itens;
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    if (!edicaoInline) return;

    let initialVal: any = '';
    if (ehColunaInteira) {
      const lista = Array.isArray(tabelaAcesso.listaAtual) ? tabelaAcesso.listaAtual : [];
      initialVal = lista
        .map(linha => (linha && typeof linha === 'object' ? linha[tabelaAcesso.coluna] : ''))
        .map(citarValor)
        .join(', ');
    } else {
      if (isCheckbox) {
        initialVal = Boolean(valorBruto);
      } else {
        initialVal = valorBruto !== undefined && valorBruto !== null ? String(valorBruto) : '';
        if (isMasked) initialVal = aplicarMascaraCampo(initialVal, maskName);
      }
    }
    setValorTemp(initialVal);
    setEditando(true);
  };

  if (editando) {
    if (ehColunaInteira) {
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
            placeholder='Valores separados por vírgula ou quebra de linha ("a, b", c)'
            onChange={e => setValorTemp(e.target.value)}
            onBlur={salvar}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) salvar();
              if (e.key === 'Escape') cancelar();
            }}
            className="w-full bg-white dark:bg-slate-900 dark:text-slate-100 border-2 border-blue-500 rounded p-2 text-xs text-slate-900 font-sans outline-none shadow-md"
            style={{ fontSize: `${12 * fontScale}px` }}
          />
        </span>
      );
    }

    if (isRadio && colMeta?.opcoes && colMeta.opcoes.length > 0) {
      return (
        <span
          ref={containerRef}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 flex-wrap bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-md px-2 py-0.5 shadow-md z-20 relative my-0.5 align-middle"
        >
          {colMeta.opcoes.map((opt, i) => {
            const isChecked = String(valorTemp) === String(opt);
            return (
              <label
                key={i}
                className={`inline-flex items-center gap-1 text-xs cursor-pointer px-1.5 py-0.5 rounded transition ${
                  isChecked
                    ? 'bg-blue-100 text-blue-900 font-semibold ring-1 ring-blue-300'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name={`inline-table-radio-${tabelaAcesso.listaNome}-${tabelaAcesso.indice}-${tabelaAcesso.coluna}`}
                  value={opt}
                  checked={isChecked}
                  onChange={() => {
                    setValorTemp(opt);
                    salvarAcesso(opt);
                  }}
                  className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="select-none">{opt}</span>
              </label>
            );
          })}
        </span>
      );
    }

    if (isSelect && colMeta?.opcoes && colMeta.opcoes.length > 0) {
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
              const val = e.target.value;
              setValorTemp(val);
              salvarAcesso(val);
              setEditando(false);
            }}
            onBlur={salvar}
            onKeyDown={e => {
              if (e.key === 'Enter') salvar();
              if (e.key === 'Escape') cancelar();
            }}
            className="bg-white dark:bg-slate-900 dark:text-slate-100 border-2 border-blue-500 rounded px-2.5 py-1 text-xs text-slate-900 font-sans outline-none shadow-md font-medium cursor-pointer"
            style={{ fontSize: `${12 * fontScale}px` }}
          >
            <option value="">Selecione...</option>
            {colMeta.opcoes.map(opt => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </span>
      );
    }

    if (isCheckbox) {
      const isChecked = Boolean(valorTemp);
      return (
        <span
          ref={containerRef}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-md px-2 py-0.5 shadow-md z-20 relative my-0.5 align-middle"
        >
          <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer text-slate-800 dark:text-slate-200 font-medium">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={e => {
                const checked = e.target.checked;
                setValorTemp(checked);
                salvarAcesso(checked);
              }}
              className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
            />
            <span className="select-none">{isChecked ? 'Sim' : 'Não'} ({colMeta?.label || tabelaAcesso.coluna})</span>
          </label>
        </span>
      );
    }

    if (isDate) {
      return (
        <span
          ref={containerRef}
          onClick={e => e.stopPropagation()}
          className="inline-block align-middle my-0.5 z-20 relative max-w-full"
        >
          <input
            type="date"
            autoFocus
            value={converterFormatoData(valorTemp, 'ISO')}
            onChange={e => setValorTemp(e.target.value)}
            onBlur={salvar}
            onKeyDown={e => {
              if (e.key === 'Enter') salvar();
              if (e.key === 'Escape') cancelar();
            }}
            className="bg-white dark:bg-slate-900 dark:text-slate-100 border-2 border-blue-500 rounded px-2 py-1 text-xs text-slate-900 font-sans outline-none shadow-md font-medium cursor-pointer"
            style={{ fontSize: `${12 * fontScale}px` }}
          />
        </span>
      );
    }

    if (isTextArea) {
      return (
        <span
          ref={containerRef}
          onClick={e => e.stopPropagation()}
          className="inline-block w-full my-1 z-20 relative"
        >
          <textarea
            rows={2}
            autoFocus
            value={String(valorTemp)}
            onChange={e => setValorTemp(e.target.value)}
            onBlur={salvar}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) salvar();
              if (e.key === 'Escape') cancelar();
            }}
            className="w-full bg-white dark:bg-slate-900 dark:text-slate-100 border-2 border-blue-500 rounded p-2 text-xs text-slate-900 font-sans outline-none shadow-md"
            style={{ fontSize: `${12 * fontScale}px` }}
          />
        </span>
      );
    }

    return (
      <span
        ref={containerRef}
        onClick={e => e.stopPropagation()}
        className="inline-block align-middle my-0.5 z-20 relative max-w-full"
      >
        <input
          type={isMasked ? 'text' : isNumberField ? 'number' : 'text'}
          inputMode={isMasked || isNumberField ? 'numeric' : undefined}
          value={String(valorTemp)}
          size={Math.max(String(valorTemp).length + 3, 16)}
          autoFocus
          onFocus={e => e.target.select()}
          onKeyDown={e => {
            if (isNumberField && !isMasked && ['e', 'E', '+'].includes(e.key)) e.preventDefault();
            else if (e.key === 'Enter') salvar();
            else if (e.key === 'Escape') cancelar();
          }}
          onChange={e => {
            if (isMasked) {
              setValorTemp(aplicarMascaraCampo(e.target.value, maskName));
            } else {
              setValorTemp(e.target.value);
            }
          }}
          onBlur={salvar}
          className="bg-white dark:bg-slate-900 dark:text-slate-100 border-2 border-blue-500 rounded px-2.5 py-1 text-xs text-slate-900 font-sans outline-none shadow-md font-medium min-w-[200px] max-w-full"
          style={{ fontSize: `${12 * fontScale}px` }}
        />
      </span>
    );
  }

  const comValor = valorExibido !== '' && valorExibido !== undefined && valorExibido !== null;

  return (
    <span
      data-vars={id}
      title={`${tooltip}\n(Clique: localizar no formulário | Duplo-clique: ${
        edicaoInline ? 'editar aqui' : 'edição desativada'
      })`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`inline cursor-pointer px-1 py-0.5 rounded border transition-colors duration-500 ease-in-out select-text ${
        comValor
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
      {comValor ? valorExibido : `{{${caminho}${filtro ? ' | ' + filtro : ''}}}`}
    </span>
  );
};
