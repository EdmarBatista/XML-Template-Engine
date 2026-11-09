import { describe, expect, it } from 'vitest';
import type { FieldMetadata, FormGroup } from '../types';
import { coletarPendencias } from './pendencias';

const campo = (extra: Partial<FieldMetadata>): FieldMetadata => ({
  id: 'campo',
  label: 'Campo',
  tipo: 'input',
  ...extra,
});

const grupos: FormGroup[] = [
  {
    titulo: 'Identificação',
    campos: ['servico_engenharia'],
    itens: [{ tipo: 'campo', id: 'servico_engenharia' }],
  },
  {
    titulo: 'Etapas',
    campos: ['etapas_execucao'],
    itens: [{ tipo: 'campo', id: 'etapas_execucao' }],
  },
];

const campos: Record<string, FieldMetadata> = {
  servico_engenharia: campo({
    id: 'servico_engenharia',
    label: 'Serviço de engenharia?',
    tipo: 'select',
    condicao: "tipo_contratacao == 'serviços'",
    obrigatorio: "tipo_contratacao == 'serviços'",
    mensagemPendencia: 'Selecione sim ou não: ausência de escolha não equivale a serviço não-engenharia.',
  }),
  etapas_execucao: campo({
    id: 'etapas_execucao',
    label: 'Etapas de execução',
    tipo: 'tabela',
    obrigatorio: 'incluir_etapas_execucao == true',
  }),
};

describe('coletarPendencias — obrigatoriedade condicional', () => {
  it('não cobra campo oculto pela própria condição', () => {
    expect(
      coletarPendencias(campos, { tipo_contratacao: 'obras', servico_engenharia: '' }, grupos)
    ).toEqual([]);
  });

  it('cobra o campo quando a condição é verdadeira e o valor está vazio', () => {
    const pendencias = coletarPendencias(
      campos,
      { tipo_contratacao: 'serviços', servico_engenharia: '' },
      grupos
    );

    expect(pendencias).toHaveLength(1);
    expect(pendencias[0]).toMatchObject({
      id: 'servico_engenharia',
      rotulo: 'Serviço de engenharia?',
      grupo: 'Identificação',
      tipo: 'campo_obrigatorio',
      mensagem:
        'Selecione sim ou não: ausência de escolha não equivale a serviço não-engenharia.',
    });
  });

  it('libera quando o campo recebe sim ou não', () => {
    for (const valor of ['sim', 'nao']) {
      expect(
        coletarPendencias(campos, { tipo_contratacao: 'serviços', servico_engenharia: valor }, grupos)
      ).toEqual([]);
    }
  });
});

describe('coletarPendencias — tabela opcional', () => {
  it('não cobra tabela quando a condição é falsa', () => {
    expect(
      coletarPendencias(campos, { incluir_etapas_execucao: false, etapas_execucao: [] }, grupos)
    ).toEqual([]);
  });

  it('libera tabela com ao menos uma linha preenchida', () => {
    expect(
      coletarPendencias(
        campos,
        { incluir_etapas_execucao: true, etapas_execucao: [{ etapa: 'Mobilização' }] },
        grupos
      )
    ).toEqual([]);
  });

  it('cobra tabela vazia e não duplica a pendência', () => {
    for (const valor of [[], [{ etapa: '' }, {}]]) {
      const pendencias = coletarPendencias(
        campos,
        { incluir_etapas_execucao: true, etapas_execucao: valor },
        grupos
      );

      expect(pendencias).toHaveLength(1);
      expect(pendencias[0]).toMatchObject({
        id: 'etapas_execucao',
        grupo: 'Etapas',
        tipo: 'tabela_vazia',
        mensagem: 'Inclua ao menos uma linha preenchida nesta tabela.',
      });
    }
  });
});

describe('coletarPendencias — regras gerais', () => {
  it('aceita obrigatorio="true" e valores escalares preenchidos', () => {
    const obrigatorios = {
      nome: campo({ id: 'nome', label: 'Nome', obrigatorio: 'true' }),
      quantidade: campo({ id: 'quantidade', label: 'Quantidade', tipo: 'number', obrigatorio: 'true' }),
    };

    expect(coletarPendencias(obrigatorios, { nome: '', quantidade: 0 })).toHaveLength(1);
    expect(coletarPendencias(obrigatorios, { nome: 'Fulano', quantidade: 0 })).toEqual([]);
  });

  it('não cobra campo sem obrigatoriedade', () => {
    const opcionais = { nome: campo({ id: 'nome', label: 'Nome' }) };
    expect(coletarPendencias(opcionais, { nome: '' })).toEqual([]);
  });
});
