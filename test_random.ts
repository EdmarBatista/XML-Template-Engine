import * as fs from 'fs';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';
import { parseDocument } from './src/docx/document';
import { parseStyles } from './src/docx/styles';

(global as any).DOMParser = new JSDOM().window.DOMParser;

async function run() {
  const data = fs.readFileSync('/app/applet/modelo-de-termo-de-referencia-servicos-e-obras-lei-no-14-133-mai-26.docx');
  const zip = new JSZip();
  await zip.loadAsync(data);
  const stylesMap = await parseStyles(zip);
  
  const ast = await parseDocument(zip, stylesMap, new Map());
  
  const targetTexts = [
    "Contratação de",
    "adjudicatário terá o prazo",
    "O regime de execução",
  ];

  for (const block of ast) {
    if (block.type === 'p' || block.type === 'li' || block.type === 'h') {
      const text = block.runs.map(r => r.text).join('');
      for (const target of targetTexts) {
        if (text.includes(target)) {
          console.log(`\n--- PARÁGRAFO ("${target}") ---`);
          console.log(JSON.stringify(block.runs, null, 2));
          targetTexts.splice(targetTexts.indexOf(target), 1);
          break;
        }
      }
    }
  }
}
run();
