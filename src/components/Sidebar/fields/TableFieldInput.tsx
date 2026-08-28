import React from 'react';
import { FieldMetadata } from '../../../types';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { aplicarMascaraCampo, normalizarValorCampo, obterTipoEfetivoColuna } from '../../../utils/documentUtils';

interface TableFieldInputProps {
  campo: FieldMetadata;
  valor: any[];
  onChange: (id: string, valor: any[]) => void;
}

export const TableFieldInput: React.FC<TableFieldInputProps> = ({
  campo,
  valor,
  onChange,
}) => {
  const colunas = campo.colunas || [];
  const linhas = Array.isArray(valor) && valor.length > 0 ? valor : [{}];

  const handleCellChange = (linhaIdx: number, colId: string, val: any, tipoCol?: string) => {
    const tipo = (tipoCol || 'input').toLowerCase();
    const novasLinhas = linhas.map((linha, idx) => {
      if (idx !== linhaIdx) return linha;
      let valFinal = val;
      if (tipo === 'number') {
        const strVal = String(val);
        const limpo = strVal === '' ? '' : strVal.replace(/[^\d.-]/g, '');
        valFinal = limpo === '' ? '' : Number(limpo);
      } else if (['moeda', 'cpf', 'cnpj', 'cpfcnpj', 'cep'].includes(tipo)) {
        const fmt = aplicarMascaraCampo(val, tipo);
        valFinal = normalizarValorCampo(fmt, tipo);
      } else if (tipo === 'checkbox') {
        valFinal = Boolean(val);
      }
      return { ...linha, [colId]: valFinal };
    });
    onChange(campo.id, novasLinhas);
  };

  const handleAddRow = () => {
    const novaLinha: Record<string, any> = {};
    colunas.forEach(c => {
      novaLinha[c.id] = c.tipo === 'checkbox' ? false : '';
    });
    onChange(campo.id, [...linhas, novaLinha]);
  };

  const handleRemoveRow = (linhaIdx: number) => {
    if (linhas.length <= 1) {
      // Limpa os campos da única linha restante
      const limpa: Record<string, any> = {};
      colunas.forEach(c => {
        limpa[c.id] = c.tipo === 'checkbox' ? false : '';
      });
      onChange(campo.id, [limpa]);
      return;
    }
    const novasLinhas = linhas.filter((_, idx) => idx !== linhaIdx);
    onChange(campo.id, novasLinhas);
  };

  const handleMoveRow = (linhaIdx: number, direcao: 'cima' | 'baixo') => {
    const alvoIdx = direcao === 'cima' ? linhaIdx - 1 : linhaIdx + 1;
    if (alvoIdx < 0 || alvoIdx >= linhas.length) return;
    const novasLinhas = [...linhas];
    const temp = novasLinhas[linhaIdx];
    novasLinhas[linhaIdx] = novasLinhas[alvoIdx];
    novasLinhas[alvoIdx] = temp;
    onChange(campo.id, novasLinhas);
  };

  return (
    <div className="space-y-2 mt-1">
      {/* Tabela de edição compacta na barra lateral */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50/50 dark:bg-slate-900/40 shadow-xs">
        <div className="overflow-x-auto max-h-[340px] divide-y divide-slate-200">
          {linhas.map((linha, lIdx) => (
            <div
              key={lIdx}
              className="p-2.5 bg-white dark:bg-slate-800 space-y-2 relative group/row hover:bg-slate-50/80 dark:hover:bg-slate-700/80 transition-colors"
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-[10px] font-bold flex items-center justify-center">
                    {lIdx + 1}
                  </span>
                  <span>Linha #{lIdx + 1}</span>
                </span>
                <div className="flex items-center gap-1 opacity-80 group-hover/row:opacity-100 transition-opacity">
                  <button
                    type="button"
                    disabled={lIdx === 0}
                    onClick={() => handleMoveRow(lIdx, 'cima')}
                    title="Mover para cima"
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={lIdx === linhas.length - 1}
                    onClick={() => handleMoveRow(lIdx, 'baixo')}
                    title="Mover para baixo"
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(lIdx)}
                    title="Remover linha"
                    className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors ml-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Grid com os inputs de cada coluna da linha */}
              <div className="grid grid-cols-1 gap-2 pt-1">
                {colunas.map(col => {
                  const valorCelula = linha[col.id] ?? '';
                  const colTipo = obterTipoEfetivoColuna(col.tipo, col.validar);
                  const isMasked = ['moeda', 'cpf', 'cnpj', 'cpfcnpj', 'cep'].includes(colTipo);
                  const valorExibido = isMasked ? aplicarMascaraCampo(valorCelula, colTipo) : valorCelula;

                  return (
                    <div key={col.id} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-medium text-slate-700 dark:text-slate-200">{col.label}</span>
                        <span className="text-[9px] font-mono text-slate-400">.{col.id}</span>
                      </div>

                      {colTipo === 'select' ? (
                        <select
                          value={valorCelula}
                          onChange={e => handleCellChange(lIdx, col.id, e.target.value, colTipo)}
                          className="w-full text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Selecione...</option>
                          {col.opcoes?.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : colTipo === 'date' ? (
                        <input
                          type="date"
                          value={valorCelula}
                          onChange={e => handleCellChange(lIdx, col.id, e.target.value, colTipo)}
                          className="w-full text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                        />
                      ) : colTipo === 'checkbox' ? (
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer py-1">
                          <input
                            type="checkbox"
                            checked={Boolean(valorCelula)}
                            onChange={e => handleCellChange(lIdx, col.id, e.target.checked, colTipo)}
                            className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                          />
                          <span className="select-none font-medium">{valorCelula ? 'Sim' : 'Não'}</span>
                        </label>
                      ) : colTipo === 'textarea' ? (
                        <textarea
                          rows={2}
                          value={valorCelula}
                          placeholder={col.placeholder || ''}
                          onChange={e => handleCellChange(lIdx, col.id, e.target.value, colTipo)}
                          className="w-full text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : colTipo === 'number' ? (
                        <input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min={col.min}
                          max={col.max}
                          step={col.step}
                          value={valorCelula}
                          placeholder={col.placeholder || ''}
                          onKeyDown={e => {
                            // Bloqueia teclas não numéricas no teclado
                            if (['e', 'E', '+'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={e => {
                            const raw = e.target.value;
                            handleCellChange(lIdx, col.id, raw, colTipo);
                          }}
                          className="w-full text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <input
                          type="text"
                          inputMode={isMasked ? 'numeric' : undefined}
                          value={valorExibido}
                          placeholder={col.placeholder || ''}
                          onChange={e => {
                            const raw = e.target.value;
                            handleCellChange(lIdx, col.id, raw, colTipo);
                          }}
                          className="w-full text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Botão de Adicionar Nova Linha */}
        <div className="p-2 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={handleAddRow}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100/80 dark:hover:bg-blue-800/50 border border-blue-200 dark:border-blue-800 rounded-md transition-colors shadow-2xs cursor-pointer active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Linha</span>
          </button>
        </div>
      </div>
    </div>
  );
};
