import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { FieldMetadata, FormStructure } from '../../types';
import {
  aplicarMascaraCampo,
  normalizarValorCampo,
  obterTipoEfetivoColuna,
} from '../../utils/documentUtils';

interface VarsTabEditorProps {
  chavesFiltradas: string[];
  estrutura: FormStructure;
  dados: Record<string, any>;
  onUpdateField: (id: string, value: any) => void;
}

/**
 * Aba "Variáveis" (edição). Extraída de ModelModal.tsx (sugestão C de modularização).
 */
export const VarsTabEditor: React.FC<VarsTabEditorProps> = ({
  chavesFiltradas,
  estrutura,
  dados,
  onUpdateField,
}) => {
  const campos = estrutura?.campos || {};

  return (
    <div className="space-y-3">
      {chavesFiltradas.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs">
          Nenhuma variável corresponde aos filtros aplicados.
        </div>
      ) : (
        chavesFiltradas.map(id => {
          const campo = campos[id];
          const valor = dados[id];
          const mascara = (campo?.tipoInput || '').toLowerCase();
          const isMasked = ['moeda', 'cnpj', 'cep'].includes(mascara);
          const valorExibido = isMasked ? aplicarMascaraCampo(valor, mascara) : valor ?? '';

          return (
            <div
              key={id}
              className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="md:w-1/3">
                <div className="flex items-center gap-1.5">
                  <code className="text-xs font-bold text-blue-700 dark:text-blue-300 font-mono bg-blue-50 dark:bg-slate-900 border border-transparent dark:border-slate-700 px-1.5 py-0.5 rounded">
                    {`{{${id}}}`}
                  </code>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">{campo?.tipo}</span>
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-1">{campo?.label}</p>
                {campo?.descricao && (
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{campo.descricao}</p>
                )}
              </div>

              <div className="flex-1 md:w-2/3">
                {campo?.tipo === 'radio' ? (
                  <div role="radiogroup" className="flex flex-wrap items-center gap-2">
                    {(campo.opcoesDetalhadas || campo.opcoes?.map(o => ({ label: o, valor: o })) || []).map((opt, i) => {
                      const val = opt.valor ?? opt.label;
                      const isChecked = String(valor ?? '') === String(val);
                      return (
                        <label
                          key={i}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-400 dark:border-blue-500 font-medium text-blue-900 dark:text-blue-200 shadow-2xs ring-1 ring-blue-300 dark:ring-blue-500/40'
                              : 'bg-slate-50/50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`inline-radio-${id}`}
                            value={val}
                            checked={isChecked}
                            onChange={() => onUpdateField(id, val)}
                            className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500 dark:bg-slate-800 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="select-none cursor-pointer">{opt.label}</span>
                        </label>
                      );
                    })}
                    {(!campo.opcoes || campo.opcoes.length === 0) && (
                      <span className="text-slate-400 italic text-xs">Sem opções definidas</span>
                    )}
                  </div>
                ) : campo?.tipo === 'textarea' ? (
                  <textarea
                    rows={2}
                    value={String(valor ?? '')}
                    onChange={e => onUpdateField(id, e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : campo?.tipo === 'select' ? (
                  <select
                    value={String(valor ?? '')}
                    onChange={e => onUpdateField(id, e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {campo.opcoes?.map((op, i) => (
                      <option key={i} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                ) : campo?.tipo === 'checkbox' ? (
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(valor)}
                      onChange={e => onUpdateField(id, e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span>{campo.label}</span>
                  </label>
                ) : campo?.tipo === 'tabela' ? (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold">
                          <tr>
                            {(campo.colunas || []).map(col => (
                              <th key={col.id} className="px-2 py-1.5 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                {col.label}
                              </th>
                            ))}
                            <th className="px-1 py-1.5 border-b border-slate-200 dark:border-slate-700 w-8">
                              <span className="flex justify-center">#</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {Array.isArray(valor) && valor.length > 0 ? (
                            valor.map((row, rIdx) => {
                              const rowObj = typeof row === 'object' && row !== null ? row : {};
                              return (
                                <tr key={rIdx} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40">
                                  {(campo.colunas || []).map(col => {
                                    const val = rowObj[col.id] ?? '';
                                    const colTipo = obterTipoEfetivoColuna(col.tipo, col.validar);
                                    const isNumber = ['number', 'inteiro', 'numero', 'decimal'].includes(colTipo);
                                    const isMaskedCol = ['moeda', 'cpf', 'cnpj', 'cep'].includes(colTipo);
                                    const valorColuna = isMaskedCol ? aplicarMascaraCampo(val, colTipo) : val;
                                    return (
                                      <td key={col.id} className="px-2 py-1">
                                        <input
                                          type={isNumber ? 'number' : 'text'}
                                          inputMode={isNumber || isMaskedCol ? 'numeric' : undefined}
                                          value={String(valorColuna ?? '')}
                                          onChange={e => {
                                            const linhasAtuais = Array.isArray(valor) ? [...valor] : [];
                                            const linhaAtual = { ...(linhasAtuais[rIdx] || {}) };
                                            let valFinal: any = e.target.value;
                                            if (isNumber) {
                                              valFinal = valFinal === '' ? '' : Number(String(valFinal).replace(/[^\d.-]/g, ''));
                                            } else if (isMaskedCol) {
                                              const fmt = aplicarMascaraCampo(valFinal, colTipo);
                                              valFinal = normalizarValorCampo(fmt, colTipo);
                                            }
                                            linhaAtual[col.id] = valFinal;
                                            linhasAtuais[rIdx] = linhaAtual;
                                            onUpdateField(id, linhasAtuais);
                                          }}
                                          className="w-full min-w-[70px] px-1.5 py-1 bg-white dark:bg-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                      </td>
                                    );
                                  })}
                                  <td className="px-1 py-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const linhasAtuais = Array.isArray(valor) ? [...valor] : [];
                                        const novasLinhas = linhasAtuais.filter((_, idx) => idx !== rIdx);
                                        onUpdateField(id, novasLinhas.length ? novasLinhas : []);
                                      }}
                                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded p-0.5"
                                      title="Remover linha"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={(campo.colunas?.length || 0) + 1} className="text-slate-400 italic px-2 py-2">
                                Nenhuma linha preenchida
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-1.5 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => {
                          const linhasAtuais = Array.isArray(valor) ? [...valor] : [];
                          const novaLinha: Record<string, any> = {};
                          (campo.colunas || []).forEach(c => {
                            novaLinha[c.id] = '';
                          });
                          onUpdateField(id, [...linhasAtuais, novaLinha]);
                        }}
                        className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100/80 dark:hover:bg-blue-800/50 border border-blue-200 dark:border-blue-800 rounded-md transition-colors shadow-2xs cursor-pointer active:scale-98"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar linha</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <input
                    type={isMasked ? 'text' : campo?.tipo === 'number' ? 'number' : 'text'}
                    value={String(valorExibido ?? '')}
                    onChange={e => {
                      const raw = e.target.value;
                      if (isMasked) {
                        const f = aplicarMascaraCampo(raw, mascara);
                        const b = normalizarValorCampo(f, mascara);
                        onUpdateField(id, b);
                      } else {
                        onUpdateField(id, raw);
                      }
                    }}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

interface VarsTableResumoProps {
  chavesFiltradas: string[];
  estrutura: FormStructure;
  dados: Record<string, any>;
}

/**
 * Aba "Tabela Resumo" (somente leitura). Extraída de ModelModal.tsx.
 */
export const VarsTableResumo: React.FC<VarsTableResumoProps> = ({
  chavesFiltradas,
  estrutura,
  dados,
}) => {
  const campos = estrutura?.campos || {};

  return (
    <div className="flex-1 min-h-[380px] h-full bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900">
            <tr className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
              <th className="sticky top-0 z-20 p-3 bg-slate-100 dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 shadow-xs whitespace-nowrap">Identificador</th>
              <th className="sticky top-0 z-20 p-3 bg-slate-100 dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 shadow-xs whitespace-nowrap">Rótulo (Label)</th>
              <th className="sticky top-0 z-20 p-3 bg-slate-100 dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 shadow-xs whitespace-nowrap">Tipo</th>
              <th className="sticky top-0 z-20 p-3 bg-slate-100 dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 shadow-xs whitespace-nowrap">Valor Atual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
            {chavesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
                  Nenhuma variável corresponde aos filtros aplicados.
                </td>
              </tr>
            ) : (
              chavesFiltradas.map(id => {
                const campo = campos[id];
                const valor = dados[id];
                const temValor = valor !== '' && valor !== null && valor !== undefined && valor !== false;

                let valorTexto = '';
                if (valor !== null && valor !== undefined) {
                  if (Array.isArray(valor)) {
                    valorTexto = valor
                      .map(item => {
                        if (item && typeof item === 'object') {
                          return Object.values(item).filter(v => v !== '' && v !== null && v !== undefined).join(' · ');
                        }
                        return String(item);
                      })
                      .filter(Boolean)
                      .join('  //  ');
                    if (!valorTexto && valor.length === 0) valorTexto = '[]';
                  } else if (typeof valor === 'object') {
                    valorTexto = Object.entries(valor).map(([k, v]) => `${k}: ${String(v ?? '')}`).join(', ');
                  } else {
                    valorTexto = String(valor);
                  }
                }

                return (
                  <tr key={id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">{`{{${id}}}`}</td>
                    <td className="p-3 text-slate-800 dark:text-slate-100 font-medium">{campo?.label || '-'}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase">{campo?.tipo || 'texto'}</td>
                    <td className="p-3">
                      {temValor ? (
                        <span className="text-slate-900 dark:text-slate-200 font-medium bg-emerald-50 dark:bg-slate-900/90 text-emerald-800 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200 dark:border-slate-700 inline-block max-w-md">
                          {valorTexto || '-'}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">Vazio</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
