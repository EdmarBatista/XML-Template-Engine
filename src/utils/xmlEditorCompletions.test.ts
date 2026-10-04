import { describe, expect, it } from 'vitest';
import { extrairCamposDeclarados, verificarVariaveisXml } from './xmlEditorCompletions';

describe('extrairCamposDeclarados — leitura do <formulario>', () => {
  it('devolve lista vazia para XML vazio', () => {
    expect(extrairCamposDeclarados('')).toEqual([]);
    expect(extrairCamposDeclarados(undefined as unknown as string)).toEqual([]);
  });

  it('lê id, label e tipo de cada tag de campo', () => {
    const xml = `
      <formulario>
        <input id="nome" label="Nome completo" tipo="texto" />
        <number id="valor" label="Valor" tipo="moeda" />
        <select id="uf" label="UF" />
      </formulario>`;
    expect(extrairCamposDeclarados(xml)).toEqual([
      { id: 'nome', tag: 'input', label: 'Nome completo', tipo: 'texto', colunas: [] },
      { id: 'valor', tag: 'number', label: 'Valor', tipo: 'moeda', colunas: [] },
      { id: 'uf', tag: 'select', label: 'UF', tipo: undefined, colunas: [] },
    ]);
  });

  it('usa o id como label quando não há label', () => {
    const campos = extrairCamposDeclarados('<formulario><input id="obs" /></formulario>');
    expect(campos[0]).toEqual({ id: 'obs', tag: 'input', label: 'obs', tipo: undefined, colunas: [] });
  });

  it('ignora tag de campo sem id', () => {
    const campos = extrairCamposDeclarados('<formulario><input label="Sem id" /><input id="ok" /></formulario>');
    expect(campos.map(c => c.id)).toEqual(['ok']);
  });

  it('lê as colunas da tabela por id, por rótulo normalizado e por conteúdo', () => {
    const xml = `
      <formulario>
        <tabela id="itens" label="Itens">
          <coluna id="desc" label="Descrição" />
          <coluna label="Valor Unitário" />
          <coluna>Valor Total</coluna>
        </tabela>
      </formulario>`;
    expect(extrairCamposDeclarados(xml)[0].colunas).toEqual(['desc', 'valor_unitario', 'valor_total']);
  });

  it('lê as colunas nos dois formatos de tag e não repete id', () => {
    const autoFechadas = extrairCamposDeclarados(
      '<tabela id="itens"><coluna id="desc" /><coluna label="Valor Unitário" /></tabela>'
    );
    expect(autoFechadas[0].colunas).toEqual(['desc', 'valor_unitario']);

    const pareadas = extrairCamposDeclarados(
      '<tabela id="itens"><coluna>Valor Total</coluna><coluna id="desc" /></tabela>'
    );
    expect(pareadas[0].colunas).toEqual(['valor_total', 'desc']);

    const repetidas = extrairCamposDeclarados(
      '<tabela id="itens"><coluna id="desc" /><coluna id="desc" label="Repetida" /></tabela>'
    );
    expect(repetidas[0].colunas).toEqual(['desc']);
  });

  it('não atribui a uma tabela o corpo da tabela seguinte', () => {
    const xml = `<formulario>
      <tabela id="primeira"><coluna id="a" /></tabela>
      <tabela id="segunda"><coluna id="b" /></tabela>
    </formulario>`;

    expect(extrairCamposDeclarados(xml).map(c => [c.id, c.colunas])).toEqual([
      ['primeira', ['a']],
      ['segunda', ['b']],
    ]);
  });

  it('não lê colunas de tabela que veio self-closing', () => {
    expect(extrairCamposDeclarados('<tabela id="vazia" />')[0]).toEqual({
      id: 'vazia',
      tag: 'tabela',
      label: 'vazia',
      tipo: undefined,
      colunas: [],
    });
  });

  it('tira as tags do conteúdo ao derivar o rótulo e o id da coluna', () => {
    const xml =
      '<tabela id="itens"><coluna tipo="select"><option>Baixo</option><option>Alto</option></coluna></tabela>';

    expect(extrairCamposDeclarados(xml)[0].colunas).toEqual(['baixo_alto']);
  });
});

