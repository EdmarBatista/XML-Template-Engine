import React from 'react';
import { FieldMetadata } from '../../../types';
import {
  aplicarMascaraCampo,
  normalizarValorCampo,
} from '../../../utils/documentUtils';

interface NumberFieldInputProps {
  campo: FieldMetadata;
  valor: any;
  onChange: (id: string, valor: any) => void;
}

export const NumberFieldInput: React.FC<NumberFieldInputProps> = ({
  campo,
  valor,
  onChange,
}) => {
  const mascara = (campo.tipoInput || '').toLowerCase();
  const isMasked = ['moeda', 'cpf', 'cnpj', 'cep'].includes(mascara);
  const valorExibido = isMasked ? aplicarMascaraCampo(valor, mascara) : valor;

  return (
    <div>
      <input
        id={campo.id}
        type={isMasked ? 'text' : 'number'}
        inputMode="numeric"
        pattern="[0-9]*"
        min={isMasked ? undefined : campo.min}
        max={isMasked ? undefined : campo.max}
        step={isMasked ? undefined : campo.step}
        value={valorExibido}
        placeholder={campo.placeholder || campo.exemplo ? `Ex: ${campo.exemplo}` : ''}
        onKeyDown={e => {
          if (!isMasked && ['e', 'E', '+'].includes(e.key)) {
            e.preventDefault();
          }
        }}
        onChange={e => {
          const raw = e.target.value;
          if (isMasked) {
            const formatado = aplicarMascaraCampo(raw, mascara);
            const valBruto = normalizarValorCampo(formatado, mascara);
            onChange(campo.id, valBruto);
          } else {
            onChange(campo.id, raw === '' ? '' : Number(raw));
          }
        }}
        className="w-full text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-2.5 py-1.5 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
      />
    </div>
  );
};
