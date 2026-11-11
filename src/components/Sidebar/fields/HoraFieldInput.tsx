import React from 'react';
import type { ValorCampo } from '../../../types';
import { FieldMetadata } from '../../../types';
import { formatarHora } from '../../../utils/formatacao';

interface HoraFieldInputProps {
  campo: FieldMetadata;
  valor: ValorCampo;
  onChange: (id: string, valor: ValorCampo) => void;
}

/**
 * Campo de horário com seletor nativo (`<number tipo="hora">` ou `<input tipo="hora">`).
 * O valor persistido é HH:MM; a exibição usa a mesma normalização dos filtros.
 */
export const HoraFieldInput: React.FC<HoraFieldInputProps> = ({
  campo,
  valor,
  onChange,
}) => {
  return (
    <div>
      <input
        id={campo.id}
        type="time"
        step="60"
        value={formatarHora(valor)}
        onChange={e => onChange(campo.id, e.target.value)}
        className="w-full text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-2.5 py-1.5 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
      />
    </div>
  );
};
