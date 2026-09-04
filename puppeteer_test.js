import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    const fileInput = await page.$('input[type="file"][accept*=".docx"]');
    const docxPath = path.resolve('modelo-de-termo-de-referencia-servicos-e-obras-lei-no-14-133-mai-26.docx');
    await fileInput.uploadFile(docxPath);
    
    await page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent.includes('Converter para XML'));
    }, { timeout: 10000 });
    
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Converter para XML'));
      if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 6000));
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 1000));
    
    const html = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync('dom_dump.html', html);
    console.log("DOM dumped!");
    
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await browser.close();
  }
})();
