// Gerado a partir de documentUtils.ts (fatoracao)

import { converterFormatoData, dataPorExtenso, formatarMoeda, numeroPorExtenso, moedaPorExtenso, converterParaRomano } from './formatacao';

export function formatarCPF(valor: any): string {
  if (valor === null || valor === undefined) return '';
  const cpf = String(valor).replace(/\D/g, '').substring(0, 11);

  if (cpf.length > 9) {
    return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  }
  if (cpf.length > 6) {
    return cpf.replace(/^(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
  }
  if (cpf.length > 3) {
    return cpf.replace(/^(\d{3})(\d{0,3})/, '$1.$2');
  }
  return cpf;
}


export function formatarCNPJ(valor: any): string {
  if (valor === null || valor === undefined) return '';
  const cnpj = String(valor).replace(/\D/g, '').substring(0, 14);

  if (cnpj.length > 12) {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  if (cnpj.length > 8) {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
  }
  if (cnpj.length > 5) {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
  }
  if (cnpj.length > 2) {
    return cnpj.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
  }
  return cnpj;
}


export function normalizarDigitos(valor: any): string {
  return String(valor ?? '').replace(/\D/g, '');
}


export function formatarCEP(valor: any): string {
  if (valor === null || valor === undefined) return '';
  let cep = String(valor).replace(/\D/g, '').substring(0, 8);
  if (cep.length > 5) {
    cep = cep.replace(/^(\d{5})(\d{1,3})/, '$1-$2');
  }
  return cep;
}

export function formatarTelefone(valor: any): string {
  if (valor === null || valor === undefined) return '';
  const digits = String(valor).replace(/\D/g, '').substring(0, 11);
  if (digits.length > 10) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  if (digits.length > 6) {
    return digits.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
  }
  if (digits.length > 2) {
    return digits.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
  }
  return digits;
}


export function aplicarMascaraCampo(valor: any, tipo: string): string {
  if (!tipo) return valor ?? '';
  const nome = String(tipo).toLowerCase().trim();
  switch (nome) {
    case 'moeda':
      return formatarMoeda(valor);
    case 'cpf':
      return formatarCPF(valor);
    case 'cnpj':
      return formatarCNPJ(valor);
    case 'cep':
      return formatarCEP(valor);
    case 'tel':
    case 'telefone':
      return formatarTelefone(valor);
    default:
      return valor ?? '';
  }
}


export function normalizarValorCampo(valor: any, tipo: string): any {
  const nome = String(tipo || '').toLowerCase().trim();
  if (valor === null || valor === undefined || valor === '') {
    return '';
  }

  if (nome === 'cpf') {
    return String(valor).replace(/\D/g, '').substring(0, 11);
  }

  if (nome === 'cnpj') {
    return String(valor).replace(/\D/g, '').substring(0, 14);
  }

  if (nome === 'cep') {
    return String(valor).replace(/\D/g, '').substring(0, 8);
  }

  if (nome === 'moeda') {
    if (typeof valor === 'number') {
      return Number.isFinite(valor) ? valor : '';
    }
    const texto = String(valor).trim();
    if (!texto) return '';

    if (texto.includes(',')) {
      const numero = parseFloat(texto.replace(/\./g, '').replace(',', '.'));
      return Number.isFinite(numero) ? numero : '';
    }
    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : '';
  }

  return valor;
}


export function aplicarFiltroDocumento(valor: any, filtro: string): string {
  if (valor === null || valor === undefined || valor === '') {
    return '';
  }

  switch (filtro) {
    case 'moeda': {
      const bruto = normalizarValorCampo(valor, 'moeda');
      return formatarMoeda(bruto);
    }
    case 'data':
      return converterFormatoData(valor, 'BR');
    case 'dataPorExtenso':
      return dataPorExtenso(valor);
    case 'numeroPorExtenso':
      return numeroPorExtenso(valor);
    case 'moedaPorExtenso':
      return moedaPorExtenso(valor);
    case 'romano':
      return converterParaRomano(valor);
    case 'cpf':
      return formatarCPF(normalizarValorCampo(valor, 'cpf'));
    case 'cnpj':
      return formatarCNPJ(normalizarValorCampo(valor, 'cnpj'));
    case 'cep':
      return formatarCEP(normalizarValorCampo(valor, 'cep'));
    case 'tel':
    case 'telefone':
      return formatarTelefone(valor);
    case 'email':
      return String(valor);
    default:
      return String(valor);
  }
}

/**
 * Formata um item individual de um loop foreach, removendo aspas externas caso existam.
 */
