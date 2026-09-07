import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { base64ToBlob, EXAM_PAPERS_DIR } from './filesystem';

/**
 * Calculate SHA-256 hash of file or blob
 */
export async function calculateFileHash(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verify downloaded file matches expected hash
 */
export async function verifyDownload(
  localPath: string,
  expectedHash: string
): Promise<boolean> {
  try {
    if (Capacitor.getPlatform() === 'web') {
      // Web platform doesn't support file system
      return true;
    }

    // Extract filename from path
    const fileName = localPath.split('/').pop() || '';
    
    const fileData = await Filesystem.readFile({
      path: `${EXAM_PAPERS_DIR}/${fileName}`,
      directory: Directory.Data
    });
    
    // Convert base64 to blob
    const blob = base64ToBlob(fileData.data as string);
    const actualHash = await calculateFileHash(blob);
    
    return actualHash === expectedHash;
  } catch (error) {
    console.error('Hash verification failed:', error);
    return false;
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Download file with progress tracking
 */
export async function downloadFile(
  url: string,
  onProgress: (progress: number) => void
): Promise<Blob> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'application/pdf,*/*'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }
    
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }
    
    const chunks: Uint8Array[] = [];
    let receivedLength = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;
      
      if (total > 0) {
        const progress = (receivedLength / total) * 100;
        onProgress(Math.min(progress, 100));
      } else {
        // If no content-length, show indeterminate progress
        onProgress(50);
      }
    }
    
    // Final progress
    onProgress(100);
    
    const blob = new Blob(chunks, { type: 'application/pdf' });
    return blob;
  } catch (error) {
    console.error('Download error:', error);
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Network error. Please check your internet connection.');
    }
    throw error;
  }
}
