import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const EXAM_PAPERS_DIR = 'exam-papers';

/**
 * Initialize exam papers directory
 */
export async function initFilesystem(): Promise<void> {
  if (Capacitor.getPlatform() === 'web') {
    console.log('Filesystem not available on web platform');
    return;
  }

  try {
    await Filesystem.mkdir({
      path: EXAM_PAPERS_DIR,
      directory: Directory.Data,
      recursive: true
    });
    console.log('Filesystem initialized');
  } catch (error) {
    // Directory might already exist
    console.log('Filesystem directory already exists or created');
  }
}

/**
 * Convert Blob to base64 string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 string to Blob
 */
export function base64ToBlob(base64: string, contentType: string = 'application/pdf'): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

/**
 * Save PDF to device storage
 */
export async function savePDF(fileName: string, data: Blob): Promise<string> {
  if (Capacitor.getPlatform() === 'web') {
    // For web, use localStorage or IndexedDB
    // This is a fallback - web doesn't support file system
    throw new Error('File system not supported on web platform');
  }

  const base64Data = await blobToBase64(data);
  
  const result = await Filesystem.writeFile({
    path: `${EXAM_PAPERS_DIR}/${fileName}`,
    data: base64Data,
    directory: Directory.Data
  });
  
  return result.uri;
}

/**
 * Delete PDF from device storage
 */
export async function deletePDF(fileName: string): Promise<void> {
  if (Capacitor.getPlatform() === 'web') {
    return;
  }

  await Filesystem.deleteFile({
    path: `${EXAM_PAPERS_DIR}/${fileName}`,
    directory: Directory.Data
  });
}

/**
 * Get file URI for opening
 */
export async function getFileUri(fileName: string): Promise<string> {
  if (Capacitor.getPlatform() === 'web') {
    throw new Error('File system not supported on web platform');
  }

  const result = await Filesystem.getUri({
    path: `${EXAM_PAPERS_DIR}/${fileName}`,
    directory: Directory.Data
  });
  
  return result.uri;
}

/**
 * Check available storage space
 * Platform-specific implementation
 */
export async function getAvailableSpace(): Promise<number> {
  if (Capacitor.getPlatform() === 'web') {
    // For web, estimate using Storage API
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const available = (estimate.quota || 0) - (estimate.usage || 0);
      return available;
    }
    // Default to 1GB if not available
    return 1024 * 1024 * 1024;
  }

  // For mobile platforms, we'll use a conservative estimate
  // In a real app, you'd use platform-specific plugins
  // For now, assume 1GB available (this is a simplification)
  return 1024 * 1024 * 1024;
}

/**
 * Check if file exists
 */
export async function fileExists(fileName: string): Promise<boolean> {
  if (Capacitor.getPlatform() === 'web') {
    return false;
  }

  try {
    await Filesystem.stat({
      path: `${EXAM_PAPERS_DIR}/${fileName}`,
      directory: Directory.Data
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Read file as base64
 */
export async function readFileAsBase64(fileName: string): Promise<string> {
  if (Capacitor.getPlatform() === 'web') {
    throw new Error('File system not supported on web platform');
  }

  const result = await Filesystem.readFile({
    path: `${EXAM_PAPERS_DIR}/${fileName}`,
    directory: Directory.Data
  });
  
  return result.data as string;
}
