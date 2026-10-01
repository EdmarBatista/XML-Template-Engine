import fs from 'fs';
import JSZip from 'jszip';

async function zipStandalone() {
  if (fs.existsSync('dist/index.html')) {
    fs.copyFileSync('dist/index.html', 'app_standalone.html');
    const zip = new JSZip();
    const content = fs.readFileSync('app_standalone.html');
    zip.file('app_standalone.html', content);
    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    fs.writeFileSync('app_standalone.zip', buffer);
    console.log('app_standalone.html gerado e compactado em app_standalone.zip com sucesso.');
  }
}

zipStandalone().catch(err => {
  console.error('Erro ao zipar standalone:', err);
  process.exit(1);
});
