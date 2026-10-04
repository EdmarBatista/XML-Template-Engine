/**
 * ============================================================================
 * conferir_exportacoes — paridade entre a coluna direita e as três pontas
 * ============================================================================
 *
 * A bancada do `gerar.js` cobre apenas: DOCX -> output.xml (pela API do conversor)
 * -> upload do XML no app -> coluna direita extraída. Ela NÃO cobre:
 *
 *   1. Word ARRASTADO  — o caminho real do usuário (drop do .docx no app, que
 *                        converte no navegador e passa pela modal de confirmação);
 *   2. Word GERADO     — o .docx exportado pelo botão de exportação;
 *   3. PDF GERADO      — o .pdf exportado pelo botão de exportação.
 *
 * Este script exercita as três na MESMA sessão do navegador e compara com a
 * coluna direita de referência (output.xml + output_json.json, ou seja, o
 * caminho já validado pelo gerar.js e com os mesmos dados do documento):
 *
 *   (a) a sequência de números (1., 1.1., 1.1.1., ...) na ordem;
 *   (b) o texto associado a cada número.
 *
 * Como comparar:
 *   - na TELA, cada número é lido do próprio span `data-word-num` (nada de
 *     adivinhar número por texto — célula de tabela começando com "1" não entra);
 *   - no WORD exportado, o número é numeração NATIVA do Word (w:numPr) e é
 *     reconstruído com o motor do próprio projeto (`src/docx/numbering.ts`);
 *   - no PDF, o número é texto literal (vem do span da tela) e as linhas são
 *     remontadas agrupando os itens do pdfjs por coordenada y.
 *   - Whitespace NÃO é comparado (a tela usa margem CSS onde o PDF usa espaço):
 *     o texto é comparado sem espaços, para não gerar falso positivo de
 *     formatação. Diferenças de conteúdo e de numeração aparecem.
 *
 * Nada é gravado na pasta teste/ (os downloads vão para uma pasta temporária),
 * então as baselines versionadas permanecem intactas.
 *
 * Uso (a aplicação precisa estar rodando, como no `gerar.js`):
 *   npm run dev
 *   npx tsx teste/conferir_exportacoes.js
 *
 * Porta/URL configurável por APP_URL (padrão http://localhost:3000).
 * Sai com código 1 quando alguma numeração divergir.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import JSZip from 'jszip';
import { JSDOM } from 'jsdom';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

import { parseNumbering, computeNextNumber } from '../src/docx/numbering.ts';

// O parseNumbering lê word/numbering.xml com DOMParser.
const dom = new JSDOM();
global.DOMParser = dom.window.DOMParser;
global.XMLSerializer = dom.window.XMLSerializer;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
/** Mesmo DOCX de referência usado pelo gerar.js. */
const DOCX_ORIGEM = path.resolve(
  __dirname,
  '../modelo-de-termo-de-referencia-servicos-e-obras-lei-no-14-133-mai-26.docx'
);
/** Modelo e dados do caminho já validado (as baselines versionadas). */
const XML_REFERENCIA = path.join(__dirname, 'output.xml');
const JSON_REFERENCIA = path.join(__dirname, 'output_json.json');
/** Downloads das exportações: fora do repositório. */
const PASTA_DOWNLOADS = path.join(os.tmpdir(), 'edm-conferencia-exportacoes');

const TEXTO_MINIMO = 15; // ignora linhas que são só um número

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Normalização e comparação
// ---------------------------------------------------------------------------

/** Normaliza texto entre fontes diferentes. Sem espaços: layout não é conteúdo. */
function semEspacos(texto) {
  return String(texto ?? '')
    .replace(/\u00a0/g, '')
    .normalize('NFC')
    .replace(/\ufb01/g, 'fi') // ligaduras que a extração do PDF pode devolver
    .replace(/\ufb02/g, 'fl')
    .replace(/\s+/g, '');
}

const TAMANHO_DA_CHAVE = 80;

function chaveDeTexto(texto) {
  return semEspacos(texto).slice(0, TAMANHO_DA_CHAVE);
}

