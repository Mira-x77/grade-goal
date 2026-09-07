import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { CommunityDevice } from '@capacitor-community/device';

export const EXAM_PAPERS_DIR = 'exam-papers';
export const BOOKS_DIR = 'books';
export const BASE_DATA_DIR = 'app-data';

export const STORAGE_PATHS = {
  PAPERS: `${BASE_DATA_DIR}/${EXAM_PAPERS_DIR}`,
  BOOKS: `${BASE_DATA_DIR}/${BOOKS_DIR}`
} as const;

/**
 * Initialize filesystem directories for papers and books
 */
export async function initFilesystem(): Promise<void> {
  if (Capacitor.getPlatform() === 'web') {
    console.log('Filesystem not available on web platform');
    return;
  }

  try {
    // Create papers directory
    await Filesystem.mkdir({
      path: EXAM_PAPERS_DIR,
      directory: Directory.Data,
      recursive: true
    });
    
    // Create books directory
    await Filesystem.mkdir({
      path: BOOKS_DIR,
      directory: Directory.Data,
      recursive: true
    });
    
    console.log('Filesystem directories initialized');
  } catch (error) {
    // Directories might already exist
    console.log('Filesystem directories already exist or created');
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
 * Save book PDF to device storage
 */
export async function saveBookPDF(fileName: string, data: Blob): Promise<string> {
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
    path: `${BOOKS_DIR}/${fileName}`,
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
 * Delete book PDF from device storage
 */
export async function deleteBookPDF(fileName: string): Promise<void> {
  if (Capacitor.getPlatform() === 'web') {
    return;
  }

  await Filesystem.deleteFile({
    path: `${BOOKS_DIR}/${fileName}`,
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
 * Get book file URI for opening
 */
export async function getBookFileUri(fileName: string): Promise<string> {
  if (Capacitor.getPlatform() === 'web') {
    throw new Error('File system not supported on web platform');
  }

  const result = await Filesystem.getUri({
    path: `${BOOKS_DIR}/${fileName}`,
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
 * Check if book file exists
 */
export async function bookFileExists(fileName: string): Promise<boolean> {
  if (Capacitor.getPlatform() === 'web') {
    return false;
  }

  try {
    await Filesystem.stat({
      path: `${BOOKS_DIR}/${fileName}`,
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

  console.log(`📖 Reading file: ${EXAM_PAPERS_DIR}/${fileName}`);
  
  try {
    // Check if file exists first
    try {
      await Filesystem.stat({
        path: `${EXAM_PAPERS_DIR}/${fileName}`,
        directory: Directory.Data
      });
      console.log(`✅ File exists: ${fileName}`);
    } catch (statError) {
      console.error(`❌ File does not exist: ${fileName}`);
      throw new Error(`File not found: ${fileName}. Please re-download.`);
    }

    const result = await Filesystem.readFile({
      path: `${EXAM_PAPERS_DIR}/${fileName}`,
      directory: Directory.Data
    });
    
    const dataStr = result.data as string;
    console.log(`✅ File read successfully`);
    console.log(`   Data type: ${typeof dataStr}`);
    console.log(`   Data length: ${dataStr.length} chars`);
    console.log(`   First 50 chars: ${dataStr.substring(0, 50)}`);
    
    if (!dataStr || dataStr.length === 0) {
      throw new Error('File is empty or corrupted. Please re-download.');
    }
    
    return dataStr;
  } catch (error) {
    console.error(`❌ Failed to read file ${fileName}:`, error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to read file: ${fileName}`);
  }
}

/**
 * Read book file as base64
 */
export async function readBookFileAsBase64(fileName: string): Promise<string> {
  if (Capacitor.getPlatform() === 'web') {
    throw new Error('File system not supported on web platform');
  }

  console.log(`📖 Reading book file: ${BOOKS_DIR}/${fileName}`);
  
  try {
    // Check if file exists first
    try {
      await Filesystem.stat({
        path: `${BOOKS_DIR}/${fileName}`,
        directory: Directory.Data
      });
      console.log(`✅ Book file exists: ${fileName}`);
    } catch (statError) {
      console.error(`❌ Book file does not exist: ${fileName}`);
      throw new Error(`Book file not found: ${fileName}. Please re-download.`);
    }

    const result = await Filesystem.readFile({
      path: `${BOOKS_DIR}/${fileName}`,
      directory: Directory.Data
    });
    
    const dataStr = result.data as string;
    console.log(`✅ Book file read successfully`);
    console.log(`   Data type: ${typeof dataStr}`);
    console.log(`   Data length: ${dataStr.length} chars`);
    console.log(`   First 50 chars: ${dataStr.substring(0, 50)}`);
    
    if (!dataStr || dataStr.length === 0) {
      throw new Error('Book file is empty or corrupted. Please re-download.');
    }
    
    return dataStr;
  } catch (error) {
    console.error(`❌ Failed to read book file ${fileName}:`, error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to read book file: ${fileName}`);
  }
}

/**
 * Generate sanitized filename for books
 */
export function generateBookFileName(title: string, bookId: string): string {
  // Sanitize title for filename
  const sanitizedTitle = title
    .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 50); // Limit length
  
  return `${sanitizedTitle}_${bookId}.pdf`;
}
