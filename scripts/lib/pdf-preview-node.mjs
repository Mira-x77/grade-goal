import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas } from 'canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKER = path.join(__dirname, '../../node_modules/pdfjs-dist/build/pdf.worker.min.js');
pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER;

function addWatermark(ctx, width, height, text = 'PREVIEW ONLY', opacity = 0.3) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 4);
  const spacing = 200;
  for (let y = -height; y < height; y += spacing) {
    for (let x = -width; x < width; x += spacing) {
      ctx.fillText(text, x, y);
    }
  }
  ctx.restore();
}

/**
 * Render first page of a PDF buffer to JPEG (matches admin preview style).
 */
export async function generatePdfPreviewJpeg(pdfBuffer, options = {}) {
  const { maxWidth = 800, maxHeight = 1200, watermarkText = 'PREVIEW ONLY' } = options;
  const data =
    pdfBuffer instanceof Uint8Array && !Buffer.isBuffer(pdfBuffer)
      ? pdfBuffer
      : new Uint8Array(pdfBuffer);
  const pdf = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(maxWidth / baseViewport.width, maxHeight / baseViewport.height, 2);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  addWatermark(ctx, canvas.width, canvas.height, watermarkText);
  return canvas.toBuffer('image/jpeg', { quality: 0.85 });
}
