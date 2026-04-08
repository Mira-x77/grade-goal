import { ExamPaper, DownloadProgress, DownloadedPaper } from '@/types/exam-library';
import { downloadFile, verifyDownload, formatBytes } from '@/lib/integrity';
import { savePDF, deletePDF, getFileUri, getAvailableSpace, EXAM_PAPERS_DIR } from '@/lib/filesystem';
import { cacheService } from './cacheService';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { checkStorageBeforeDownload, safeFileOperation, handleFirebaseError } from '@/lib/error-handling';

class DownloadService {
  private activeDownloads: Map<string, AbortController> = new Map();

  /**
   * Check available device storage
   */
  async checkStorageAvailable(requiredBytes: number): Promise<boolean> {
    const result = await checkStorageBeforeDownload(requiredBytes);
    if (!result.available && result.error) {
      throw new Error(result.error);
    }
    return result.available;
  }

  /**
   * Download PDF from Supabase Storage to device
   * Returns local file path
   */
  async downloadPaper(
    paper: ExamPaper,
    onProgress: (progress: DownloadProgress) => void
  ): Promise<string> {
    try {
      // Check storage availability
      const hasSpace = await this.checkStorageAvailable(paper.fileSize);
      if (!hasSpace) {
        throw new Error(`Insufficient storage. Need ${formatBytes(paper.fileSize)}`);
      }

      // Create abort controller for cancellation
      const abortController = new AbortController();
      this.activeDownloads.set(paper.id, abortController);

      onProgress({
        paperId: paper.id,
        progress: 10,
        bytesDownloaded: 0,
        totalBytes: paper.fileSize,
        status: 'downloading'
      });

      // For mobile, use fetch + Filesystem.writeFile (reliable on Android)
      let blob: Blob;
      if (Capacitor.getPlatform() !== 'web') {
        try {
          console.log('📥 Starting mobile download for:', paper.fileName);

          onProgress({ paperId: paper.id, progress: 20, bytesDownloaded: 0, totalBytes: paper.fileSize, status: 'downloading' });

          const response = await fetch(paper.fileUrl);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          blob = await response.blob();

          onProgress({ paperId: paper.id, progress: 70, bytesDownloaded: paper.fileSize * 0.7, totalBytes: paper.fileSize, status: 'downloading' });

          // Convert blob to base64 and write to filesystem
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          await Filesystem.writeFile({
            path: `${EXAM_PAPERS_DIR}/${paper.fileName}`,
            data: base64Data,
            directory: Directory.Data,
            recursive: true,
          });

          onProgress({ paperId: paper.id, progress: 90, bytesDownloaded: paper.fileSize * 0.9, totalBytes: paper.fileSize, status: 'downloading' });

          const localPath = `${EXAM_PAPERS_DIR}/${paper.fileName}`;
          console.log('📁 File saved at:', localPath);

          const cachedPapers = await cacheService.getCachedPapers();
          if (!cachedPapers.find(p => p.id === paper.id)) {
            await cacheService.cachePapers([paper]);
          }
          await cacheService.updateDownloadStatus(paper.id, true, localPath);

          // Download thumbnail if available
          if (paper.preview_url) {
            try {
              const thumbResponse = await fetch(paper.preview_url);
              if (thumbResponse.ok) {
                const thumbBlob = await thumbResponse.blob();
                const thumbDataUrl = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(thumbBlob);
                });
                await cacheService.updateThumbnailPath(paper.id, thumbDataUrl);
              }
            } catch (thumbErr) {
              console.warn('Thumbnail download failed (non-critical):', thumbErr);
            }
          }

          onProgress({ paperId: paper.id, progress: 100, bytesDownloaded: paper.fileSize, totalBytes: paper.fileSize, status: 'completed' });

          return localPath;

        } catch (fetchError) {
          console.error('Mobile download error:', fetchError);
          throw new Error('Failed to download file. Please check your internet connection and try again.');
        }
      } else {
        // Web: Use streaming with progress
        try {
          blob = await downloadFile(paper.fileUrl, (progress) => {
            onProgress({
              paperId: paper.id,
              progress: Math.min(progress * 0.8, 80), // Reserve 20% for saving
              bytesDownloaded: (progress / 100) * paper.fileSize * 0.8,
              totalBytes: paper.fileSize,
              status: 'downloading'
            });
          });
        } catch (downloadError) {
          console.error('Web download error:', downloadError);
          throw new Error('Failed to download file. Please check your internet connection.');
        }
      }

      onProgress({
        paperId: paper.id,
        progress: 90,
        bytesDownloaded: paper.fileSize * 0.9,
        totalBytes: paper.fileSize,
        status: 'downloading'
      });

      // Save to device storage with error handling (web only)
      const saveResult = await safeFileOperation(
        () => savePDF(paper.fileName, blob),
        'Failed to save PDF to device storage'
      );

      if (!saveResult.success || !saveResult.data) {
        throw new Error(saveResult.error || 'Failed to save PDF to device');
      }

      const fileUri = saveResult.data;
      // Store the actual filename, not the URI
      const localPath = `${EXAM_PAPERS_DIR}/${paper.fileName}`;

