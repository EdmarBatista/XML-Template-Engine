import React from 'react';
import { FieldMetadata } from '../../../types';

interface DateFieldInputProps {
  campo: FieldMetadata;
  valor: any;
  onChange: (id: string, valor: any) => void;
}

export const DateFieldInput: React.FC<DateFieldInputProps> = ({
  campo,
  valor,
  onChange,
}) => {
  return (
    <div>
      <input
        id={campo.id}
        type="date"
        value={valor}
        onChange={e => onChange(campo.id, e.target.value)}
        className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
      />
    </div>
  );
};
