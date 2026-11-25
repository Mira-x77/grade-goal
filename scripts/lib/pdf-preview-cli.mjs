#!/usr/bin/env node
/** Usage: node scripts/lib/pdf-preview-cli.mjs <in.pdf> <out.jpg> */
import fs from 'fs';
import { generatePdfPreviewJpeg } from './pdf-preview-node.mjs';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('Usage: node scripts/lib/pdf-preview-cli.mjs <in.pdf> <out.jpg>');
  process.exit(1);
}

const pdf = fs.readFileSync(inPath);
const jpeg = await generatePdfPreviewJpeg(pdf);
fs.writeFileSync(outPath, jpeg);
console.log(outPath);
