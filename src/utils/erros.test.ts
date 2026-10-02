import { describe, expect, it } from 'vitest';
import { motivoDoErro } from './erros';

describe('motivoDoErro — mensagem legível de um erro lançado', () => {
  it('usa a mensagem de um Error', () => {
    expect(motivoDoErro(new Error('falha ao abrir o arquivo'))).toBe('falha ao abrir o arquivo');
  });

  it('aceita um throw de string (que não tem .message)', () => {
    expect(motivoDoErro('erro solto')).toBe('erro solto');
  });

  it('cai no padrão quando o erro não traz mensagem alguma', () => {
    expect(motivoDoErro({})).toBe('erro desconhecido');
    expect(motivoDoErro(undefined)).toBe('erro desconhecido');
    expect(motivoDoErro(null)).toBe('erro desconhecido');
  });

  it('respeita um padrão informado pelo chamador', () => {
    expect(motivoDoErro('', 'JSON inválido para formatar')).toBe('JSON inválido para formatar');
  });

  it('achata quebras de linha em uma linha só', () => {
    expect(motivoDoErro(new Error('linha 1\nlinha 2\t  fim'))).toBe('linha 1 linha 2 fim');
  });

  it('limita o tamanho para não estourar a notificação', () => {
    const resultado = motivoDoErro(new Error('x'.repeat(500)));
    expect(resultado.length).toBe(243); // 240 + "..."
    expect(resultado.endsWith('...')).toBe(true);
  });
});
