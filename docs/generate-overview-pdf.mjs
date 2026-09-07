import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mdPath = join(__dirname, 'Grade-Goal-App-Overview.md');
const htmlPath = join(__dirname, 'Grade-Goal-App-Overview.html');
const pdfPath = join(__dirname, 'Grade-Goal-App-Overview.pdf');

const md = readFileSync(mdPath, 'utf8');

// Simple markdown → HTML (tables, headers, lists, code, mermaid blocks)
function mdToHtml(source) {
  const lines = source.split('\n');
  let html = '';
  let inCode = false;
  let codeLang = '';
  let codeBuf = [];
  let inTable = false;
  let tableRows = [];

  const flushTable = () => {
    if (!tableRows.length) return;
    html += '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1em 0;">\n';
    tableRows.forEach((row, i) => {
      const tag = i === 0 ? 'th' : 'td';
      const style = i === 0 ? ' style="background:#f0f0f0;"' : '';
      html += '<tr>' + row.map((c) => `<${tag}${style}>${inline(c)}</${tag}>`).join('') + '</tr>\n';
    });
    html += '</table>\n';
    tableRows = [];
    inTable = false;
  };

  const inline = (s) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (!inCode) {
        flushTable();
        inCode = true;
        codeLang = line.slice(3).trim();
        codeBuf = [];
      } else {
        inCode = false;
        const body = codeBuf.join('\n');
        if (codeLang === 'mermaid') {
          html += '<motion.div class="diagram"><img src="architecture.svg" alt="Architecture diagram" style="max-width:100%;height:auto;display:block;margin:1em auto;"/></motion.div>\n'.replaceAll('motion.', '');
        } else {
          html += `<pre><code>${body.replace(/</g, '&lt;')}</code></pre>\n`;
        }
        codeLang = '';
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    if (line.includes('|') && line.trim().startsWith('|')) {
      if (/^\|[\s\-:|]+\|$/.test(line.trim())) continue;
      const cells = line
        .trim()
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      tableRows.push(cells);
      inTable = true;
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (line.startsWith('# ')) {
      html += `<h1>${inline(line.slice(2))}</h1>\n`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${inline(line.slice(3))}</h2>\n`;
    } else if (line.startsWith('### ')) {
      html += `<h3>${inline(line.slice(4))}</h3>\n`;
    } else if (line.startsWith('- ')) {
      html += `<li>${inline(line.slice(2))}</li>\n`;
    } else if (/^\d+\.\s/.test(line)) {
      html += `<li>${inline(line.replace(/^\d+\.\s/, ''))}</li>\n`;
    } else if (line.trim() === '---') {
      html += '<hr/>\n';
    } else if (line.trim() === '') {
      html += '<br/>\n';
    } else if (line.startsWith('*') && line.endsWith('*')) {
      html += `<p><em>${line.slice(1, -1)}</em></p>\n`;
    } else {
      html += `<p>${inline(line)}</p>\n`;
    }
  }
  flushTable();
  return html;
}

const body = mdToHtml(md);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Grade Goal — Full Application Overview</title>
  <style>
    @page { margin: 2cm; size: A4; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }
    h1 { font-size: 22pt; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }
    h2 { font-size: 16pt; margin-top: 1.5em; color: #4338ca; }
    h3 { font-size: 13pt; margin-top: 1.2em; }
    table { font-size: 10pt; }
    code { background: #f4f4f5; padding: 2px 6px; border-radius: 4px; font-size: 10pt; }
    pre { background: #f4f4f5; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 9pt; }
    pre.mermaid { background: #fff; border: 1px solid #e5e7eb; text-align: center; }
    li { margin: 4px 0; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 2em 0; }
    p { margin: 0.5em 0; }
  </style>
</head>
<body>
${body}
</body>
</html>`;

writeFileSync(htmlPath, fullHtml);
console.log('HTML written to:', htmlPath);
