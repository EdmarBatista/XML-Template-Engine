import fs from 'fs';

const pupText = fs.readFileSync('teste/output_puppeteer.txt', 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
const pdfLines = fs.readFileSync('teste/pdf_texto.txt', 'utf8').split('\n').map(l => l.trim()).filter(Boolean);

// Find lines in pupText that start with a numbering like 1.2., 1.2.3., etc.
const numberedLines = [];
const numRegex = /^(\d+(?:\.\d+)+)\.?(.*)$/;

for (const line of pupText) {
  const match = line.match(numRegex);
  if (match) {
    const num = match[1];
    const text = match[2].trim();
    if (text.length > 25) {
      numberedLines.push({ full: line, num, text });
    }
  }
}

// Select 15 random samples distributed across different portions of the document
const count = 15;
const step = Math.floor(numberedLines.length / count);
const selected = [];

for (let i = 0; i < count; i++) {
  const idx = Math.min(i * step + Math.floor((step / 2)), numberedLines.length - 1);
  selected.push({ index: idx, ...numberedLines[idx] });
}

console.log('\n=== CONFERÊNCIA DETALHADA DAS 15 AMOSTRAS ===\n');

let exactMatches = 0;

for (const item of selected) {
  // Find matching line in pdfLines
  // Search for the line in pdfLines that contains the core snippet of this text
  const cleanSnippet = item.text
    .slice(0, 40)
    .replace(/[^\w\sáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let pdfMatchLine = '';
  let pdfNumberFound = null;

  for (let i = 0; i < pdfLines.length; i++) {
    const pLine = pdfLines[i];
    if (pLine.toLowerCase().includes(cleanSnippet.toLowerCase().slice(0, 20))) {
      // Check if this line or previous line has the number
      const m = pLine.match(/^(\d+(?:\.\d+)+)\.?/);
      if (m) {
        pdfNumberFound = m[1];
        pdfMatchLine = pLine;
        break;
      } else {
        // check previous line
        const prevM = (pdfLines[i - 1] || '').match(/(\d+(?:\.\d+)+)\.?\s*$/);
        if (prevM) {
          pdfNumberFound = prevM[1];
          pdfMatchLine = pdfLines[i - 1] + ' ' + pLine;
          break;
        } else {
          // check if number is anywhere in the line before snippet
          const anyM = pLine.match(/(\d+(?:\.\d+)+)\.?\s+/);
          if (anyM) {
            pdfNumberFound = anyM[1];
            pdfMatchLine = pLine;
            break;
          }
        }
      }
    }
  }

  console.log(`[Amostra ${item.index + 1}]`);
  console.log(`  Texto       : "${item.text.slice(0, 65)}..."`);
  console.log(`  Puppeteer   : ${item.num}`);
  console.log(`  PDF Original: ${pdfNumberFound ? pdfNumberFound : 'Trecho: ' + pdfMatchLine.slice(0, 40)}`);
  
  if (pdfNumberFound === item.num) {
    console.log(`  Status      : ✅ 100% IDÊNTICO\n`);
    exactMatches++;
  } else {
    console.log(`  Status      : ⚠️ Verificar manualmente\n`);
  }
}

console.log(`Resultado final: ${exactMatches} de ${count} confirmados exatamente iguais.`);
