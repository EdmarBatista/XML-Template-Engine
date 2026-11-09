// @vitest-environment jsdom
// O parser de XML do app depende de DOMParser (e do parser HTML tolerante como
// auto-cura), então este arquivo roda em jsdom — o vitest.config.ts global usa node.

import { describe, expect, it } from 'vitest';
import {
  concatenarXmlsParticionados,
  construirEstadoInicial,
  extrairCampos,
  extrairIndiceParteXml,
  parseXmlDocument,
  sanitizarXmlParaParser,
} from './xmlParser';
import { extrairCamposDeclarados } from './xmlEditorCompletions';
import type { FieldMetadata } from '../types';

describe('sanitizarXmlParaParser — regras de limpeza antes de parsear', () => {
  it('remove a declaração <?xml ... ?>', () => {
    expect(sanitizarXmlParaParser('<?xml version="1.0" encoding="UTF-8"?>\n<documento></documento>')).toBe(
      '<documento></documento>'
    );
  });

  it('converte entidades HTML conhecidas', () => {
    expect(sanitizarXmlParaParser('a&nbsp;b&mdash;c&hellip;')).toBe('a&#160;b—c…');
  });

  it('escapa o & solto sem mexer em entidades válidas', () => {
    const saida = sanitizarXmlParaParser('<p>R&D &amp; &lt; &gt; &quot;</p>');
    expect(saida).toContain('R&amp;D');
    expect(saida).toContain('&amp;');
    expect(saida).toContain('&lt;');
    expect(saida).toContain('&gt;');
    expect(saida).toContain('&quot;');
    expect(saida).not.toContain('R&D');
  });

  it('escapa < e > dentro de expr= para não quebrar o atributo', () => {
    expect(sanitizarXmlParaParser('<if expr="a < b & c">x</if>')).toContain('expr="a &lt; b &amp; c"');
  });

  it('preserva entidades que já estão em expr=', () => {
    expect(sanitizarXmlParaParser('<if expr="a &lt; b">x</if>')).toContain('expr="a &lt; b"');
  });

  it('fecha tags de campo que vieram self-closing', () => {
    // Sem isso, o parser HTML de fallback trataria <coluna .../> como container aberto
    // e engoliria as colunas seguintes como filhas.
    const saida = sanitizarXmlParaParser('<coluna id="a" /><coluna id="b" />');
    expect(saida).not.toContain('/>');
    expect((saida.match(/<coluna /g) || []).length).toBe(2);
    expect((saida.match(/<\/coluna>/g) || []).length).toBe(2);
  });

  it('separa tags self-closing adjacentes com quebra de linha', () => {
    expect(sanitizarXmlParaParser('<br/><br/>')).toBe('<br/>\n<br/>');
  });

  it('remove espaços das pontas', () => {
    expect(sanitizarXmlParaParser('   <documento></documento>   ')).toBe('<documento></documento>');
  });
});