/**
 * O PDF quebra parágrafos em linhas visuais, então o texto extraído do PDF pode ser
 * apenas o começo do parágrafo da tela. Comparar por prefixo (nunca por igualdade
 * crua) evita acusar divergência onde só há quebra de linha.
 */
function textoCompativel(referencia, candidato) {
  const r = semEspacos(referencia);
  const c = semEspacos(candidato);
  if (!c || !r) return false;
  if (r === c) return true;
  const prova = Math.min(c.length, r.length, 40);
  return prova >= 20 && r.startsWith(c.slice(0, prova));
}

/** Só conteúdo de fato idêntico (sem quebra de linha no caminho). */
function textoIdentico(referencia, candidato) {
  return semEspacos(referencia) === semEspacos(candidato);
}

/** "1.1." e "1.1" são o mesmo número. */
function numeroLimpo(numero) {
  return String(numero ?? '').replace(/\.$/, '').trim();
}

/**
 * Concilia referência e candidato números a números, na ordem:
 * cada número da referência procura o próximo número igual no candidato.
 * Devolve os pares encontrados, o que faltou e o que sobrou no candidato.
 */
function conciliar(referencia, candidatos) {
  const pareados = [];
  const faltando = [];
  let posicao = 0;

  for (const ref of referencia) {
    let achou = -1;
    for (let i = posicao; i < candidatos.length; i++) {
      if (numeroLimpo(candidatos[i].numero) === numeroLimpo(ref.numero)) {
        achou = i;
        break;
      }
    }
    if (achou === -1) {
      faltando.push(ref);
      continue;
    }
    pareados.push({ ref, cand: candidatos[achou] });
    posicao = achou + 1;
  }

  const usados = new Set(pareados.map(p => candidatos.indexOf(p.cand)));
  const sobrando = candidatos.filter((_, i) => !usados.has(i));
  return { pareados, faltando, sobrando };
}

// ---------------------------------------------------------------------------
// Extração: tela (DOM), Word exportado e PDF exportado
// ---------------------------------------------------------------------------

/**
 * Números e textos da coluna direita, lidos dos spans `data-word-num` que o
 * renderizador publica (parágrafos numerados, títulos de seção e os números
 * extras de variável multilinha).
 */
async function lerNumeradosDaTela(page) {
  return page.evaluate(tamanhoMinimo => {
    const raiz = document.getElementById('documento-visualizado');
    if (!raiz) return [];

    const textoDepoisDoNumero = span => {
      const container = span.parentElement;
      const andador = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      let comecou = false;
      let texto = '';
      while (andador.nextNode()) {
        const no = andador.currentNode;
        if (!comecou) {
          if (span.contains(no)) comecou = true;
          continue;
        }
        const outroNumero = no.parentElement?.closest('[data-word-num]');
        if (outroNumero && outroNumero !== span) break;
        texto += no.nodeValue || '';
      }
      return texto.trim();
    };

    const itens = [];
    for (const span of Array.from(raiz.querySelectorAll('[data-word-num]'))) {
      const numero = (span.textContent || '').trim();
      const texto = textoDepoisDoNumero(span);
      if (!numero || texto.length < tamanhoMinimo) continue;
      itens.push({ numero, texto });
    }
    return itens;
  }, TEXTO_MINIMO);
}

/**
 * Word exportado: o número é numeração nativa (w:numPr), então é reconstruído
 * com o motor do projeto, na ordem de leitura. Quando a numeração não é nativa
 * (numeração desligada ou elemento não numerado), o número, se houver, está no
 * próprio texto.
 */
