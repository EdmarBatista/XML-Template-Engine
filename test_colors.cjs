const fs = require('fs');
const xmldom = require('jsdom');
const AdmZip = require('jszip');

async function run() {
  const data = fs.readFileSync('/app/applet/modelo-de-termo-de-referencia-servicos-e-obras-lei-no-14-133-mai-26.docx');
  const zip = await AdmZip.loadAsync(data);
  const stylesXml = await zip.file('word/styles.xml').async('string');
  const dom = new xmldom.JSDOM(stylesXml, { contentType: 'text/xml' });
  const styles = dom.window.document.getElementsByTagName('w:style');
  for (let i=0; i<styles.length; i++) {
    const s = styles[i];
    const id = s.getAttribute('w:styleId');
    const colorNode = s.getElementsByTagName('w:color')[0];
    if (colorNode) {
      const val = colorNode.getAttribute('w:val');
      console.log(`Style ${id}: color=${val}`);
    }
  }
}
run();
