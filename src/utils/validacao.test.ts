import { describe, expect, it } from 'vitest';
import { validarCampo, validarCEP, validarCNPJ, validarCPF, validarEmail } from './validacao';
import type { FieldMetadata } from '../types';

describe('validarEmail', () => {
  it('aceita e-mail em formato usual', () => {
    expect(validarEmail('fulano@exemplo.com.br')).toBe(true);
    expect(validarEmail('  fulano.silva+tag@exemplo.io  ')).toBe(true);
  });

  it('recusa e-mail malformado', () => {
    expect(validarEmail('fulano@exemplo')).toBe(false);
    expect(validarEmail('fulano@exemplo.c')).toBe(false);
    expect(validarEmail('fulano exemplo@x.com')).toBe(false);
    expect(validarEmail('@exemplo.com')).toBe(false);
  });

  it('recusa vazio, null e undefined', () => {
    expect(validarEmail('')).toBe(false);
    expect(validarEmail(null)).toBe(false);
    expect(validarEmail(undefined)).toBe(false);
  });
});

describe('validarCPF', () => {
  it('aceita CPF com dígitos verificadores corretos (com e sem máscara)', () => {
    expect(validarCPF('529.982.247-25')).toBe(true);
    expect(validarCPF('52998224725')).toBe(true);
  });

  it('recusa dígito verificador errado, tamanho errado e repetidos', () => {
    expect(validarCPF('52998224724')).toBe(false);
    expect(validarCPF('123')).toBe(false);
    expect(validarCPF('11111111111')).toBe(false);
  });

  it('considera campo vazio como válido (preenchimento opcional)', () => {
    expect(validarCPF('')).toBe(true);
    expect(validarCPF(null)).toBe(true);
    expect(validarCPF('   ')).toBe(true);
  });
});

describe('validarCNPJ', () => {
  it('aceita CNPJ com dígitos verificadores corretos (com e sem máscara)', () => {
    expect(validarCNPJ('11.222.333/0001-81')).toBe(true);
    expect(validarCNPJ('11222333000181')).toBe(true);
  });

  it('recusa dígito verificador errado, tamanho errado e repetidos', () => {
    expect(validarCNPJ('11222333000180')).toBe(false);
    expect(validarCNPJ('112223330001')).toBe(false);
    expect(validarCNPJ('11111111111111')).toBe(false);
  });

  it('considera campo vazio como válido', () => {
    expect(validarCNPJ('')).toBe(true);
    expect(validarCNPJ(undefined)).toBe(true);
  });
});

describe('validarCEP', () => {
  it('aceita CEP com 8 dígitos', () => {
    expect(validarCEP('01310-100')).toBe(true);
    expect(validarCEP('01310100')).toBe(true);
  });

  it('recusa quantidade de dígitos diferente de 8', () => {
    expect(validarCEP('0131010')).toBe(false);
    expect(validarCEP('013101000')).toBe(false);
  });

  it('considera campo vazio como válido', () => {
    expect(validarCEP('')).toBe(true);
  });
});

describe('validarCampo — status e mensagem por tipo', () => {
  const campo = (tipo: string, tipoInput?: string): FieldMetadata => ({
    id: 'x',
    label: 'X',
    tipo: tipo as FieldMetadata['tipo'],
    ...(tipoInput ? { tipoInput } : {}),
  });

  it('deixa passar campo vazio, qualquer que seja o tipo', () => {
    expect(validarCampo(campo('input', 'email'), '')).toEqual({ valido: true });
    expect(validarCampo(campo('input', 'cpf'), '   ')).toEqual({ valido: true });
  });

  it('valida e-mail', () => {
    expect(validarCampo(campo('input', 'email'), 'a@b.com')).toEqual({ valido: true });
    expect(validarCampo(campo('input', 'email'), 'a@b')).toEqual({
      valido: false,
      msg: 'E-mail em formato inválido',
    });
  });

  it('valida CPF e CNPJ com a mensagem de dígito verificador', () => {
    expect(validarCampo(campo('number', 'cpf'), '52998224725')).toEqual({ valido: true });
    expect(validarCampo(campo('number', 'cpf'), '52998224724').msg).toContain('CPF inválido');
    expect(validarCampo(campo('number', 'cnpj'), '11.222.333/0001-81')).toEqual({ valido: true });
    expect(validarCampo(campo('number', 'cnpj'), '11222333000180').msg).toContain('CNPJ inválido');
  });

  it('valida CEP e telefone pela quantidade de dígitos', () => {
    expect(validarCampo(campo('number', 'cep'), '01310-100')).toEqual({ valido: true });
    expect(validarCampo(campo('number', 'cep'), '123').msg).toBe('CEP deve conter 8 dígitos');
    expect(validarCampo(campo('number', 'telefone'), '(11) 99999-9999')).toEqual({ valido: true });
    expect(validarCampo(campo('number', 'telefone'), '119').msg).toBe(
      'Telefone deve conter 10 ou 11 dígitos'
    );
  });

  it('usa o tipoInput da coluna quando ele existe', () => {
    // tipo macro "input" com coluna "cpf": vale o mais específico
    expect(validarCampo(campo('input', 'cpf'), '11111111111').valido).toBe(false);
    // sem tipoInput, "input" não impõe validação nenhuma
    expect(validarCampo(campo('input'), '11111111111')).toEqual({ valido: true });
  });
});
