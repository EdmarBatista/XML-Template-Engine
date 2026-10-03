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

  // BUG CONHECIDO: a regex de campos põe a forma <tag .../> como primeira alternativa, então
  // o corpo entre <tabela> e </tabela> nunca é capturado (a variável corpoTag fica sempre
  // vazia) e nenhuma coluna é lida. O it.fails guarda o comportamento pretendido: quando o
  // bug for corrigido ele fica vermelho e deve virar teste normal.
  it.fails('lê as colunas da tabela por id, por rótulo normalizado e por conteúdo', () => {
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

  it('hoje devolve colunas vazias, porque o corpo da <tabela> não é capturado', () => {
    const umaColuna = extrairCamposDeclarados('<tabela id="itens"><coluna id="desc" /></tabela>');
    expect(umaColuna[0]).toEqual({
      id: 'itens',
      tag: 'tabela',
      label: 'itens',
      tipo: undefined,
      colunas: [],
    });

    const repetida = extrairCamposDeclarados(
      '<tabela id="itens"><coluna id="desc" /><coluna id="desc" label="Repetida" /></tabela>'
    );
    expect(repetida[0].colunas).toEqual([]);
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

  // Mesma causa do BUG das colunas: sem colunas lidas, a checagem de coluna inexistente
  // nunca dispara. O it.fails documenta o comportamento pretendido.
  it.fails('avisa quando a coluna não existe na tabela declarada', () => {
    const xml = `<documento>
      <formulario><tabela id="itens"><coluna id="desc" /></tabela></formulario>
      <conteudo><p>{{itens.qtd}}</p></conteudo>
    </documento>`;
    expect(verificarVariaveisXml(xml).usadasNaoDeclaradas).toEqual(['itens.qtd']);
  });

  it('hoje não emite aviso nenhum para coluna de tabela', () => {
    const xml = `<documento>
      <formulario><tabela id="itens"><coluna id="desc" /></tabela></formulario>
      <conteudo><p>{{itens.qtd}}</p></conteudo>
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
