

import { normalizarDigitos } from './mascaras';

export function validarEmail(email: any): boolean {
  if (email === null || email === undefined) return false;
  const valor = String(email).trim();
  return !!valor && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(valor);
}


export function validarCPF(valor: any): boolean {
  const cpf = normalizarDigitos(valor);
  if (!cpf) return true;
  if (cpf.length !== 11) return false;
  if (/^([0-9])\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += Number(cpf[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== Number(cpf[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += Number(cpf[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== Number(cpf[10])) return false;

  return true;
}


export function validarCNPJ(valor: any): boolean {
  const cnpj = normalizarDigitos(valor);
  if (!cnpj) return true;
  if (cnpj.length !== 14) return false;
  if (/^([0-9])\1{13}$/.test(cnpj)) return false;

  let soma = 0;
  let peso = 5;
  for (let i = 0; i < 12; i++) {
    soma += Number(cnpj[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  let digito = soma % 11;
  digito = digito < 2 ? 0 : 11 - digito;
  if (digito !== Number(cnpj[12])) return false;

  soma = 0;
  peso = 6;
  for (let i = 0; i < 13; i++) {
    soma += Number(cnpj[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  digito = soma % 11;
  digito = digito < 2 ? 0 : 11 - digito;

  return digito === Number(cnpj[13]);
}


export function validarCEP(valor: any): boolean {
  const cep = normalizarDigitos(valor);
  return !cep || cep.length === 8;
}

/**
 * Valida um campo do formulário conforme o tipo/validar e devolve o status+mensagem.
 .
 */
export function validarCampo(
  campo: import('../types').FieldMetadata | import('../types').TableColumnMetadata,
  valor: any
): { valido: boolean; msg?: string } {
  const v = String(valor ?? '').trim();
  if (!v) {
    return { valido: true };
  }
  const tipoCampo = (campo.tipo || '').toLowerCase();
  const tipoInput = (('tipoInput' in campo ? campo.tipoInput : '') || '').toLowerCase();
  
  // O tipo final considera tanto o macro quanto o micro, já que nas tabelas eles se fundem
  const tipoEfetivo = tipoInput || tipoCampo;

  if (tipoEfetivo === 'email' && !validarEmail(v)) {
    return { valido: false, msg: 'E-mail em formato inválido' };
  }
  if (tipoEfetivo === 'cpf' && !validarCPF(v)) {
    return { valido: false, msg: 'CPF inválido (verifique os dígitos verificadores)' };
  }
  if (tipoEfetivo === 'cnpj' && !validarCNPJ(v)) {
    return { valido: false, msg: 'CNPJ inválido (verifique os dígitos verificadores)' };
  }
  if (tipoEfetivo === 'cep' && !validarCEP(v)) {
    return { valido: false, msg: 'CEP deve conter 8 dígitos' };
  }
  if (tipoEfetivo === 'telefone' && v) {
    const digitos = normalizarDigitos(v);
    if (digitos.length < 10 || digitos.length > 11) {
      return { valido: false, msg: 'Telefone deve conter 10 ou 11 dígitos' };
    }
  }
  return { valido: true };
}
