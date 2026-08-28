import React from 'react';
import { FieldMetadata } from '../../../types';

interface TextAreaFieldInputProps {
  campo: FieldMetadata;
  valor: any;
  onChange: (id: string, valor: any) => void;
}

export const TextAreaFieldInput: React.FC<TextAreaFieldInputProps> = ({
  campo,
  valor,
  onChange,
}) => {
  return (
    <div>
      <textarea
        id={campo.id}
        rows={campo.rows ? Number(campo.rows) : 3}
        value={valor}
        placeholder={campo.placeholder || campo.descricao || ''}
        onChange={e => onChange(campo.id, e.target.value)}
        className="w-full text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-2.5 py-1.5 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y"
      />
    </div>
  );
};
