import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import { converterDocxParaModeloXml } from './converted_module.mjs';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
const w = dom.window;
globalThis.window = w;
globalThis.document = w.document;
globalThis.DOMParser = w.DOMParser;
globalThis.Node = w.Node;
globalThis.Element = w.Element;
globalThis.HTMLElement = w.HTMLElement;
globalThis.navigator = w.navigator;

const b = fs.readFileSync('modelo-de-termo-de-referencia-servicos-e-obras-lei-no-14-133-mai-26.docx');
const file = {
  name: 'modelo-de-termo-de-referencia-servicos-e-obras-lei-no-14-133-mai-26.docx',
  arrayBuffer: async () => {
    const ab = new ArrayBuffer(b.byteLength);
    new Uint8Array(ab).set(b);
    return ab;
  },
};

console.log('CONVERTENDO...');
try {
  const { xml } = await converterDocxParaModeloXml(file);
  fs.writeFileSync('tmp_hx/out_convertido.xml', xml, 'utf8');
  console.log('XML bytes:', xml.length);

  const xdoc = new w.DOMParser().parseFromString(xml, 'text/xml');
  const perr = xdoc.querySelector('parsererror');
  if (perr) { console.log('PARSE ERROR:', perr.textContent.slice(0,300)); process.exit(1); }
  const root = xdoc.getElementsByTagName('documento')[0];
  let conteudoEl = null;
  for (const c of Array.from(root.children)) if (c.nodeName.toLowerCase()==='conteudo') conteudoEl = c;
  if (!conteudoEl) { console.log('sem conteudo'); process.exit(1); }

  // Caminhos numerados por hierarquia <secao> (sem texto): irmãos secao com titulo
  const rows = [];
  function walk(el, prefix) {
    let counter = 0;
    for (const ch of Array.from(el.children)) {
      if (ch.nodeName.toLowerCase() !== 'secao') continue;
      counter++;
      const numPath = prefix.length ? prefix + '.' + counter : String(counter);
      const tit = ch.getAttribute('titulo') || '';
      const numerar = ch.getAttribute('numerar') !== 'false';
      rows.push({ num: numPath, tit: tit, numera: numerar, hasTitle: !!tit });
      // filhos
      const sub = Array.from(ch.children).filter(c=>c.nodeName.toLowerCase()==='secao');
      if (sub.length) walk(ch, numPath);
    }
  }
  walk(conteudoEl, '');
  fs.writeFileSync('tmp_hx/out_caminhos.json', JSON.stringify(rows, null, 1), 'utf8');

  // filtrar por trechos-chave
  const achados = rows.filter(r => /FORO|Registros que|Fica definido/i.test(r.tit));
  console.log('ACHEI:', rows.length, 'secoes');
  console.log('-- trechos FORO/Registros --');
  achados.forEach(r => console.log('   ', r.num, '|', (r.tit||'').slice(0,60)));

  // imprime últimos 25
  console.log('-- últimas 25 seções --');
  rows.slice(-25).forEach(r => console.log('   ', r.num.padEnd(8), '|', (r.tit||'').slice(0,50)));
} catch (e) {
  console.error('ERRO:', e && e.stack ? e.stack : e);
  process.exit(1);
}