describe('parseXmlDocument — recomposição da raiz <documento>', () => {
  it('inicializa um documento vazio quando a entrada é vazia', () => {
    const doc = parseXmlDocument('');
    expect(doc.documentElement.tagName.toLowerCase()).toBe('documento');
    expect(doc.querySelector('conteudo')).toBeNull();
  });

  it('mantém um documento já completo', () => {
    const doc = parseXmlDocument('<documento><formulario></formulario><conteudo><p>Oi</p></conteudo></documento>');
    expect(doc.querySelector('formulario')).not.toBeNull();
    expect(doc.querySelector('conteudo')?.textContent).toBe('Oi');
  });

  it('embrulha conteúdo solto em <conteudo>', () => {
    const doc = parseXmlDocument('<p>Oi</p>');
    expect(doc.documentElement.tagName.toLowerCase()).toBe('documento');
    expect(doc.querySelector('conteudo > p')?.textContent).toBe('Oi');
  });

  it('embrulha formulário e conteúdo soltos sem criar <conteudo> extra', () => {
    const doc = parseXmlDocument('<formulario><input id="a"></input></formulario><conteudo><p>x</p></conteudo>');
    expect(doc.querySelector('formulario')).not.toBeNull();
    expect(doc.querySelector('conteudo')?.textContent).toBe('x');
    expect(doc.querySelectorAll('conteudo').length).toBe(1);
  });

  it('funde vários blocos <documento> colados em um só', () => {
    const doc = parseXmlDocument(
      '<documento><conteudo><p>parte um</p></conteudo></documento>' +
        '<documento><conteudo><p>parte dois</p></conteudo></documento>'
    );
    expect(doc.querySelectorAll('documento').length).toBe(1);
    const conteudo = doc.querySelector('conteudo')?.textContent || '';
    expect(conteudo).toContain('parte um');
    expect(conteudo).toContain('parte dois');
  });

  it('recolhe conteúdo que ficou depois do </documento>', () => {
    const doc = parseXmlDocument('<documento><conteudo><p>dentro</p></conteudo></documento><p>fora</p>');
    expect(doc.querySelectorAll('documento').length).toBe(1);
    expect(doc.documentElement.textContent).toContain('dentro');
    expect(doc.documentElement.textContent).toContain('fora');
    // O texto solto entra depois do </conteudo>, como filho direto de <documento>.
    expect(doc.querySelector('documento > p')?.textContent).toBe('fora');
  });

  it('preserva as variáveis {{ }} do template', () => {
    const doc = parseXmlDocument('<documento><conteudo><p>{{ nome }}</p></conteudo></documento>');
    expect(doc.querySelector('conteudo')?.textContent).toBe('{{ nome }}');
  });
});

describe('parseXmlDocument — auto-cura de XML malformado', () => {
  it('fecha tag inline aberta por meio do parser HTML tolerante', () => {
    const doc = parseXmlDocument('<p>texto <i>aberto</p>');
    expect(doc.documentElement.tagName.toLowerCase()).toBe('documento');
    expect(doc.querySelector('i')).not.toBeNull();
    expect(doc.querySelector('p')?.textContent).toBe('texto aberto');
  });

  it('não perde o conteúdo ao curar', () => {
    const doc = parseXmlDocument('<conteudo><p>linha &amp; outra</p>');
    expect(doc.querySelector('p')?.textContent).toBe('linha & outra');
  });
});

describe('construirEstadoInicial — valores iniciais por tipo de campo', () => {
  const campos: Record<string, FieldMetadata> = {
    obs: { id: 'obs', label: 'Obs', tipo: 'textarea' },
    qtd: { id: 'qtd', label: 'Qtd', tipo: 'number' },
    ok: { id: 'ok', label: 'Ok', tipo: 'checkbox' },
    data: { id: 'data', label: 'Data', tipo: 'date' },
    itens: {
      id: 'itens',
      label: 'Itens',
      tipo: 'tabela',
      colunas: [
        { id: 'desc', label: 'Descrição' },
        { id: 'valor', label: 'Valor' },
      ],
    },
  };

  it('usa false para checkbox, vazio para os demais e uma linha vazia para tabela', () => {
    expect(construirEstadoInicial(campos)).toEqual({
      obs: '',
      qtd: '',
      ok: false,
      data: '',
      itens: [{ desc: '', valor: '' }],
    });
  });

  it('devolve objeto vazio quando não há campos', () => {
    expect(construirEstadoInicial({})).toEqual({});
  });
});

