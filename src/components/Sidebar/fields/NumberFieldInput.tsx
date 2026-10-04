import React from 'react';
import type { ValorCampo } from '../../../types';
import { FieldMetadata } from '../../../types';
import {
  aplicarMascaraCampo,
  normalizarValorCampo,
} from '../../../utils/documentUtils';

interface NumberFieldInputProps {
  campo: FieldMetadata;
  valor: ValorCampo;
  onChange: (id: string, valor: ValorCampo) => void;
  statusValidacao?: { valido: boolean; msg?: string };
}

export const NumberFieldInput: React.FC<NumberFieldInputProps> = ({
  campo,
  valor,
  onChange,
  statusValidacao = { valido: true },
}) => {
  const mascara = (campo.tipoInput || '').toLowerCase();
  const isMasked = ['moeda', 'cpf', 'cnpj', 'cep', 'telefone'].includes(mascara);
  // O que aparece no campo precisa ser o mesmo número que o documento mostra: normaliza
  // primeiro (mesma regra do filtro) e só depois aplica a máscara. Sem isso, um valor em
  // texto vindo de JSON ("100") aparecia como 1,00 no campo e 100,00 no documento.
  const valorExibido = isMasked
    ? aplicarMascaraCampo(normalizarValorCampo(valor, mascara), mascara)
    : valor == null ? '' : String(valor);

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
        placeholder={campo.placeholder || ''}
        onKeyDown={e => {
          if (!isMasked && e.key.length === 1 && !/^[0-9.,\-]$/.test(e.key)) {
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
        className={`w-full text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 transition-all ${
          !statusValidacao.valido ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-300 dark:border-slate-600 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:ring-blue-500/20'
        }`}
      />
    </div>
  );
};
