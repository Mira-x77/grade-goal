import {
  ExamPaper,
  DownloadProgress,
  DownloadedPaper,
  LibraryBook,
  CachedBook,
  DownloadedBook,
  UnifiedDownloadProgress,
} from "@/types/exam-library";
import { downloadFile, verifyDownload, formatBytes } from "@/lib/integrity";
import {
  savePDF,
  deletePDF,
  getFileUri,
  getAvailableSpace,
  EXAM_PAPERS_DIR,
  BOOKS_DIR,
  saveBookPDF,
  deleteBookPDF,
  getBookFileUri,
  generateBookFileName,
} from "@/lib/filesystem";
import { cacheService } from "./cacheService";
import { recordDownload, removeDownloadRecord } from "./downloadSyncService";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";
import {
  checkStorageBeforeDownload,
  safeFileOperation,
  handleStorageError,
} from "@/lib/error-handling";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/device-id";
import { quotaEvents } from "@/lib/quotaEvents";
import {
  bumpLifetimeDownloadPeak,
  readLifetimeDownloadPeak,
} from "@/lib/download-quota-lifetime";
import { quotaService } from "@/services/quotaService";

// Get current user ID from persisted session (same pattern as storage.ts)
function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem(
      `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`,
    );
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.user?.id ?? null;
    }
  } catch {}
  return null;
}