describe('extrairIndiceParteXml — nome de arquivo particionado [XX]', () => {
  it('reconhece a partição no fim do nome', () => {
    expect(extrairIndiceParteXml('Contrato [01].xml')).toEqual({ baseNome: 'Contrato', indice: 1, isPart: true });
    expect(extrairIndiceParteXml('Documento [2]')).toEqual({ baseNome: 'Documento', indice: 2, isPart: true });
    expect(extrairIndiceParteXml('Exemplo [10].xml')).toEqual({ baseNome: 'Exemplo', indice: 10, isPart: true });
  });

  it('não trata nome comum como parte', () => {
    expect(extrairIndiceParteXml('Modelo.xml')).toEqual({ baseNome: 'Modelo', indice: null, isPart: false });
  });

  it('exige o padrão estritamente no fim, com apenas dígitos', () => {
    expect(extrairIndiceParteXml('[01] Contrato.xml').isPart).toBe(false);
    expect(extrairIndiceParteXml('[Parte 1].xml').isPart).toBe(false);
  });
});

describe('concatenarXmlsParticionados — junção das partes em um documento', () => {
  const parte = (texto: string) =>
    `<documento><formulario><grupo titulo="${texto}"></grupo></formulario><conteudo><p>${texto}</p></conteudo></documento>`;

  it('devolve string vazia sem partes', () => {
    expect(concatenarXmlsParticionados([])).toBe('');
  });

  it('devolve a própria string quando há uma parte só', () => {
    const unico = parte('única');
    expect(concatenarXmlsParticionados([{ nome: 'a.xml', xml: unico }])).toBe(unico);
  });

  it('funde formulário e conteúdo das partes, em ordem de índice', () => {
    const saida = concatenarXmlsParticionados([
      { nome: 'doc [02].xml', xml: parte('segunda'), index: 2 },
      { nome: 'doc [01].xml', xml: parte('primeira'), index: 1 },
    ]);
    expect((saida.match(/<documento/g) || []).length).toBe(1);
    expect((saida.match(/<conteudo/g) || []).length).toBe(1);
    expect(saida).toContain('primeira');
    expect(saida).toContain('segunda');
    expect(saida.indexOf('primeira')).toBeLessThan(saida.indexOf('segunda'));
    expect(() => parseXmlDocument(saida)).not.toThrow();
  });
});