async function lerNumeradosDoWord(caminhoDocx) {
  const zip = await JSZip.loadAsync(fs.readFileSync(caminhoDocx));
  const mapaNumeracao = await parseNumbering(zip);
  const documentXml = await zip.file('word/document.xml').async('text');

  const doc = new dom.window.DOMParser().parseFromString(documentXml, 'application/xml');
  const corpo = doc.getElementsByTagName('w:body')[0];
  const itens = [];
  const todosOsTextos = [];
  const avisos = [];

  const textoDe = paragrafo =>
    Array.from(paragrafo.getElementsByTagName('w:t'))
      .map(t => t.textContent || '')
      .join('');

  for (const no of Array.from(corpo.children)) {
    // Só parágrafos de primeiro nível: tabelas e seus parágrafos internos ficam fora,
    // porque célula de tabela não é parágrafo numerado.
    if (no.tagName !== 'w:p' || no.getElementsByTagName('w:tbl').length > 0) continue;

    const bruto = textoDe(no);
    if (!bruto.trim()) continue;
    todosOsTextos.push(bruto);

    const numPr = no.getElementsByTagName('w:numPr')[0];
    let numero = null;

    if (numPr) {
      const numId = numPr.getElementsByTagName('w:numId')[0]?.getAttribute('w:val') ?? '';
      const ilvl = numPr.getElementsByTagName('w:ilvl')[0]?.getAttribute('w:val') ?? '0';
      const formato = mapaNumeracao.get(numId)?.levels?.[ilvl]?.numFmt;
      // Lista com marcador (bullet) não entra na conferência da numeração decimal.
      if (numId && numId !== '0' && formato === 'decimal') {
        try {
          numero = numeroLimpo(computeNextNumber(mapaNumeracao, numId, ilvl));
        } catch (erro) {
          avisos.push(`numId=${numId} ilvl=${ilvl}: ${erro.message}`);
        }
      }
    }

    let texto = bruto;
    if (numero === null) {
      const m = semEspacos(bruto).match(/^(\d+(?:\.\d+)*)\.?(.*)$/);
      if (!m || !m[2]) continue;
      numero = numeroLimpo(m[1]);
      texto = m[2];
    }

    if (texto.trim().length < TEXTO_MINIMO) continue;
    itens.push({ numero, texto: texto.trim() });
  }

  if (avisos.length > 0) console.log(`  (avisos lendo a numeração: ${avisos.slice(0, 3).join('; ')})`);
  return { itens, textoCompleto: todosOsTextos.join('\n') };
}

/** PDF exportado: o número é texto literal; as linhas saem agrupadas por y. */
async function lerNumeradosDoPdf(caminhoPdf) {
  const dados = new Uint8Array(fs.readFileSync(caminhoPdf));
  const documento = await pdfjs.getDocument({ data: dados, useSystemFonts: false }).promise;
  const linhas = [];

  for (let p = 1; p <= documento.numPages; p++) {
    const pagina = await documento.getPage(p);
    const conteudo = await pagina.getTextContent();
    const TOLERANCIA_Y = 3.5; // meia altura de linha (10pt x 1.35)

    const grupos = [];
    for (const item of conteudo.items) {
      if (!item.str || !item.str.trim()) continue;
      const x = item.transform[4];
      const y = item.transform[5];
      let grupo = grupos.find(g => Math.abs(g.y - y) <= TOLERANCIA_Y);
      if (!grupo) {
        grupo = { y, itens: [] };
        grupos.push(grupo);
      }
      grupo.itens.push({ x, texto: item.str });
    }

    grupos.sort((a, b) => b.y - a.y);
    for (const grupo of grupos) {
      grupo.itens.sort((a, b) => a.x - b.x);
      const linha = grupo.itens.map(i => i.texto).join(' ').trim();
      if (!linha) continue;
      if (/^\d+\s*\/\s*\d+$/.test(linha)) continue; // rodapé "(página / total)"
      linhas.push(linha);
    }
  }

  const itens = [];
  for (const linha of linhas) {
    const m = linha.match(/^(\d+(?:\.\d+)*)\.?\s+(.*)$/);
    if (!m || !m[2] || m[2].trim().length < TEXTO_MINIMO) continue;
    itens.push({ numero: numeroLimpo(m[1]), texto: m[2].trim() });
  }
  return { itens, textoCompleto: linhas.join('\n') };
}

// ---------------------------------------------------------------------------
// Fases
// ---------------------------------------------------------------------------

