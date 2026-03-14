import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error' && msg.text().includes('React') || msg.text().includes('Uncaught') || msg.text().includes('TypeError')) {
      console.log('CRITICAL REACT LOG ERROR:', msg.text());
    } else if (msg.type() === 'error') {
      console.log('PAGE LOG ERROR:', msg.text());
    }
  });
  page.on('pageerror', err => {
    console.log('PAGE ERROR STR:', err.toString());
  });
  await page.goto('http://localhost:5173/kabile', {waitUntil: 'networkidle2'});
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
