import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

// Setup global DOM for the converter
const dom = new JSDOM();
global.DOMParser = dom.window.DOMParser;
global.XMLSerializer = dom.window.XMLSerializer;

import { converterDocxParaModeloXml } from '../src/docx/converter.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const filePath = path.resolve(__dirname, '../modelo-de-termo-de-referencia-servicos-e-obras-lei-no-14-133-mai-26.docx');
  const buffer = fs.readFileSync(filePath);
  
  console.log("1. Gerando XML via conversor nativo OpenXML (CLI)...");
  try {
    const file = new File([buffer], 'modelo.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const { xml, jsonInicial } = await converterDocxParaModeloXml(file);
    fs.writeFileSync(path.join(__dirname, 'output.xml'), xml);
    if (jsonInicial && Object.keys(jsonInicial).length > 0) {
      fs.writeFileSync(path.join(__dirname, 'output_json.json'), JSON.stringify(jsonInicial, null, 2));
    }
    console.log("-> output.xml gerado com sucesso.");
  } catch(e) {
    console.error("Erro ao gerar XML via conversor:", e);
  }

  console.log("\n2. Iniciando Puppeteer para acessar o frontend e extrair o TXT renderizado...");
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  // Porta/URL configuravel por variavel de ambiente. O padrao e o IPv4 literal
  // (http://127.0.0.1:3000), e nao "localhost": o nome resolve para `::1` antes de
  // `127.0.0.1` (ordem verbatim do Node), enquanto o vite escuta so em IPv4 (0.0.0.0).
  // Com "localhost", outra aplicacao na mesma porta em IPv6 responde no lugar da nossa
  // e o teste fala com o alvo errado. APP_URL sobrescreve quando for preciso.
  const appUrl = process.env.APP_URL || 'http://127.0.0.1:3000';
  console.log(`Acessando aplicação local (${appUrl})...`);

  try {
    await page.goto(appUrl, { waitUntil: 'networkidle2' });
  } catch(e) {
    console.error("Não foi possível acessar a aplicação. O servidor está rodando?");
    await browser.close();
    return;
  }

  console.log("Fazendo upload do arquivo XML no frontend...");
  const xmlPath = path.join(__dirname, 'output.xml');
  // A aplicação é uma SPA React: o input só passa a existir no DOM depois do mount
  // dos componentes (SidebarToolbar). Consultá-lo logo após o goto corria contra o
  // render e falhava de forma intermitente com "Input de upload não encontrado".
  let fileInput = null;
  try {
    await page.waitForSelector('input[type="file"]', { timeout: 30000 });
    fileInput = await page.$('input[type="file"]');
  } catch (e) {
    console.error("Input de upload não apareceu no DOM em 30s:", e && e.message ? e.message : e);
  }
  if (!fileInput) {
    console.error("Input de upload não encontrado na página.");
    await browser.close();
    return;
  }
  
  await fileInput.uploadFile(xmlPath);
  
  console.log("Aguardando a renderização do documento na tela...");
  try {
    await page.waitForFunction(
      () => document.body.innerText.includes("CONDIÇÕES GERAIS DA CONTRATAÇÃO"),
      { timeout: 15000 }
    );
    // Aguarda um pouco mais para garantir que todos os nós e numerações foram calculados
    await new Promise(r => setTimeout(r, 2000));
  } catch(e) {
    console.error("Timeout aguardando a renderização:", e);
  }
  
  console.log("Extraindo texto renderizado (com as numerações)...");
  const textOutput = await page.evaluate(() => {
    // Busca o contêiner de renderização (modo A4 ou contínuo)
    let container = document.querySelector('.flex-1.overflow-y-auto.select-text') || document.body;
    return container.innerText;
  });

  const htmlOutput = await page.evaluate(() => {
    let container = document.querySelector('.flex-1.overflow-y-auto.select-text') || document.body;
    return container.innerHTML;
  });

  fs.writeFileSync(path.join(__dirname, 'output_puppeteer.txt'), textOutput);
  fs.writeFileSync(path.join(__dirname, 'output_puppeteer.html'), htmlOutput);
  
  console.log("-> output_puppeteer.txt gerado com sucesso.");
  console.log("-> output_puppeteer.html gerado com sucesso.");
  
  await browser.close();
  console.log("\nProcesso concluído! Verifique a pasta 'teste' e compare output_puppeteer.txt com pdf_texto.txt.");
}

main();