async function prepararPagina(navegador, pastaDownloads) {
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 1600, height: 1000 });
  const cliente = await pagina.target().createCDPSession();
  await cliente.send('Browser.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: pastaDownloads,
    eventsEnabled: true,
  });
  await pagina.goto(APP_URL, { waitUntil: 'networkidle2' });
  await pagina.waitForSelector('input[type="file"]', { timeout: 30000 });
  return pagina;
}

async function esperarRender(pagina, timeout = 90000) {
  await pagina.waitForFunction(
    () => document.body.innerText.includes('CONDIÇÕES GERAIS DA CONTRATAÇÃO'),
    { timeout }
  );
  await sleep(2500); // deixa as numerações dinâmicas assentarem
}

async function carregarModeloEDados(pagina) {
  const entrada = await pagina.$('input[type="file"]');
  await entrada.uploadFile(XML_REFERENCIA);
  await esperarRender(pagina);
  await entrada.uploadFile(JSON_REFERENCIA);
  await sleep(2000);
}

/** Dispara um botão pelo title (ignora sobreposição de modal). */
async function clicarBotao(pagina, title) {
  return pagina.evaluate(t => {
    const botao = document.querySelector(`button[title="${t}"]`);
    if (!botao) return false;
    botao.click();
    return true;
  }, title);
}

async function esperarDownload(pasta, extensao, timeoutMs = 180000) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    const arquivos = fs.readdirSync(pasta).filter(f => f.endsWith(extensao) && !f.endsWith('.crdownload'));
    if (arquivos.length > 0) {
      const caminho = path.join(pasta, arquivos[0]);
      let anterior = -1;
      while (fs.statSync(caminho).size !== anterior) {
        anterior = fs.statSync(caminho).size;
        await sleep(400);
      }
      return caminho;
    }
    await sleep(300);
  }
  return null;
}

/** Simula o usuário ARRASTANDO o .docx para dentro do app e confirmando a modal. */
async function arrastarWord(pagina, caminhoDocx) {
  const base64 = fs.readFileSync(caminhoDocx).toString('base64');
  await pagina.evaluate(
    (conteudo, nome) => {
      const binario = atob(conteudo);
      const bytes = new Uint8Array(binario.length);
      for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);

      const arquivo = new File([bytes], nome, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const transferencia = new DataTransfer();
      transferencia.items.add(arquivo);

      const alvo = document.querySelector('div.flex.flex-col.h-screen') || document.body;
      for (const tipo of ['dragenter', 'dragover', 'drop']) {
        alvo.dispatchEvent(new DragEvent(tipo, { bubbles: true, cancelable: true, dataTransfer: transferencia }));
      }
    },
    base64,
    path.basename(caminhoDocx)
  );
}

async function confirmarImportacaoWord(pagina) {
  return pagina.evaluate(() => {
    const botao = Array.from(document.querySelectorAll('button')).find(b =>
      (b.textContent || '').includes('Converter para XML')
    );
    if (!botao) return false;
    botao.click();
    return true;
  });
}

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------