      console.log('📁 File saved:', {
        fileName: paper.fileName,
        fileUri: fileUri,
        localPath: localPath
      });

      // CRITICAL: Ensure paper is in cache before updating download status
      console.log('🔍 Checking if paper exists in cache before update...');
      const cachedPapers = await cacheService.getCachedPapers();
      const paperInCache = cachedPapers.find(p => p.id === paper.id);
      
      if (!paperInCache) {
        console.warn('⚠️ Paper not in cache! Adding it now...');
        // Add paper to cache first
        await cacheService.cachePapers([paper]);
        console.log('✅ Paper added to cache');
      } else {
        console.log('✅ Paper already in cache');
      }

      // Update cache with download status
      console.log('💾 Updating cache for paper:', paper.id, 'with localPath:', localPath);
      await cacheService.updateDownloadStatus(paper.id, true, localPath);
      console.log('✅ Cache updated successfully');
      
      // Verify the update worked
      const updatedPapers = await cacheService.getCachedPapers();
      const updatedPaper = updatedPapers.find(p => p.id === paper.id);
      console.log('🔍 Verification - Paper after update:', {
        id: updatedPaper?.id,
        isDownloaded: updatedPaper?.isDownloaded,
        localPath: updatedPaper?.localPath
      });

      // Complete progress
      onProgress({
        paperId: paper.id,
        progress: 100,
        bytesDownloaded: paper.fileSize,
        totalBytes: paper.fileSize,
        status: 'completed'
      });

      return localPath;
    } catch (error) {
      console.error('Download failed:', error);
      
      onProgress({
        paperId: paper.id,
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: paper.fileSize,
        status: 'failed'
      });
      
      // Provide user-friendly error message
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Download failed. Please try again.');
    } finally {
      this.activeDownloads.delete(paper.id);
    }
  }

  /**
   * Cancel ongoing download
   */
  async cancelDownload(paperId: string): Promise<void> {
    const controller = this.activeDownloads.get(paperId);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(paperId);
    }
  }

  /**
   * Verify downloaded file integrity using content hash
   */
  async verifyFileIntegrity(localPath: string, expectedHash: string): Promise<boolean> {
    return verifyDownload(localPath, expectedHash);
  }

  /**
   * Delete downloaded paper from device
   */
  async deletePaper(paperId: string): Promise<void> {
    // Get paper info from cache
    const cachedPapers = await cacheService.getCachedPapers();
    const paper = cachedPapers.find(p => p.id === paperId);
    
    if (!paper || !paper.localPath) {
      throw new Error('Paper not found or not downloaded');
    }

    // Extract filename from path
    const fileName = paper.localPath.split('/').pop() || '';

    // Delete file from storage with error handling
    const deleteResult = await safeFileOperation(
      () => deletePDF(fileName),
      'Failed to delete file from device storage'
    );

    if (!deleteResult.success) {
      throw new Error(deleteResult.error || 'Failed to delete file');
    }

    // Update cache
    await cacheService.updateDownloadStatus(paperId, false);
  }

  /**
   * Get all downloaded papers
   */
  async getDownloadedPapers(): Promise<DownloadedPaper[]> {
    return cacheService.getDownloadedPapers();
  }

  /**
   * Get total storage used by downloads
   */
  async getTotalStorageUsed(): Promise<number> {
    const downloads = await this.getDownloadedPapers();
    return downloads.reduce((total, paper) => total + paper.fileSize, 0);
  }

  /**
   * Open PDF in native viewer
   */
  async openPDF(localPath: string): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      // For web, open in new tab
      window.open(localPath, '_blank');
      return;
    }

    try {
      // Get file URI
      const fileName = localPath.split('/').pop() || '';
      const fileUri = await getFileUri(fileName);

      // Open with native viewer
      await FileOpener.open({
        filePath: fileUri,
        contentType: 'application/pdf',
        openWithDefault: true
      });
    } catch (error) {
      console.error('Failed to open PDF:', error);
      const errorMessage = handleFirebaseError(error);
      throw new Error(errorMessage || 'Failed to open PDF. Please ensure you have a PDF viewer installed.');
    }
  }

  /**
   * Check if paper is downloaded
   */
  async isPaperDownloaded(paperId: string): Promise<boolean> {
    const cachedPapers = await cacheService.getCachedPapers();
    const paper = cachedPapers.find(p => p.id === paperId);
    return paper?.isDownloaded || false;
  }

  /**
   * Get download info for a paper
   */
  async getDownloadInfo(paperId: string): Promise<DownloadedPaper | null> {
    const downloads = await this.getDownloadedPapers();
    return downloads.find(d => d.paperId === paperId) || null;
  }

  /**
   * Delete multiple papers
   */
  async deleteMultiplePapers(paperIds: string[]): Promise<void> {
    for (const paperId of paperIds) {
      try {
        await this.deletePaper(paperId);
      } catch (error) {
        console.error(`Failed to delete paper ${paperId}:`, error);
        // Continue with other deletions
      }
    }
  }
}

export const downloadService = new DownloadService();
