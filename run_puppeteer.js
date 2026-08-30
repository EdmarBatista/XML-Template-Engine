import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('dialog', async dialog => {
    console.log('DIALOG:', dialog.message());
    await dialog.accept();
  });
  
  await page.goto('http://localhost:3000');
  
  // wait for app to load
  await page.waitForSelector('button[title*="Word"]', { timeout: 10000 });
  
  // click word export
  console.log("Clicking export word button...");
  const exportBtn = await page.$('button[title*="Word"]');
  if (exportBtn) {
    await exportBtn.click();
    await page.waitForTimeout(2000);
  } else {
    console.log("Button not found");
  }
  
  await browser.close();
})();
