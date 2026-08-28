import React from 'react';
import { consultarEmpresaCNPJ, consultarEnderecoCEP, LookupResult, criarLookupVazio } from './apiService';
import { normalizarDigitos } from '../utils/documentUtils';

interface UseLookupArgs {
  cnpj?: string;
  cep?: string;
}

/**
 * Hook para consulta automática de CNPJ e CEP (com debounce e cancelamento),
 * encapsulando o estado loading/data/error que antes ficava dentro do Sidebar.
 */
export function useCnpjCepLookup({ cnpj, cep }: UseLookupArgs): {
  cnpjLookup: LookupResult;
  cepLookup: LookupResult;
} {
  const [cnpjLookup, setCnpjLookup] = React.useState<LookupResult>(criarLookupVazio());
  const [cepLookup, setCepLookup] = React.useState<LookupResult>(criarLookupVazio());

  const cnpjLimpo = normalizarDigitos(cnpj || '');
  const cepLimpo = normalizarDigitos(cep || '');

  React.useEffect(() => {
    if (!cnpjLimpo || cnpjLimpo.length !== 14) {
      setCnpjLookup({ loading: false, data: null, error: null, chave: cnpjLimpo });
      return;
    }

    let cancelado = false;
    setCnpjLookup(prev => (prev.chave === cnpjLimpo && prev.data ? prev : { loading: true, data: null, error: null, chave: cnpjLimpo }));

    const timer = setTimeout(() => {
      consultarEmpresaCNPJ(cnpjLimpo)
        .then(info => {
          if (!cancelado) setCnpjLookup({ loading: false, data: info, error: null, chave: cnpjLimpo });
        })
        .catch(() => {
          if (!cancelado) setCnpjLookup({ loading: false, data: null, error: 'Dados da empresa indisponíveis no momento', chave: cnpjLimpo });
        });
    }, 600);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [cnpjLimpo]);

  React.useEffect(() => {
    if (!cepLimpo || cepLimpo.length !== 8) {
      setCepLookup({ loading: false, data: null, error: null, chave: cepLimpo });
      return;
    }

    let cancelado = false;
    setCepLookup(prev => (prev.chave === cepLimpo && prev.data ? prev : { loading: true, data: null, error: null, chave: cepLimpo }));

    const timer = setTimeout(() => {
      consultarEnderecoCEP(cepLimpo)
        .then(info => {
          if (!cancelado) setCepLookup({ loading: false, data: info, error: null, chave: cepLimpo });
        })
        .catch(() => {
          if (!cancelado) setCepLookup({ loading: false, data: null, error: 'Erro ao consultar CEP', chave: cepLimpo });
        });
    }, 500);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [cepLimpo]);

  return { cnpjLookup, cepLookup };
}
