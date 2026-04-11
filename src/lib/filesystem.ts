import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { CommunityDevice } from '@capacitor-community/device';

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
    // On web: trigger a native browser download
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return fileName;
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
export async function getAvailableSpace(): Promise<{ available: number; used: number; total: number }> {
  if (Capacitor.getPlatform() === 'web') {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage ?? 0;
      const total = estimate.quota ?? 0;
      const available = total - used;
      return { available, used, total };
    }
    const total = 1024 * 1024 * 1024;
    return { available: total, used: 0, total };
  }

  // Mobile: use @capacitor-community/device for real disk info
  try {
    const info = await CommunityDevice.getInfo();
    const available = (info as any).realDiskFree ?? (info as any).diskFree ?? 0;
    const total = (info as any).realDiskTotal ?? (info as any).diskTotal ?? 0;
    return { available, used: total - available, total };
  } catch {
    const total = 1024 * 1024 * 1024;
    return { available: total, used: 0, total };
  }
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