// Helper to read local quota usage
function readLocalQuotaUsed(): number {
  try {
    const LOCAL_QUOTA_KEY = 'scoretarget_local_quota_used';
    const raw = localStorage.getItem(LOCAL_QUOTA_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { month?: string; used?: number };
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (parsed.month !== currentMonth) return 0;
    return typeof parsed.used === 'number' ? parsed.used : 0;
  } catch {
    return 0;
  }
}

class DownloadService {
  private activeDownloads: Map<string, AbortController> = new Map();

  private emitQuotaAfterIncrement(
    result:
      | {
          success?: boolean;
          downloads_used?: number;
          quota_limit?: number;
          has_premium?: boolean;
        }
      | null
      | undefined,
  ): void {
    if (result?.success) {
      quotaEvents.emit(quotaService.fromIncrementResult(result));
    } else {
      void quotaService.getQuotaStatus().then((q) => quotaEvents.emit(q));
    }
  }

  /**
   * Check download quota before allowing download
   */
  async checkDownloadQuota(): Promise<{
    canDownload: boolean;
    downloadsUsed: number;
    quotaLimit: number;
    downloadsRemaining: number;
    hasPremium: boolean;
    message?: string;
  }> {
    try {
      const deviceId = await getDeviceId();

      const { data, error } = await supabase.rpc("get_download_quota_status", {
        p_device_id: deviceId,
      });

      if (error) {
        console.error("Error checking download quota:", error);
        const status = await quotaService.getQuotaStatus();
        return {
          canDownload: status.canDownload,
          downloadsUsed: status.downloadsUsed,
          quotaLimit: status.quotaLimit,
          downloadsRemaining: status.downloadsRemaining,
          hasPremium: status.hasPremium,
          message: status.canDownload ? "Using local quota check" : "Download limit reached. Upgrade to premium.",
        };
      }

      const quota = Array.isArray(data) ? data[0] : data;
      const status = await quotaService.getQuotaStatus();

      return {
        canDownload: status.canDownload,
        downloadsUsed: status.downloadsUsed,
        quotaLimit: status.quotaLimit,
        downloadsRemaining: status.downloadsRemaining,
        hasPremium: status.hasPremium,
        message: status.canDownload
          ? undefined
          : "Download limit reached. Upgrade to premium for unlimited downloads.",
      };
    } catch (error) {
      console.error("Error checking download quota:", error);
      const localUsed = Math.max(readLocalQuotaUsed(), readLifetimeDownloadPeak());
      const canDownload = localUsed < 5;
      return {
        canDownload,
        downloadsUsed: localUsed,
        quotaLimit: 5,
        downloadsRemaining: Math.max(0, 5 - localUsed),
        hasPremium: false,
        message: canDownload ? "Using local quota check" : "Download limit reached. Upgrade to premium.",
      };
    }
  }

  /**
   * Increment download count with quota tracking
   */
  async incrementDownloadCount(
    paperId?: string,
    bookId?: string,
  ): Promise<{
    success: boolean;
    message: string;
    downloads_used: number;
    quota_limit: number;
    has_premium: boolean;
  }> {
    try {
      const deviceId = await getDeviceId();

      const { data, error } = await supabase.rpc(
        "increment_download_with_quota",
        {
          p_device_id: deviceId,
          p_paper_id: paperId || null,
          p_book_id: bookId || null,
        },
      );

      if (error) {
        console.warn(
          "RPC increment failed (likely anonymous user), using local fallback:",
          error.message,
        );
        return this.incrementDownloadCountLocal();
      }

      const result = Array.isArray(data) ? data[0] : data;
      return result;
    } catch (error) {
      console.warn(
        "incrementDownloadCount failed, using local fallback:",
        error,
      );
      return this.incrementDownloadCountLocal();
    }
  }

  /**
   * Local fallback for download count when RPC is unavailable (anonymous users).
   * Writes to the same localStorage key that quotaService reads so the UI
   * counter stays in sync regardless of whether the Supabase RPC succeeds.
   */
  private incrementDownloadCountLocal(): {
    success: boolean;
    message: string;
    downloads_used: number;
    quota_limit: number;
    has_premium: boolean;
  } {
    const LOCAL_QUOTA_KEY = "scoretarget_local_quota_used";
    const month = new Date().toISOString().slice(0, 7);
    let current = 0;
    try {
      const raw = localStorage.getItem(LOCAL_QUOTA_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { month?: string; used?: number };
        if (parsed.month === month)
          current = typeof parsed.used === "number" ? parsed.used : 0;
      }
    } catch {
      /* ignore */
    }
    const next = current + 1;
    localStorage.setItem(
      LOCAL_QUOTA_KEY,
      JSON.stringify({ month, used: next }),
    );
    bumpLifetimeDownloadPeak(next);
    console.log(`📊 Local quota fallback: ${next}/5`);
    return {
      success: true,
      message: "Download tracked locally",
      downloads_used: next,
      quota_limit: 5,
      has_premium: false,
    };
  }

  /**
   * Deleting a local file must NOT restore free download slots (lifetime quota).
   */
  async decrementDownloadCount(): Promise<void> {
    return;
  }

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
    onProgress: (progress: DownloadProgress) => void,
  ): Promise<string> {
    try {
      // Check download quota first
      const quotaCheck = await this.checkDownloadQuota();
      if (!quotaCheck.canDownload) {
        throw new Error(quotaCheck.message || "Download limit reached");
      }

      // Check storage availability
      const hasSpace = await this.checkStorageAvailable(paper.fileSize);
      if (!hasSpace) {
        throw new Error(
          `Insufficient storage. Need ${formatBytes(paper.fileSize)}`,
        );
      }

      // Create abort controller for cancellation
      const abortController = new AbortController();
      this.activeDownloads.set(paper.id, abortController);

      onProgress({
        paperId: paper.id,
        progress: 10,
        bytesDownloaded: 0,
        totalBytes: paper.fileSize,
        status: "downloading",
      });

      // For mobile, use fetch + Filesystem.writeFile (reliable on Android)
      let blob: Blob;
      if (Capacitor.getPlatform() !== "web") {
        try {
          console.log("📥 Starting mobile download for:", paper.fileName);

          onProgress({
            paperId: paper.id,
            progress: 20,
            bytesDownloaded: 0,
            totalBytes: paper.fileSize,
            status: "downloading",
          });

          // Enhanced fetch with better error handling and timeout
          const response = await fetch(paper.fileUrl, {
            method: "GET",
            headers: {
              Accept: "application/pdf",
              "Cache-Control": "no-cache",
            },
            signal: abortController.signal,
          });

          if (!response.ok) {
            throw new Error(
              `Download failed: HTTP ${response.status} - ${response.statusText}`,
            );
          }

          // Verify content type
          const contentType = response.headers.get("content-type");
          if (contentType && !contentType.includes("pdf")) {
            console.warn("⚠️ Unexpected content type:", contentType);
          }

          blob = await response.blob();

          onProgress({
            paperId: paper.id,
            progress: 70,
            bytesDownloaded: paper.fileSize * 0.7,
            totalBytes: paper.fileSize,
            status: "downloading",
          });

          // Enhanced blob to base64 conversion with error handling
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              try {
                const result = reader.result as string;
                if (!result || !result.includes(",")) {
                  reject(new Error("Invalid base64 conversion result"));
                  return;
                }
                resolve(result.split(",")[1]);
              } catch (error) {
                reject(new Error(`Base64 conversion failed: ${error}`));
              }
            };
            reader.onerror = () =>
              reject(new Error("FileReader error during base64 conversion"));
            reader.readAsDataURL(blob);
          });

          // Ensure directory exists and write file with better error handling
          try {
            await Filesystem.writeFile({
              path: `${EXAM_PAPERS_DIR}/${paper.fileName}`,
              data: base64Data,
              directory: Directory.Data,
              recursive: true,
            });
          } catch (writeError) {
            console.error("File write error:", writeError);
            throw new Error(`Failed to save PDF file: ${writeError}`);
          }

          onProgress({
            paperId: paper.id,
            progress: 90,
            bytesDownloaded: paper.fileSize * 0.9,
            totalBytes: paper.fileSize,
            status: "downloading",
          });

          const localPath = `${EXAM_PAPERS_DIR}/${paper.fileName}`;
          console.log("📁 File saved at:", localPath);

          const cachedPapers = await cacheService.getCachedPapers();
          if (!cachedPapers.find((p) => p.id === paper.id)) {
            await cacheService.cachePapers([paper]);
          }
          await cacheService.updateDownloadStatus(paper.id, true, localPath);

          // Download thumbnail if available
          if (paper.preview_url) {
            try {
              const thumbResponse = await fetch(paper.preview_url);
              if (thumbResponse.ok) {
                const thumbBlob = await thumbResponse.blob();
                const thumbDataUrl = await new Promise<string>(
                  (resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(thumbBlob);
                  },
                );
                await cacheService.updateThumbnailPath(paper.id, thumbDataUrl);
              }
            } catch (thumbErr) {
              console.warn(
                "Thumbnail download failed (non-critical):",
                thumbErr,
              );
            }
          }

          onProgress({
            paperId: paper.id,
            progress: 100,
            bytesDownloaded: paper.fileSize,
            totalBytes: paper.fileSize,
            status: "completed",
          });

          // Increment download count with quota tracking
          try {
            const result = await this.incrementDownloadCount(paper.id);
            console.log("✅ Download count incremented:", result);
            this.emitQuotaAfterIncrement(result);
          } catch (quotaError) {
            console.error("❌ Failed to track download count:", quotaError);
          }

          // Sync to cloud (fire-and-forget)
          const userId = getCurrentUserId();
          if (userId) void recordDownload(userId, paper);

          return localPath;
        } catch (fetchError) {
          console.error("Mobile download error:", fetchError);
          throw new Error(
            "Failed to download file. Please check your internet connection and try again.",
          );
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
              status: "downloading",
            });
          });
        } catch (downloadError) {
          console.error("Web download error:", downloadError);
          throw new Error(
            "Failed to download file. Please check your internet connection.",
          );
        }
      }

      onProgress({
        paperId: paper.id,
        progress: 90,
        bytesDownloaded: paper.fileSize * 0.9,
        totalBytes: paper.fileSize,
        status: "downloading",
      });

      // Save to device storage with error handling (web only)
      const saveResult = await safeFileOperation(
        () => savePDF(paper.fileName, blob),
        "Failed to save PDF to device storage",
      );

      if (!saveResult.success || !saveResult.data) {
        throw new Error(saveResult.error || "Failed to save PDF to device");
      }

      const fileUri = saveResult.data;
      // Store the actual filename, not the URI
      const localPath = `${EXAM_PAPERS_DIR}/${paper.fileName}`;

      console.log("📁 File saved:", {
        fileName: paper.fileName,
        fileUri: fileUri,
        localPath: localPath,
      });

      // CRITICAL: Ensure paper is in cache before updating download status
      console.log("🔍 Checking if paper exists in cache before update...");
      const cachedPapers = await cacheService.getCachedPapers();
      const paperInCache = cachedPapers.find((p) => p.id === paper.id);

      if (!paperInCache) {
        console.warn("⚠️ Paper not in cache! Adding it now...");
        // Add paper to cache first
        await cacheService.cachePapers([paper]);
        console.log("✅ Paper added to cache");
      } else {
        console.log("✅ Paper already in cache");
      }

      // Update cache with download status
      console.log(
        "💾 Updating cache for paper:",
        paper.id,
        "with localPath:",
        localPath,
      );
      await cacheService.updateDownloadStatus(paper.id, true, localPath);
      console.log("✅ Cache updated successfully");

      // Verify the update worked
      const updatedPapers = await cacheService.getCachedPapers();
      const updatedPaper = updatedPapers.find((p) => p.id === paper.id);
      console.log("🔍 Verification - Paper after update:", {
        id: updatedPaper?.id,
        isDownloaded: updatedPaper?.isDownloaded,
        localPath: updatedPaper?.localPath,
      });

      // Complete progress
      onProgress({
        paperId: paper.id,
        progress: 100,
        bytesDownloaded: paper.fileSize,
        totalBytes: paper.fileSize,
        status: "completed",
      });

      // Increment download count with quota tracking
      try {
        const result = await this.incrementDownloadCount(paper.id);
        console.log("✅ Download count incremented:", result);
        this.emitQuotaAfterIncrement(result);
      } catch (quotaError) {
        console.error("❌ Failed to track download count:", quotaError);
        // Don't fail the download if quota tracking fails
      }

      // Sync to cloud (fire-and-forget)
      const userId = getCurrentUserId();
      if (userId) void recordDownload(userId, paper);

      return localPath;
    } catch (error) {
      console.error("Download failed:", error);

      onProgress({
        paperId: paper.id,
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: paper.fileSize,
        status: "failed",
      });

      // Provide user-friendly error message
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Download failed. Please try again.");
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
  async verifyFileIntegrity(
    localPath: string,
    expectedHash: string,
  ): Promise<boolean> {
    return verifyDownload(localPath, expectedHash);
  }

  /**
   * Delete downloaded paper from device
   */
  async deletePaper(paperId: string): Promise<void> {
    try {
      // Get paper info from cache
      const cachedPapers = await cacheService.getCachedPapers();
      const paper = cachedPapers.find((p) => p.id === paperId);

      if (!paper) {
        throw new Error("Paper not found in cache");
      }

      console.log("🗑️ Deleting paper:", paper.title, "ID:", paperId);

      // For mobile platforms, delete the actual file
      if (Capacitor.getPlatform() !== "web" && paper.localPath) {
        try {
          // Extract filename from path
          const fileName =
            paper.localPath.split("/").pop() ||
            paper.fileName ||
            `${paperId}.pdf`;
          console.log("📁 Deleting file:", fileName);

          // Delete file from filesystem
          await Filesystem.deleteFile({
            path: `${EXAM_PAPERS_DIR}/${fileName}`,
            directory: Directory.Data,
          });

          console.log("✅ File deleted successfully");
        } catch (fileError) {
          console.warn(
            "⚠️ File deletion failed (file may not exist):",
            fileError,
          );
          // Continue with cache cleanup even if file deletion fails
        }
      }

      // Update cache to mark as not downloaded
      await cacheService.updateDownloadStatus(paperId, false);
      console.log("✅ Cache updated");

      // Sync removal to cloud (fire-and-forget)
      const userId = getCurrentUserId();
      if (userId) {
        try {
          await removeDownloadRecord(userId, paperId);
          console.log("✅ Cloud sync completed");
        } catch (syncError) {
          console.warn("⚠️ Cloud sync failed:", syncError);
        }
      }

      // Decrement the live Supabase download count
      try {
        await this.decrementDownloadCount();
        void quotaService.getQuotaStatus().then((q) => quotaEvents.emit(q));
      } catch (quotaError) {
        console.error("❌ Failed to decrement download quota:", quotaError);
      }

      console.log("✅ Paper deletion completed");
    } catch (error) {
      console.error("❌ Delete paper failed:", error);
      throw error;
    }
  }

  /**
   * Get all downloaded papers
   */
  async getDownloadedPapers(): Promise<DownloadedPaper[]> {
    return cacheService.getDownloadedPapers();
  }

  /**
   * Open PDF in native viewer
   */
  async openPDF(localPath: string): Promise<void> {
    if (Capacitor.getPlatform() === "web") {
      // For web, open in new tab
      window.open(localPath, "_blank");
      return;
    }

    try {
      // Get file URI
      const fileName = localPath.split("/").pop() || "";
      const fileUri = await getFileUri(fileName);

      // Open with native viewer
      await FileOpener.open({
        filePath: fileUri,
        contentType: "application/pdf",
        openWithDefault: true,
      });
    } catch (error) {
      console.error("Failed to open PDF:", error);
      const errorMessage = handleStorageError(error);
      throw new Error(
        errorMessage ||
          "Failed to open PDF. Please ensure you have a PDF viewer installed.",
      );
    }
  }

  /**
   * Check if paper is downloaded
   */
  async isPaperDownloaded(paperId: string): Promise<boolean> {
    const cachedPapers = await cacheService.getCachedPapers();
    const paper = cachedPapers.find((p) => p.id === paperId);
    return paper?.isDownloaded || false;
  }

  /**
   * Get download info for a paper
   */
  async getDownloadInfo(paperId: string): Promise<DownloadedPaper | null> {
    const downloads = await this.getDownloadedPapers();
    return downloads.find((d) => d.paperId === paperId) || null;
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

  // ===== BOOK DOWNLOAD METHODS =====

  /**
   * Download book PDF from Supabase Storage to device
   * Returns local file path
   */
  async downloadBook(
    book: LibraryBook,
    onProgress: (progress: UnifiedDownloadProgress) => void,
  ): Promise<string> {
    try {
      // Check download quota first
      const quotaCheck = await this.checkDownloadQuota();
      if (!quotaCheck.canDownload) {
        throw new Error(quotaCheck.message || "Download limit reached");
      }

      // Check storage availability
      const hasSpace = await this.checkStorageAvailable(book.file_size);
      if (!hasSpace) {
        throw new Error(
          `Insufficient storage. Need ${formatBytes(book.file_size)}`,
        );
      }

      // Create abort controller for cancellation
      const abortController = new AbortController();
      this.activeDownloads.set(book.id, abortController);

      onProgress({
        itemId: book.id,
        itemType: "book",
        progress: 10,
        bytesDownloaded: 0,
        totalBytes: book.file_size,
        status: "downloading",
      });

      // Generate sanitized filename
      const fileName = generateBookFileName(book.title, book.id);

      // For mobile, use fetch + Filesystem.writeFile (reliable on Android)
      let blob: Blob;
      if (Capacitor.getPlatform() !== "web") {
        try {
          console.log("📥 Starting mobile book download for:", fileName);

          onProgress({
            itemId: book.id,
            itemType: "book",
            progress: 20,
            bytesDownloaded: 0,
            totalBytes: book.file_size,
            status: "downloading",
          });

          // Enhanced fetch with better error handling and timeout
          const response = await fetch(book.file_url, {
            method: "GET",
            headers: {
              Accept: "application/pdf",
              "Cache-Control": "no-cache",
            },
            signal: abortController.signal,
          });

          if (!response.ok) {
            throw new Error(
              `Download failed: HTTP ${response.status} - ${response.statusText}`,
            );
          }

          // Verify content type
          const contentType = response.headers.get("content-type");
          if (contentType && !contentType.includes("pdf")) {
            console.warn("⚠️ Unexpected content type:", contentType);
          }

          blob = await response.blob();

          onProgress({
            itemId: book.id,
            itemType: "book",
            progress: 70,
            bytesDownloaded: book.file_size * 0.7,
            totalBytes: book.file_size,
            status: "downloading",
          });

          // Enhanced blob to base64 conversion with error handling
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              try {
                const result = reader.result as string;
                if (!result || !result.includes(",")) {
                  reject(new Error("Invalid base64 conversion result"));
                  return;
                }
                resolve(result.split(",")[1]);
              } catch (error) {
                reject(new Error(`Base64 conversion failed: ${error}`));
              }
            };
            reader.onerror = () =>
              reject(new Error("FileReader error during base64 conversion"));
            reader.readAsDataURL(blob);
          });

          // Ensure directory exists and write file with better error handling
          try {
            await Filesystem.writeFile({
              path: `${BOOKS_DIR}/${fileName}`,
              data: base64Data,
              directory: Directory.Data,
              recursive: true,
            });
          } catch (writeError) {
            console.error("Book file write error:", writeError);
            throw new Error(`Failed to save book PDF file: ${writeError}`);
          }

          onProgress({
            itemId: book.id,
            itemType: "book",
            progress: 90,
            bytesDownloaded: book.file_size * 0.9,
            totalBytes: book.file_size,
            status: "downloading",
          });

          const localPath = `${BOOKS_DIR}/${fileName}`;
          console.log("📁 Book file saved at:", localPath);

          // Update cache with download status
          await this.updateBookCache(book, true, localPath);

          onProgress({
            itemId: book.id,
            itemType: "book",
            progress: 100,
            bytesDownloaded: book.file_size,
            totalBytes: book.file_size,
            status: "completed",
          });

          // Increment download count with quota tracking
          try {
            const result = await this.incrementDownloadCount(
              undefined,
              book.id,
            );
            console.log("✅ Book download count incremented:", result);
            this.emitQuotaAfterIncrement(result);
          } catch (quotaError) {
            console.error(
              "❌ Failed to track book download count:",
              quotaError,
            );
          }

          // Sync to cloud (fire-and-forget)
          const userId = getCurrentUserId();
          if (userId) void this.recordBookDownload(userId, book);

          return localPath;
        } catch (fetchError) {
          console.error("Mobile book download error:", fetchError);
          throw new Error(
            "Failed to download book. Please check your internet connection and try again.",
          );
        }
      } else {
        // Web: Use streaming with progress
        try {
          blob = await downloadFile(book.file_url, (progress) => {
            onProgress({
              itemId: book.id,
              itemType: "book",
              progress: Math.min(progress * 0.8, 80), // Reserve 20% for saving
              bytesDownloaded: (progress / 100) * book.file_size * 0.8,
              totalBytes: book.file_size,
              status: "downloading",
            });
          });
        } catch (downloadError) {
          console.error("Web book download error:", downloadError);
          throw new Error(
            "Failed to download book. Please check your internet connection.",
          );
        }
      }

      onProgress({
        itemId: book.id,
        itemType: "book",
        progress: 90,
        bytesDownloaded: book.file_size * 0.9,
        totalBytes: book.file_size,
        status: "downloading",
      });

      // Save to device storage with error handling (web only)
      const saveResult = await safeFileOperation(
        () => saveBookPDF(fileName, blob),
        "Failed to save book PDF to device storage",
      );

      if (!saveResult.success || !saveResult.data) {
        throw new Error(
          saveResult.error || "Failed to save book PDF to device",
        );
      }

      const fileUri = saveResult.data;
      const localPath = `${BOOKS_DIR}/${fileName}`;

      console.log("📁 Book file saved:", {
        fileName: fileName,
        fileUri: fileUri,
        localPath: localPath,
      });

      // Update cache with download status
      await this.updateBookCache(book, true, localPath);

      // Complete progress
      onProgress({
        itemId: book.id,
        itemType: "book",
        progress: 100,
        bytesDownloaded: book.file_size,
        totalBytes: book.file_size,
        status: "completed",
      });

      // Increment download count with quota tracking
      try {
        const result = await this.incrementDownloadCount(undefined, book.id);
        console.log("✅ Book download count incremented:", result);
        this.emitQuotaAfterIncrement(result);
      } catch (quotaError) {
        console.error("❌ Failed to track book download count:", quotaError);
        // Don't fail the download if quota tracking fails
      }

      // Sync to cloud (fire-and-forget)
      const userId = getCurrentUserId();
      if (userId) void this.recordBookDownload(userId, book);

      return localPath;
    } catch (error) {
      console.error("Book download failed:", error);

      onProgress({
        itemId: book.id,
        itemType: "book",
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: book.file_size,
        status: "failed",
      });

      // Provide user-friendly error message
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Book download failed. Please try again.");
    } finally {
      this.activeDownloads.delete(book.id);
    }
  }

  /**
   * Delete downloaded book from device
   */
  async deleteBook(bookId: string): Promise<void> {
    try {
      // Get book info from cache
      const cachedBooks = await cacheService.getCachedBooks();
      const book = cachedBooks.find((b) => b.id === bookId);

      if (!book) {
        throw new Error("Book not found in cache");
      }

      console.log("🗑️ Deleting book:", book.title, "ID:", bookId);

      // For mobile platforms, delete the actual file
      if (Capacitor.getPlatform() !== "web" && book.localPath) {
        try {
          // Extract filename from path
          const fileName =
            book.localPath.split("/").pop() ||
            generateBookFileName(book.title, bookId);
          console.log("📁 Deleting book file:", fileName);

          // Delete file from filesystem
          await Filesystem.deleteFile({
            path: `${BOOKS_DIR}/${fileName}`,
            directory: Directory.Data,
          });

          console.log("✅ Book file deleted successfully");
        } catch (fileError) {
          console.warn(
            "⚠️ Book file deletion failed (file may not exist):",
            fileError,
          );
          // Continue with cache cleanup even if file deletion fails
        }
      }

      // Update cache to mark as not downloaded
      await cacheService.updateBookDownloadStatus(bookId, false);
      console.log("✅ Book cache updated");

      // Sync removal to cloud (fire-and-forget)
      const userId = getCurrentUserId();
      if (userId) {
        try {
          await this.removeBookDownloadRecord(userId, bookId);
          console.log("✅ Book cloud sync completed");
        } catch (syncError) {
          console.warn("⚠️ Book cloud sync failed:", syncError);
        }
      }

      // Decrement the live Supabase download count
      try {
        await this.decrementDownloadCount();
        void quotaService.getQuotaStatus().then((q) => quotaEvents.emit(q));
      } catch (quotaError) {
        console.error("❌ Failed to decrement download quota:", quotaError);
      }

      console.log("✅ Book deletion completed");
    } catch (error) {
      console.error("❌ Delete book failed:", error);
      throw error;
    }
  }

  /**
   * Get all downloaded books
   */
  async getDownloadedBooks(): Promise<DownloadedBook[]> {
    return cacheService.getDownloadedBooks();
  }

  /**
   * Check if book is downloaded
   */
  async isBookDownloaded(bookId: string): Promise<boolean> {
    const cachedBooks = await cacheService.getCachedBooks();
    const book = cachedBooks.find((b) => b.id === bookId);
    return book?.isDownloaded || false;
  }

  /**
   * Get download info for a book
   */
  async getBookDownloadInfo(bookId: string): Promise<DownloadedBook | null> {
    const downloads = await this.getDownloadedBooks();
    return downloads.find((d) => d.bookId === bookId) || null;
  }

  /**
   * Delete multiple books
   */
  async deleteMultipleBooks(bookIds: string[]): Promise<void> {
    for (const bookId of bookIds) {
      try {
        await this.deleteBook(bookId);
      } catch (error) {
        console.error(`Failed to delete book ${bookId}:`, error);
        // Continue with other deletions
      }
    }
  }

  /**
   * Cancel ongoing book download
   */
  async cancelBookDownload(bookId: string): Promise<void> {
    const controller = this.activeDownloads.get(bookId);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(bookId);
    }
  }

  // ===== UNIFIED METHODS =====

  /**
   * Get total storage used by all downloads (papers + books)
   */
  async getTotalStorageUsed(): Promise<number> {
    const [papers, books] = await Promise.all([
      this.getDownloadedPapers(),
      this.getDownloadedBooks(),
    ]);

    const paperSize = papers.reduce(
      (total, paper) => total + paper.fileSize,
      0,
    );
    const bookSize = books.reduce((total, book) => total + book.fileSize, 0);

    return paperSize + bookSize;
  }

  /**
   * Get all downloads (papers and books combined)
   */
  async getAllDownloads(): Promise<Array<DownloadedPaper | DownloadedBook>> {
    const [papers, books] = await Promise.all([
      this.getDownloadedPapers(),
      this.getDownloadedBooks(),
    ]);

    return [...papers, ...books];
  }

  /**
   * Delete multiple items (papers and books)
   */
  async deleteMultipleItems(
    items: Array<{ id: string; type: "paper" | "book" }>,
  ): Promise<void> {
    for (const item of items) {
      try {
        if (item.type === "paper") {
          await this.deletePaper(item.id);
        } else {
          await this.deleteBook(item.id);
        }
      } catch (error) {
        console.error(`Failed to delete ${item.type} ${item.id}:`, error);
        // Continue with other deletions
      }
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Update book cache with download status
   */
  private async updateBookCache(
    book: LibraryBook,
    isDownloaded: boolean,
    localPath?: string,
  ): Promise<void> {
    // Check if book exists in cache, add if not
    const cachedBooks = await cacheService.getCachedBooks();
    const bookInCache = cachedBooks.find((b) => b.id === book.id);

    if (!bookInCache) {
      console.warn("⚠️ Book not in cache! Adding it now...");
      await cacheService.cacheBooks([book]);
      console.log("✅ Book added to cache");
    }

    // Update download status
    await cacheService.updateBookDownloadStatus(
      book.id,
      isDownloaded,
      localPath,
    );
    console.log("✅ Book cache updated successfully");
  }

  /**
   * Record book download to cloud sync
   */
  private async recordBookDownload(
    userId: string,
    book: LibraryBook,
  ): Promise<void> {
    // TODO: Implement book download sync when cloud sync service is extended
    console.log("📤 Book download sync not yet implemented for:", book.id);
  }

  /**
   * Remove book download record from cloud sync
   */
  private async removeBookDownloadRecord(
    userId: string,
    bookId: string,
  ): Promise<void> {
    // TODO: Implement book download removal sync when cloud sync service is extended
    console.log(
      "📤 Book download removal sync not yet implemented for:",
      bookId,
    );
  }
}

export const downloadService = new DownloadService();
