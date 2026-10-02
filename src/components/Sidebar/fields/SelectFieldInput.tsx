import React from 'react';
import type { ValorCampo } from '../../../types';
import { FieldMetadata, DadosDocumento } from '../../../types';
import { avaliarExpressao } from '../../../utils/expressionEvaluator';

interface SelectFieldInputProps {
  campo: FieldMetadata;
  valor: ValorCampo;
  dados: DadosDocumento;
  onChange: (id: string, valor: ValorCampo) => void;
}

export const SelectFieldInput: React.FC<SelectFieldInputProps> = ({
  campo,
  valor,
  dados,
  onChange,
}) => {
  return (
    <div>
      <select
        id={campo.id}
        value={valor == null ? '' : String(valor)}
        onChange={e => onChange(campo.id, e.target.value)}
        className="w-full text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-2.5 py-1.5 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
      >
        <option value="">Selecione uma opção...</option>
        {(campo.opcoesDetalhadas || campo.opcoes?.map(o => ({ label: o, valor: o })) || []).map((opt, i) => {
          if (opt.expr && !avaliarExpressao(opt.expr, dados)) return null;
          return (
            <option key={i} value={opt.valor ?? opt.label}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </div>
  );
};