describe('verificarVariaveisXml — variável usada e não declarada', () => {
  it('devolve tudo vazio para XML vazio', () => {
    expect(verificarVariaveisXml('')).toEqual({ usadasNaoDeclaradas: [], declaradasNaoUsadas: [] });
  });

  it('não avisa quando a variável está declarada e é usada', () => {
    const xml = `<documento>
      <formulario><input id="nome" label="Nome" /></formulario>
      <conteudo><p>Olá, {{nome}}.</p></conteudo>
    </documento>`;
    expect(verificarVariaveisXml(xml)).toEqual({ usadasNaoDeclaradas: [], declaradasNaoUsadas: [] });
  });

  it('aponta a usada sem declaração e a declarada sem uso', () => {
    const xml = `<documento>
      <formulario><input id="obs" label="Observação" /></formulario>
      <conteudo><p>Total: {{total}}</p></conteudo>
    </documento>`;
    const r = verificarVariaveisXml(xml);
    expect(r.usadasNaoDeclaradas).toEqual(['total']);
    expect(r.declaradasNaoUsadas).toEqual(['obs']);
  });

  it('ignora o filtro depois do pipe e o índice do acesso', () => {
    const xml = `<documento>
      <formulario><input id="valor" label="Valor" /></formulario>
      <conteudo><p>{{valor | moeda}} e {{valor | moedaPorExtenso}}</p></conteudo>
    </documento>`;
    expect(verificarVariaveisXml(xml).usadasNaoDeclaradas).toEqual([]);
  });

  it('ignora a variável de iteração do foreach', () => {
    const xml = `<documento>
      <formulario><tabela id="itens"><coluna id="nome" /></tabela></formulario>
      <conteudo>
        <foreach lista="itens" var="item"><p>{{item.nome}}</p></foreach>
      </conteudo>
    </documento>`;
    expect(verificarVariaveisXml(xml).usadasNaoDeclaradas).toEqual([]);
  });

  it('exige que a própria lista do foreach esteja declarada', () => {
    const xml = `<conteudo>
      <foreach lista="faltante" var="item"><p>{{item.nome}}</p></foreach>
    </conteudo>`;
    expect(verificarVariaveisXml(xml).usadasNaoDeclaradas).toEqual(['faltante']);
  });

  it('avisa quando a coluna não existe na tabela declarada', () => {
    const xml = `<documento>
      <formulario><tabela id="itens"><coluna id="desc" /></tabela></formulario>
      <conteudo><p>{{itens.qtd}}</p></conteudo>
    </documento>`;
    expect(verificarVariaveisXml(xml).usadasNaoDeclaradas).toEqual(['itens.qtd']);
  });

  it('não avisa quando a coluna existe na tabela declarada', () => {
    const xml = `<documento>
      <formulario><tabela id="itens"><coluna id="desc" label="Descrição" /></tabela></formulario>
      <conteudo><p>{{itens.desc}}</p></conteudo>
    </documento>`;
    expect(verificarVariaveisXml(xml).usadasNaoDeclaradas).toEqual([]);
  });

  it('não avisa para as chaves de índice do loop dentro da tabela', () => {
    const xml = `<documento>
      <formulario><tabela id="itens"><coluna id="desc" /></tabela></formulario>
      <conteudo><p>{{itens._indice}} - {{itens.desc}}</p></conteudo>
    </documento>`;
    expect(verificarVariaveisXml(xml).usadasNaoDeclaradas).toEqual([]);
  });

  it('não avisa para as variáveis reservadas das expressões', () => {
    const xml = `<conteudo><p>{{_index}} {{true}} {{null}}</p></conteudo>`;
    expect(verificarVariaveisXml(xml).usadasNaoDeclaradas).toEqual([]);
  });

  it('lê as variáveis das expressões de <if>', () => {
    const xml = `<documento>
      <formulario><input id="valor" label="Valor" /></formulario>
      <conteudo><if expr="valor > 10 && outro == 1"><p>ok</p></if></conteudo>
    </documento>`;
    // 'valor' está declarado; só 'outro' deve aparecer
    expect(verificarVariaveisXml(xml).usadasNaoDeclaradas).toEqual(['outro']);
  });
});
