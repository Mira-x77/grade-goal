import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, 'Grade-Goal-App-Overview.html');
const pdfPath = join(__dirname, 'Grade-Goal-App-Overview.pdf');

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, {
  waitUntil: 'networkidle0',
  timeout: 90000,
});
await page.waitForFunction(
  () => document.querySelector('.mermaid svg') || document.querySelectorAll('.mermaid').length === 0,
  { timeout: 45000 }
).catch(() => {});
await new Promise((r) => setTimeout(r, 2500));
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
});
await browser.close();
console.log('PDF:', pdfPath);
