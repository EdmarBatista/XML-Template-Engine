import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Contrato `data-word-*` entre o renderizador e os exportadores (B6).
 *
 * Word e PDF não recebem o XML: eles leem o DOM do preview e dependem de atributos
 * publicados pelo renderizador (ver o comentário em wordDom.ts). Se um atributo passa a
 * ser consumido sem produtor, a exportação perde formatação em silêncio — foi o que já
 * aconteceu com `data-word-reiniciar`. Este teste lê o código-fonte dos dois lados e
 * compara: consumidor sem produtor = falha.
 */

const raiz = process.cwd();

const lerArquivo = (relativo: string): string => fs.readFileSync(path.join(raiz, relativo), 'utf8');

const lerPasta = (relativo: string, extensoes: string[]): string => {
  const base = path.join(raiz, relativo);
  return fs
    .readdirSync(base, { recursive: true, encoding: 'utf8' })
    .filter(nome => extensoes.some(ext => nome.endsWith(ext)))
    .map(nome => fs.readFileSync(path.join(base, nome), 'utf8'))
    .join('\n');
};

/** Todas as constantes do contrato: nome -> valor literal do atributo. */
function constantesDoContrato(): Record<string, string> {
  const fonte = lerArquivo('src/utils/wordDom.ts');
  const encontradas: Record<string, string> = {};
  for (const m of fonte.matchAll(/export const (WORD_(?:ATTR|TIPO)_\w+)\s*=\s*'([^']+)'/g)) {
    encontradas[m[1]] = m[2];
  }
  return encontradas;
}

const CONSUMIDORES = [
  'src/utils/wordExporter.ts',
  'src/utils/pdfExporter.ts',
  'src/utils/domDocumentExtractor.ts',
];

const fonteConsumidores = CONSUMIDORES.map(lerArquivo).join('\n');
const fonteRenderizador = lerPasta('src/components', ['.ts', '.tsx']);

const constantes = constantesDoContrato();

const consumidas = Object.keys(constantes).filter(nome => fonteConsumidores.includes(nome));
const semProdutor = consumidas.filter(
  nome => !fonteRenderizador.includes(constantes[nome]) && !fonteRenderizador.includes(nome)
);

/**
 * Órfãos conhecidos: constantes que ninguém publica hoje. Entram na lista de propósito,
 * para que QUALQUER órfão novo (ou a produção de um destes) faça o teste falhar.
 *
 * Os dois abaixo são procurados pelos exportadores (ramos de título/conteúdo de seção) e
 * nunca publicados pelo renderizador — ou seja, hoje são ramos mortos na exportação.
 */
const ORFAOS_CONHECIDOS = [
  'WORD_TIPO_SECAO_CONTEUDO (secao-conteudo)',
  'WORD_TIPO_SECAO_TITULO (secao-titulo)',
];

/** Arquivos que ainda escrevem data-word-* na mão em vez de usar as constantes. */
const LITERAIS_CONHECIDOS = ['src/utils/domDocumentExtractor.ts'];

describe('contrato data-word-* — consumidor x produtor', () => {
  it('encontra as constantes do contrato', () => {
    expect(Object.keys(constantes).length).toBeGreaterThan(10);
    expect(constantes['WORD_ATTR_TIPO']).toBe('data-word-type');
  });

  it('todo atributo lido pelos exportadores tem produtor no renderizador', () => {
    const semProdutorLegivel = semProdutor.map(nome => `${nome} (${constantes[nome]})`);

    expect(semProdutorLegivel).toEqual(ORFAOS_CONHECIDOS);
  });

  it('todos os exportadores compartilham o mesmo contrato, sem strings soltas', () => {
    // Nenhum dos exportadores deve escrever um data-word-* na mão: é o contrato que evita
    // o Word e o PDF divergirem entre si.
    const soltos = CONSUMIDORES.filter(arquivo => /['"]data-word-/.test(lerArquivo(arquivo)));

    expect(soltos).toEqual(LITERAIS_CONHECIDOS);
  });
});
