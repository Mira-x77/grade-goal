import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker from public folder
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface PreviewOptions {
  watermarkText?: string;
  watermarkOpacity?: number;
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Generate a watermarked preview image from the first page of a PDF
 */
export async function generatePDFPreview(
  pdfFile: File,
  options: PreviewOptions = {}
): Promise<Blob> {
  const {
    watermarkText = 'PREVIEW ONLY',
    watermarkOpacity = 0.3,
    maxWidth = 800,
    maxHeight = 1200
  } = options;

  try {
    // Read PDF file
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    // Get first page
    const page = await pdf.getPage(1);
    
    // Calculate scale to fit within max dimensions
    const viewport = page.getViewport({ scale: 1.0 });
    const scale = Math.min(
      maxWidth / viewport.width,
      maxHeight / viewport.height,
      2.0 // Max scale of 2x for quality
    );
    
    const scaledViewport = page.getViewport({ scale });
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    
    // Render PDF page to canvas
    await page.render({
      canvasContext: context,
      viewport: scaledViewport
    }).promise;
    
    // Add watermark
    addWatermark(context, canvas.width, canvas.height, watermarkText, watermarkOpacity);
    
    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate preview image'));
        }
      }, 'image/jpeg', 0.85);
    });
  } catch (error) {
    console.error('Error generating PDF preview:', error);
    throw new Error(`Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Add diagonal watermark to canvas
 */
function addWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  opacity: number
): void {
  ctx.save();
  
  // Set watermark style
  ctx.globalAlpha = opacity;
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Rotate and position
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 4); // -45 degrees
  
  // Draw watermark multiple times for coverage
  const spacing = 200;
  for (let y = -height; y < height; y += spacing) {
    for (let x = -width; x < width; x += spacing) {
      ctx.fillText(text, x, y);
    }
  }
  
  ctx.restore();
}

/**
 * Generate multiple preview images (first 3 pages)
 */
export async function generateMultiPagePreview(
  pdfFile: File,
  options: PreviewOptions = {}
): Promise<Blob[]> {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const numPages = Math.min(pdf.numPages, 3);
  const previews: Blob[] = [];
  
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const preview = await renderPageToBlob(page, options);
    previews.push(preview);
  }
  
  return previews;
}

async function renderPageToBlob(
  page: any,
  options: PreviewOptions
): Promise<Blob> {
  const {
    watermarkText = 'PREVIEW ONLY',
    watermarkOpacity = 0.3,
    maxWidth = 800,
    maxHeight = 1200
  } = options;

  const viewport = page.getViewport({ scale: 1.0 });
  const scale = Math.min(
    maxWidth / viewport.width,
    maxHeight / viewport.height,
    2.0
  );
  
  const scaledViewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;
  
  await page.render({
    canvasContext: context,
    viewport: scaledViewport
  }).promise;
  
  addWatermark(context, canvas.width, canvas.height, watermarkText, watermarkOpacity);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to generate preview'));
      }
    }, 'image/jpeg', 0.85);
  });
}
