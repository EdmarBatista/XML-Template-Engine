import React from 'react';
import { FieldMetadata } from '../../../types';
import { avaliarExpressao } from '../../../utils/expressionEvaluator';

interface ChoiceFieldInputProps {
  campo: FieldMetadata;
  valor: any;
  dados: Record<string, any>;
  onChange: (id: string, valor: any) => void;
  nivel: number;
  renderCampo: (campoId: string, nivel?: number) => React.ReactNode;
}

export const ChoiceFieldInput: React.FC<ChoiceFieldInputProps> = ({
  campo,
  valor,
  dados,
  onChange,
  nivel,
  renderCampo,
}) => {
  if (campo.tipo === 'checkbox') {
    return (
      <div className="pt-0.5">
        <label className="flex items-center gap-2.5 px-2.5 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-xs transition select-none">
          <input
            id={campo.id}
            type="checkbox"
            checked={Boolean(valor)}
            onChange={e => onChange(campo.id, e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
          />
          <span className="font-medium text-slate-800 dark:text-slate-100 cursor-pointer">{campo.label}</span>
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 pt-0.5">
      {(campo.opcoesDetalhadas || campo.opcoes?.map(o => ({ label: o, valor: o })) || []).map((opt, i) => {
        if (opt.expr && !avaliarExpressao(opt.expr, dados)) return null;
        const val = opt.valor ?? opt.label;
        const isChecked = String(valor) === String(val);
        return (
          <label
            key={i}
            onClick={() => onChange(campo.id, val)}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-md border text-xs cursor-pointer transition-all ${
              isChecked
                ? 'bg-blue-50 dark:bg-blue-950 border-blue-400 dark:border-blue-500 font-medium text-blue-900 dark:text-blue-200 shadow-2xs ring-1 ring-blue-300 dark:ring-blue-600'
                : 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <input
              type="radio"
              name={`radio-${campo.id}`}
              value={val}
              checked={isChecked}
              onChange={() => onChange(campo.id, val)}
              className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="cursor-pointer">{opt.label}</span>
          </label>
        );
      })}

      {/* Sub-inputs condicionais aninhados dentro do grupo radio */}
      {campo.controlesCondicionais?.map((cond, ci) => {
        if (!cond.expr || !avaliarExpressao(cond.expr, dados)) return null;
        return (
          <div key={ci} className="pt-2 pl-2 border-l-2 border-blue-400 space-y-2 mt-1">
            {cond.itens.map(item => (item.tipo === 'campo' ? renderCampo(item.id, nivel + 1) : null))}
          </div>
        );
      })}
    </div>
  );
};
