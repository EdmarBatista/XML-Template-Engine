import { JSDOM } from 'jsdom';
import { exportarParaWord } from './src/utils/wordExporter';

const dom = new JSDOM(`
  <div id="documento-visualizado">
    <div data-word-type="secao" data-word-level="0" data-word-numerar="true">
      <h3 data-word-type="secao-titulo">Hello</h3>
      <div data-word-type="secao-conteudo">
        <div data-word-type="paragrafo" data-word-level="0">
          Hello World
        </div>
      </div>
    </div>
  </div>
`);

// Mock browser objects expected by exportarParaWord
global.HTMLElement = dom.window.HTMLElement;
global.URL = {
  createObjectURL: () => 'blob:http://localhost/1234',
  revokeObjectURL: () => {}
} as any;
global.document = dom.window.document;

async function run() {
  try {
    const el = dom.window.document.getElementById('documento-visualizado');
    const blob = await exportarParaWord(el as HTMLElement, 'test.docx', {});
    console.log("Success! Blob size:", blob.size);
  } catch (err) {
    console.error("Error generating docx:", err.message, err.stack);
  }
}

run();