function relatar(nome, referencia, candidatos, textoCompleto = null) {
  const { pareados, faltando, sobrando } = conciliar(referencia, candidatos);
  const divergencias = [];
  let compativeis = 0;
  let identicos = 0;

  for (const par of pareados) {
    if (textoCompativel(par.ref.texto, par.cand.texto)) compativeis++;
    if (textoIdentico(par.ref.texto, par.cand.texto)) identicos++;
    else if (!textoCompativel(par.ref.texto, par.cand.texto) && divergencias.length < 5) {
      divergencias.push({ numero: par.ref.numero, referência: par.ref.texto, candidato: par.cand.texto });
    }
  }

  console.log(`\n--- ${nome} ---`);
  console.log(
    `  números: referência=${referencia.length}  candidato=${candidatos.length}  pareados=${pareados.length}  a mais no candidato=${sobrando.length}`
  );
  if (faltando.length === 0) {
    console.log('  numeração: OK (todos os números da referência foram encontrados, na ordem)');
  } else {
    const primeiros = faltando.slice(0, 5).map(f => `"${f.numero}: ${f.texto.slice(0, 40)}..."`);
    console.log(`  numeração: FALTAM ${faltando.length} número(s) da referência, ex.: ${primeiros.join(' | ')}`);
  }
  if (sobrando.length > 0) {
    const exemplos = sobrando.slice(0, 3).map(s => `"${s.numero}: ${s.texto.slice(0, 40)}..."`);
    console.log(`  números a mais no candidato, ex.: ${exemplos.join(' | ')}`);
  }
  console.log(`  texto por número: ${compativeis}/${pareados.length} compatíveis  (${identicos} idênticos, sem quebra de linha)`);
  for (const d of divergencias) {
    console.log(`    · ${d.numero}: referência="${chaveDeTexto(d.referência).slice(0, 60)}"`);
    console.log(`      ${' '.repeat(String(d.numero).length)}  candidato ="${chaveDeTexto(d.candidato).slice(0, 60)}"`);
  }
  if (pareados.length === 0) {
    console.log('  amostra do candidato (os 3 primeiros):');
    for (const c of candidatos.slice(0, 3)) console.log(`    · ${c.numero}: ${c.texto.slice(0, 60)}`);
  }

  // Checagem complementar: começo E fim de cada parágrafo da tela precisam existir no
  // arquivo. Pega texto perdido depois da primeira linha visual.
  if (textoCompleto) {
    const todo = semEspacos(textoCompleto);
    let completos = 0;
    const ausentes = [];
    for (const ref of referencia) {
      const alvo = semEspacos(ref.texto);
      const comeco = alvo.slice(0, 40);
      const fim = alvo.slice(-40);
      const temComeco = todo.includes(comeco);
      const temFim = todo.includes(fim);
      if (temComeco && temFim) completos++;
      else if (ausentes.length < 5) ausentes.push({ numero: ref.numero, temComeco, temFim });
    }
    console.log(`  conteúdo no arquivo (começo e fim de cada parágrafo localizados): ${completos}/${referencia.length}`);
    for (const a of ausentes) {
      console.log(`    · ${a.numero}: começo ${a.temComeco ? 'ok' : 'FALTA'}, fim ${a.temFim ? 'ok' : 'FALTA'}`);
    }
  }

  return {
    faltando: faltando.length,
    compativeis,
    identicos,
    pareados: pareados.length,
    aMais: sobrando.length,
    divergencias: divergencias.length,
  };
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Conferência das três pontas contra a coluna direita ===\n');

  for (const arquivo of [DOCX_ORIGEM, XML_REFERENCIA, JSON_REFERENCIA]) {
    if (!fs.existsSync(arquivo)) {
      console.error(`Arquivo necessário não encontrado: ${arquivo}`);
      process.exit(2);
    }
  }

  fs.rmSync(PASTA_DOWNLOADS, { recursive: true, force: true });
  fs.mkdirSync(PASTA_DOWNLOADS, { recursive: true });

  const navegador = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const resultados = {};
  let referencia = [];

  try {
    // ----- Coluna direita de referência (caminho XML + JSON, já validado) ---------
    const pagina = await prepararPagina(navegador, PASTA_DOWNLOADS);
    const globais = await pagina.evaluate(() => ({
      pdfMake: typeof window.pdfMake,
      docx: typeof window.docx,
      JSZip: typeof window.JSZip,
    }));
    console.log(`Globais de CDN no navegador: pdfMake=${globais.pdfMake} docx=${globais.docx} JSZip=${globais.JSZip}`);

    console.log('\n0. Carregando o modelo (output.xml) e os dados (output_json.json)...');
    await carregarModeloEDados(pagina);
    referencia = await lerNumeradosDaTela(pagina);
    console.log(`  coluna direita: ${referencia.length} linhas numeradas`);
    console.log(`  ex.: ${referencia.slice(0, 3).map(l => l.numero).join(', ')} ...`);

    // ----- PDF GERADO ------------------------------------------------------------
    console.log('\n1. Exportando o PDF pelo botão da barra de ferramentas...');
    if (!(await clicarBotao(pagina, 'Salvar Documento PDF (.pdf)'))) {
      console.error('  Botão de exportação do PDF não encontrado.');
    }
    const arquivoPdf = await esperarDownload(PASTA_DOWNLOADS, '.pdf');
    if (!arquivoPdf) {
      console.error('  O .pdf exportado não chegou à pasta de downloads.');
    } else {
      console.log(`  baixado: ${path.basename(arquivoPdf)}`);
      const pdf = await lerNumeradosDoPdf(arquivoPdf);
      resultados.pdf = relatar('PDF GERADO × coluna direita', referencia, pdf.itens, pdf.textoCompleto);
    }

    // ----- Word GERADO -----------------------------------------------------------
    console.log('\n2. Exportando o Word pelo botão da barra de ferramentas...');
    if (!(await clicarBotao(pagina, 'Exportar Documento Word (.docx)'))) {
      console.error('  Botão de exportação do Word não encontrado.');
    }
    const arquivoWord = await esperarDownload(PASTA_DOWNLOADS, '.docx');
    if (!arquivoWord) {
      console.error('  O .docx exportado não chegou à pasta de downloads.');
    } else {
      console.log(`  baixado: ${path.basename(arquivoWord)}`);
      const word = await lerNumeradosDoWord(arquivoWord);
      resultados.word = relatar(
        'Word GERADO (numeração nativa reconstruída) × coluna direita',
        referencia,
        word.itens,
        word.textoCompleto
      );
    }
    await pagina.close();

    // ----- Word ARRASTADO (contexto novo, sem estado da sessão anterior) ---------
    console.log('\n3. Arrastando o .docx para o app (caminho do usuário)...');
    const contexto = await navegador.createBrowserContext();
    const paginaArrasto = await contexto.newPage();
    await paginaArrasto.setViewport({ width: 1600, height: 1000 });
    const clienteArrasto = await paginaArrasto.target().createCDPSession();
    await clienteArrasto.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: PASTA_DOWNLOADS });
    await paginaArrasto.goto(APP_URL, { waitUntil: 'networkidle2' });
    await paginaArrasto.waitForSelector('input[type="file"]', { timeout: 30000 });

    await arrastarWord(paginaArrasto, DOCX_ORIGEM);
    await paginaArrasto.waitForFunction(
      () => document.body.innerText.includes('Converter Documento Word?'),
      { timeout: 15000 }
    );
    if (!(await confirmarImportacaoWord(paginaArrasto))) {
      console.error('  Não achei o botão "Converter para XML" na modal de importação.');
    }
    await esperarRender(paginaArrasto);
    resultados.arrastado = relatar('Word ARRASTADO (drop no app) × coluna direita', referencia, await lerNumeradosDaTela(paginaArrasto));
    await contexto.close();
  } finally {
    await navegador.close();
  }

  // ----- Veredito ----------------------------------------------------------------
  console.log('\n=== VEREDITO ===');
  const nomes = [
    ['PDF gerado × coluna direita', resultados.pdf],
    ['Word gerado × coluna direita', resultados.word],
    ['Word arrastado × coluna direita', resultados.arrastado],
  ];

  let problemas = 0;
  for (const [nome, r] of nomes) {
    if (!r) {
      console.log(`  ⚠️  ${nome}: NÃO VERIFICADO (sem artefato)`);
      problemas++;
      continue;
    }
    const ok = r.faltando === 0;
    if (!ok) problemas++;
    console.log(
      `  ${ok ? '✅' : '❌'} ${nome}: numeração ${ok ? 'completa e na mesma ordem' : `${r.faltando} número(s) sem correspondência`}; textos ${r.compativeis}/${r.pareados} compatíveis (${r.identicos} idênticos)`
    );
  }
  console.log(
    `\nDownloads de trabalho em: ${PASTA_DOWNLOADS} (fora do repositório; as baselines de teste/ não foram tocadas)`
  );
  process.exit(problemas === 0 ? 0 : 1);
}

main();
