import React from 'react';
import { FieldMetadata } from '../../../types';

interface TextFieldInputProps {
  campo: FieldMetadata;
  valor: any;
  onChange: (id: string, valor: any) => void;
  statusValidacao: { valido: boolean; msg?: string };
}

export const TextFieldInput: React.FC<TextFieldInputProps> = ({
  campo,
  valor,
  onChange,
  statusValidacao,
}) => {
  return (
    <div>
      <input
        id={campo.id}
        type={campo.tipoInput === 'email' ? 'email' : 'text'}
        value={valor ?? ''}
        placeholder={campo.placeholder || ''}
        onChange={e => onChange(campo.id, e.target.value)}
        className={`w-full text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border rounded-md px-2.5 py-1.5 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
          !statusValidacao.valido ? 'border-red-400 bg-red-50/30' : 'border-slate-300 dark:border-slate-600'
        }`}
      />
    </div>
  );
};
