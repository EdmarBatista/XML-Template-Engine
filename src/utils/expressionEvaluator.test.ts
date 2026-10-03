import { describe, expect, it } from 'vitest';
import {
  avaliarExpressao,
  decodificarEntidadesXml,
  extrairVariaveisDaExpressao,
} from './expressionEvaluator';

describe('decodificarEntidadesXml — entidades antes de avaliar a expressão', () => {
  it('devolve string vazia para entrada vazia', () => {
    expect(decodificarEntidadesXml('')).toBe('');
    expect(decodificarEntidadesXml(undefined as unknown as string)).toBe('');
  });

  it('decodifica as cinco entidades XML básicas', () => {
    expect(decodificarEntidadesXml('&amp;&lt;&gt;&quot;&apos;')).toBe('&<>"\'');
  });

  it('decodifica entidades aninhadas até estabilizar', () => {
    // O &amp;apos; do Word vira &apos; e só então vira apóstrofo.
    expect(decodificarEntidadesXml('&amp;apos;')).toBe("'");
    expect(decodificarEntidadesXml('&amp;amp;')).toBe('&');
  });
});

describe('avaliarExpressao — veracidade de variável isolada', () => {
  it('trata a variável sozinha pela veracidade do valor', () => {
    expect(avaliarExpressao('urgente', { urgente: true })).toBe(true);
    expect(avaliarExpressao('urgente', { urgente: false })).toBe(false);
    expect(avaliarExpressao('urgente', {})).toBe(false);
  });

  it('aceita a negação com !', () => {
    expect(avaliarExpressao('!urgente', { urgente: false })).toBe(true);
    expect(avaliarExpressao('!urgente', { urgente: true })).toBe(false);
  });

  it('sem expressão, libera o conteúdo', () => {
    expect(avaliarExpressao('', {})).toBe(true);
  });
});

describe('avaliarExpressao — comparações', () => {
  it('compara número quando os dois lados são numéricos, mesmo vindos como texto do formulário', () => {
    expect(avaliarExpressao('valor > 100', { valor: '250' })).toBe(true);
    expect(avaliarExpressao('valor > 100', { valor: '50' })).toBe(false);
    expect(avaliarExpressao('valor >= 100', { valor: '100' })).toBe(true);
    expect(avaliarExpressao('valor <= 10', { valor: '10' })).toBe(true);
    expect(avaliarExpressao('valor == 100', { valor: 100 })).toBe(true);
  });

  it('compara texto quando não dá para tratar como número', () => {
    expect(avaliarExpressao('situacao == aprovado', { situacao: 'aprovado' })).toBe(true);
    expect(avaliarExpressao('situacao == aprovado', { situacao: 'reprovado' })).toBe(false);
    expect(avaliarExpressao('situacao != aprovado', { situacao: 'reprovado' })).toBe(true);
  });

  it('respeita literais entre aspas simples e duplas', () => {
    expect(avaliarExpressao("situacao == 'em análise'", { situacao: 'em análise' })).toBe(true);
    expect(avaliarExpressao('situacao == "em análise"', { situacao: 'em análise' })).toBe(true);
  });

  it('respeita os literais booleanos true/false', () => {
    expect(avaliarExpressao('assinado == false', { assinado: false })).toBe(true);
    expect(avaliarExpressao('assinado == true', { assinado: false })).toBe(false);
  });

  it('trata valor ausente como string vazia', () => {
    expect(avaliarExpressao('x == ""', {})).toBe(true);
  });

  it('devolve falso para expressão que não é comparação reconhecida', () => {
    expect(avaliarExpressao('a b c', {})).toBe(false);
  });
});

describe('avaliarExpressao — operadores lógicos', () => {
  it('aceita || e OR', () => {
    expect(avaliarExpressao('a || b', { b: true })).toBe(true);
    expect(avaliarExpressao('a OR b', { b: true })).toBe(true);
    expect(avaliarExpressao('a OR b', {})).toBe(false);
  });

  it('aceita && e AND', () => {
    expect(avaliarExpressao('a && b', { a: true, b: true })).toBe(true);
    expect(avaliarExpressao('a AND b', { a: true })).toBe(false);
  });

  it('não divide o operador que está dentro de parênteses', () => {
    expect(avaliarExpressao('(a == 1) || (b == 2)', { a: '9', b: '2' })).toBe(true);
    expect(avaliarExpressao('(a == 1) || (b == 2)', { a: '9', b: '9' })).toBe(false);
  });

  it('decodifica entidades antes de comparar (< e > vindos do XML)', () => {
    expect(avaliarExpressao('valor &lt;= 10', { valor: '5' })).toBe(true);
    expect(avaliarExpressao('valor &gt; 10', { valor: '5' })).toBe(false);
  });
});

describe('extrairVariaveisDaExpressao — varredura para o aviso de variável não declarada', () => {
  it('devolve lista vazia para entrada vazia', () => {
    expect(extrairVariaveisDaExpressao('')).toEqual([]);
  });

  it('ignora literais, números, operadores e palavras-chave', () => {
    expect(extrairVariaveisDaExpressao("situacao == 'aprovado' && valor > 100")).toEqual([
      'situacao',
      'valor',
    ]);
    expect(extrairVariaveisDaExpressao('flag == true OR NOT outra')).toEqual(['flag', 'outra']);
  });

  it('mantém o acesso com ponto (coluna de tabela)', () => {
    expect(extrairVariaveisDaExpressao('item.valor > 10')).toEqual(['item.valor']);
  });
});
