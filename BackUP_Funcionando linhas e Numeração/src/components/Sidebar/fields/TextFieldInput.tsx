import React from 'react';
import { FieldMetadata } from '../../../types';
import {
  aplicarMascaraCampo,
  normalizarValorCampo,
} from '../../../utils/documentUtils';

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
  const mascara = (campo.tipoInput || '').toLowerCase();
  const isMasked = ['moeda', 'cpf', 'cnpj', 'cpfcnpj', 'cep'].includes(mascara);
  const valorExibido = isMasked ? aplicarMascaraCampo(valor, mascara) : valor;

  return (
    <div>
      <input
        id={campo.id}
        type={isMasked ? 'text' : campo.tipoInput || 'text'}
        inputMode={isMasked ? 'numeric' : undefined}
        value={valorExibido}
        placeholder={campo.placeholder || campo.exemplo ? `Ex: ${campo.exemplo}` : ''}
        onChange={e => {
          const raw = e.target.value;
          if (isMasked) {
            const formatado = aplicarMascaraCampo(raw, mascara);
            const valBruto = normalizarValorCampo(formatado, mascara);
            onChange(campo.id, valBruto);
          } else {
            onChange(campo.id, raw);
          }
        }}
        className={`w-full text-xs text-slate-900 bg-slate-50 border rounded-md px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
          !statusValidacao.valido ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
        }`}
      />
    </div>
  );
};
