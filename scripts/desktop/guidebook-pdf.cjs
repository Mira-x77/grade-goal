// Renders the GoStudy guidebook HTML to PDF with Chromium's print engine.
//
//   npx electron scripts/desktop/guidebook-pdf.cjs <input.html> <output.pdf>
//   npx electron scripts/desktop/guidebook-pdf.cjs <input.html> --preview <dir>
//
// The preview mode writes one PNG per `.page` section so the layout can be
// checked without opening a PDF viewer.

const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const input = path.resolve(process.argv[2] || 'docs/partnership/guidebook/guidebook.html');
const previewIndex = process.argv.indexOf('--preview');
const previewDir = previewIndex > 0 ? path.resolve(process.argv[previewIndex + 1]) : null;
const output = path.resolve(process.argv[3] && !process.argv[3].startsWith('--')
  ? process.argv[3]
  : 'docs/partnership/guidebook/GoStudy-Guidebook-2026.pdf');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 900,
    height: 1250,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: { offscreen: false },
  });

  await win.loadFile(input);

  // Wait for every screenshot and the mascot to decode before printing.
  await win.webContents.executeJavaScript(`
    Promise.all(Array.from(document.images).map((img) =>
      img.complete ? Promise.resolve() : new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      })
    )).then(() => document.fonts ? document.fonts.ready : true)
  `);

  if (previewDir) {
    fs.mkdirSync(previewDir, { recursive: true });
    const count = await win.webContents.executeJavaScript('document.querySelectorAll(".page").length');
    const report = await win.webContents.executeJavaScript(`
      Array.from(document.querySelectorAll('.page')).map((el, i) => ({
        page: i + 1,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        overflow: el.scrollHeight - el.clientHeight,
      }))
    `);
    console.log(`PAGE_FIT ${JSON.stringify(report.filter((r) => r.overflow > 1))}`);
    for (let i = 0; i < count; i += 1) {
      const block = process.argv.includes('--bottom') ? 'end' : 'start';
      const rect = await win.webContents.executeJavaScript(`
        (() => {
          const el = document.querySelectorAll('.page')[${i}];
          el.scrollIntoView({ block: '${block}' });
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
        })()
      `);
      await new Promise((resolve) => setTimeout(resolve, 350));
      const image = await win.webContents.capturePage(rect);
      const suffix = process.argv.includes('--bottom') ? 'bottom' : 'top';
      fs.writeFileSync(path.join(previewDir, `page-${String(i + 1).padStart(2, '0')}-${suffix}.png`), image.toPNG());
    }
    console.log(`PREVIEW_OK ${count} pages -> ${previewDir}`);
    app.exit(0);
    return;
  }

  const pdf = await win.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    preferCSSPageSize: true,
    margins: { marginType: 'none' },
  });

  fs.writeFileSync(output, pdf);
  console.log(`PDF_OK ${output} ${(pdf.length / 1024).toFixed(0)} KB`);
  app.exit(0);
}).catch((error) => {
  console.error(`PDF_FAILED ${error.stack || error.message}`);
  app.exit(1);
});