describe('extrairCampos — o <formulario> vira estrutura de campos e grupos', () => {
  const modeloDe = (formulario: string) => {
    const doc = parseXmlDocument(
      `<documento><formulario>${formulario}</formulario><conteudo><p>x</p></conteudo></documento>`
    );
    return extrairCampos(doc.querySelector('formulario')!);
  };

  it('lê rótulo, descrição, placeholder e tipo do campo', () => {
    const { campos } = modeloDe(
      '<input id="nome" label="Nome" descricao="Como no RG" placeholder="Digite" tipo="texto" />'
    );
    expect(campos.nome).toMatchObject({
      id: 'nome',
      label: 'Nome',
      tipo: 'input',
      tipoInput: 'texto',
      descricao: 'Como no RG',
      placeholder: 'Digite',
    });
  });

  it('usa o id como rótulo e o padrão do tipo quando faltam atributos', () => {
    const { campos } = modeloDe('<number id="valor" />');
    expect(campos.valor.label).toBe('valor');
    expect(campos.valor.tipo).toBe('number');
    expect(campos.valor.tipoInput).toBe('number');
  });

  it('lê min/max/step do number e aplica 4 linhas ao textarea', () => {
    const { campos } = modeloDe('<number id="v" min="1" max="10" step="0.5" /><textarea id="t" />');
    expect(campos.v).toMatchObject({ min: '1', max: '10', step: '0.5' });
    expect(campos.t.rows).toBe(4);
  });

  it('lê as opções do select com texto e valor', () => {
    const { campos } = modeloDe(
      '<select id="uf"><option>SP</option><option valor="rj">Rio</option></select>'
    );
    expect(campos.uf.opcoes).toEqual(['SP', 'Rio']);
    expect(campos.uf.opcoesDetalhadas).toEqual([
      { label: 'SP', valor: 'SP', expr: '' },
      { label: 'Rio', valor: 'rj', expr: '' },
    ]);
  });

  it('marca a opção condicional com a expressão do <if> e registra o controle', () => {
    const { campos } = modeloDe(
      '<select id="tipo"><option>Sempre</option><if expr="urgente == true"><option>Urgente</option><input id="prazo" /></if></select>'
    );
    expect(campos.tipo.opcoes).toEqual(['Sempre', 'Urgente']);
    expect(campos.tipo.opcoesDetalhadas?.find(o => o.label === 'Urgente')?.expr).toBe('urgente == true');
    expect(campos.tipo.controlesCondicionais).toEqual([
      { tipo: 'if', expr: 'urgente == true', itens: [{ tipo: 'campo', id: 'prazo' }] },
    ]);
    // o campo que só aparece na condição guarda a expressão
    expect(campos.prazo.condicao).toBe('urgente == true');
  });

  it('lê as colunas da tabela por id, por rótulo e por conteúdo', () => {
    const { campos } = modeloDe(
      '<tabela id="itens">' +
        '<coluna id="desc" label="Descrição" />' +
        '<coluna label="Valor Unitário" tipo="moeda" />' +
        '<coluna>Valor Total</coluna>' +
        '<coluna tipo="select" opcoes="a, b"><option>c</option></coluna>' +
        '</tabela>'
    );
    const colunas = campos.itens.colunas || [];
    // A 4ª coluna não tem id nem label: o rótulo cai no textContent, que aqui é o
    // texto da <option> — e o id é derivado dele. Por isso 'c' e não 'col_4'.
    expect(colunas.map(c => c.id)).toEqual(['desc', 'valor_unitario', 'valor_total', 'c']);
    expect(colunas[0]).toMatchObject({ id: 'desc', label: 'Descrição', tipo: 'input' });
    expect(colunas[1].tipo).toBe('moeda');
    expect(colunas[3]).toMatchObject({ tipo: 'select', opcoes: ['a', 'b', 'c'] });
  });

  it('agrupa por <grupo> e joga os campos soltos no grupo Geral', () => {
    const { grupos } = modeloDe('<input id="solto" /><grupo titulo="Dados"><input id="a" /><input id="b" /></grupo>');
    expect(grupos.map(g => g.titulo)).toEqual(['Geral', 'Dados']);
    expect(grupos[0].campos).toEqual(['solto']);
    expect(grupos[1].campos).toEqual(['a', 'b']);
  });

  it('achata na lista do grupo os campos que estão dentro de <if>', () => {
    const { grupos } = modeloDe('<grupo titulo="G"><if expr="x == 1"><input id="a" /></if></grupo>');
    expect(grupos[0].campos).toEqual(['a']);
    expect(grupos[0].itens).toEqual([{ tipo: 'if', expr: 'x == 1', itens: [{ tipo: 'campo', id: 'a' }] }]);
  });

  it('ignora tag que não é campo e campo sem id', () => {
    const { campos } = modeloDe('<p>texto</p><input label="sem id" />');
    expect(Object.keys(campos)).toEqual([]);
  });

  it('deriva o mesmo id de coluna que o leitor do editor (mesma regra de colunasTabela)', () => {
    // Os dois leitores de declaração do app precisam concordar: o formulário/render usa
    // extrairCampos (DOM) e o editor usa extrairCamposDeclarados (regex). Antes, o MESMO XML
    // produzia ids diferentes: 'baixoalto' × 'baixo_alto' e 'col_4' × 'coluna_4'.
    const tabelaXml =
      '<tabela id="itens">' +
      '<coluna id="desc" label="Descrição" />' +
      '<coluna tipo="select"><option>Baixo</option><option>Alto</option></coluna>' +
      '<coluna label="Valor Total" />' +
      '<coluna />' +
      '</tabela>';

    const peloFormulario = (modeloDe(tabelaXml).campos.itens.colunas || []).map(c => c.id);
    const peloEditor = extrairCamposDeclarados(tabelaXml)[0].colunas || [];

    expect(peloFormulario).toEqual(['desc', 'baixoalto', 'valor_total', 'col_4']);
    expect(peloEditor).toEqual(peloFormulario);
  });
});
