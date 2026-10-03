// @vitest-environment jsdom
// A conversão nativa usa JSZip + DOMParser e roda sobre o .docx real da AGU que está
// versionado na raiz. É o teste que roda em todo push o que a bancada manual cobria.

import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'fs';
import { converterDocxParaModeloXml } from './converter';
import { parseXmlDocument } from '../utils/xmlParser';

const FIXTURE = 'modelo-de-termo-de-referencia-servicos-e-obras-lei-no-14-133-mai-26.docx';

const contar = (texto: string, re: RegExp): number => (texto.match(re) || []).length;

describe('converterDocxParaModeloXml — Termo de Referência real da AGU', () => {
  let xml = '';
  let jsonInicial: Record<string, unknown> = {};
  let nomeSugerido = '';

  beforeAll(async () => {
    const buffer = fs.readFileSync(FIXTURE);
    const file = new File([buffer], 'modelo.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const resultado = await converterDocxParaModeloXml(file);
    xml = resultado.xml;
    jsonInicial = resultado.jsonInicial;
    nomeSugerido = resultado.nomeSugerido;
  }, 30000);

  it('converte a fixture mantendo a estrutura de referência', () => {
    expect(contar(xml, /<secao[\s>]/g)).toBe(158);
    expect(contar(xml, /<p[\s>]/g)).toBe(781);
    expect(contar(xml, /<secao titulo="/g)).toBe(23);
    expect(contar(xml, /<subtitulo/g)).toBe(54);
    expect(xml).toContain('CONDIÇÕES GERAIS DA CONTRATAÇÃO');
    expect(nomeSugerido).toBe('modelo.xml');
    // duas tabelas do documento viram campos de tabela no formulário
    expect(Object.keys(jsonInicial)).toHaveLength(2);
  });

  it('respeita as regras normativas no documento inteiro', () => {
    // REGRA 1 e REGRA DE OURO (AGENTS.md)
    expect(xml).not.toMatch(/<p\s[^>]*>/);
    expect(xml).not.toMatch(/<secao[^>]*numero=/);
  });

  it('emite os títulos em caixa alta, como no Word', () => {
    const titulos = [...xml.matchAll(/<secao titulo="([^"]*)"/g)].map(m => m[1]);

    expect(titulos).toHaveLength(23);
    expect(titulos.every(t => t === t.toUpperCase())).toBe(true);
  });

  it('gera XML que o parser do app aceita', () => {
    const doc = parseXmlDocument(xml);

    expect(doc.documentElement.tagName.toLowerCase()).toBe('documento');
    expect(doc.querySelectorAll('secao').length).toBe(158);
  });

  it('rejeita arquivo que não é um docx válido', async () => {
    const file = new File([Buffer.from('isto não é um zip')], 'quebrado.docx');

    await expect(converterDocxParaModeloXml(file)).rejects.toThrow(
      'Formato DOCX inválido ou arquivo corrompido.'
    );
  });
});
