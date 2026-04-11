import { CachedPaper, DownloadedPaper, CacheMetadata, FilterCriteria, ExamPaper } from '@/types/exam-library';

const DB_NAME = 'examLibraryDB';
const DB_VERSION = 6;

const STORES = {
  PAPERS: 'papers',
  DOWNLOADS: 'downloads',
  METADATA: 'metadata'
};

class CacheService {
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        // Automatically clear expired cache on initialization
        this.clearExpiredCache().catch(err =>
          console.warn('Failed to clear expired cache:', err)
        );
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create/Update papers store
        let papersStore;
        if (!db.objectStoreNames.contains(STORES.PAPERS)) {
          papersStore = db.createObjectStore(STORES.PAPERS, { keyPath: 'id' });
        } else {
          papersStore = request.transaction!.objectStore(STORES.PAPERS);
        }

        if (!papersStore.indexNames.contains('classLevel')) {
          papersStore.createIndex('classLevel', 'classLevel', { unique: false });
        }
        if (!papersStore.indexNames.contains('subject')) {
          papersStore.createIndex('subject', 'subject', { unique: false });
        }
        if (!papersStore.indexNames.contains('year')) {
          papersStore.createIndex('year', 'year', { unique: false });
        }
        if (!papersStore.indexNames.contains('lastFetched')) {
          papersStore.createIndex('lastFetched', 'lastFetched', { unique: false });
        }

        // Create downloads store
        if (!db.objectStoreNames.contains(STORES.DOWNLOADS)) {
          db.createObjectStore(STORES.DOWNLOADS, { keyPath: 'id' });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Cache papers metadata
   */
  async cachePapers(papers: ExamPaper[]): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction([STORES.PAPERS, STORES.DOWNLOADS], 'readwrite');
    const store = transaction.objectStore(STORES.PAPERS);
    const now = new Date().toISOString();

    for (const paper of papers) {
      const cachedPaper: CachedPaper = {
        id: paper.id,
        title: paper.title,
        subject: paper.subject,
        classLevel: paper.classLevel,
        year: paper.year,
        examType: paper.examType,
        session: paper.session,
        fileSize: paper.fileSize,
        fileSizeFormatted: paper.fileSizeFormatted,
        uploadDate: paper.uploadDate.toDate().toISOString(),
        downloads: paper.downloads,
        tags: paper.tags,
        description: paper.description,
        preview_url: paper.preview_url,
        isDownloaded: false,
        lastFetched: now
      };

      // Check if paper is already downloaded
      const downloadStore = transaction.objectStore(STORES.DOWNLOADS);
      const downloadRequest = downloadStore.get(paper.id);

      await new Promise<void>((resolve) => {
        downloadRequest.onsuccess = () => {
          if (downloadRequest.result) {
            cachedPaper.isDownloaded = true;
            cachedPaper.localPath = downloadRequest.result.localPath;
            cachedPaper.downloadedAt = downloadRequest.result.downloadedAt;
          }
          store.put(cachedPaper);
          resolve();
        };
      });
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get cached papers
   */
  async getCachedPapers(): Promise<CachedPaper[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PAPERS], 'readonly');
      const store = transaction.objectStore(STORES.PAPERS);
      const request = store.getAll();

      request.onsuccess = () => {
        const papers = request.result || [];
        const downloadedCount = papers.filter(p => p.isDownloaded).length;
        console.log('📦 getCachedPapers:', {
          total: papers.length,
          downloaded: downloadedCount,
          downloadedPapers: papers.filter(p => p.isDownloaded).map(p => ({
            id: p.id,
            title: p.title,
            isDownloaded: p.isDownloaded,
            localPath: p.localPath
          }))
        });
        resolve(papers);
      };
      request.onerror = () => {
        console.error('❌ getCachedPapers error:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Update paper download status
   */
  async updateDownloadStatus(paperId: string, status: boolean, localPath?: string): Promise<void> {
    if (!this.db) await this.init();

    console.log('🔄 CacheService.updateDownloadStatus called:', { paperId, status, localPath });

    const transaction = this.db!.transaction([STORES.PAPERS, STORES.DOWNLOADS], 'readwrite');
    const papersStore = transaction.objectStore(STORES.PAPERS);
    const downloadsStore = transaction.objectStore(STORES.DOWNLOADS);

    // Update paper
    const paperRequest = papersStore.get(paperId);

    return new Promise((resolve, reject) => {
      paperRequest.onsuccess = () => {
        const paper = paperRequest.result as CachedPaper;
        console.log('📄 Found paper in cache:', paper);
        
        if (paper) {
          paper.isDownloaded = status;
          if (status && localPath) {
            paper.localPath = localPath;
            paper.downloadedAt = new Date().toISOString();
            console.log('✅ Setting paper as downloaded:', { id: paper.id, localPath, downloadedAt: paper.downloadedAt });
          } else {
            delete paper.localPath;
            delete paper.downloadedAt;
            console.log('❌ Setting paper as NOT downloaded:', paper.id);
          }
          papersStore.put(paper);
          console.log('💾 Paper updated in papers store');
        } else {
          console.warn('⚠️ Paper not found in cache:', paperId);
        }

        // Update downloads store
        if (status && localPath) {
          const downloadedPaper: DownloadedPaper = {
            id: paperId,
            paperId,
            localPath,
            downloadedAt: new Date().toISOString(),
            fileSize: paper?.fileSize || 0
          };
          downloadsStore.put(downloadedPaper);
          console.log('💾 Download record created in downloads store:', downloadedPaper);
        } else {
          downloadsStore.delete(paperId);
          console.log('🗑️ Download record deleted from downloads store');
        }

        transaction.oncomplete = () => {
          console.log('✅ Transaction completed successfully');
          resolve();
        };
        transaction.onerror = () => {
          console.error('❌ Transaction error:', transaction.error);
          reject(transaction.error);
        };
      };

      paperRequest.onerror = () => {
        console.error('❌ Paper request error:', paperRequest.error);
        reject(paperRequest.error);
      };
    });
  }

  /**
   * Update local thumbnail path for a downloaded paper
   */
  async updateThumbnailPath(paperId: string, localThumbnailPath: string): Promise<void> {
    if (!this.db) await this.init();
    const transaction = this.db!.transaction([STORES.PAPERS], 'readwrite');
    const store = transaction.objectStore(STORES.PAPERS);
    const request = store.get(paperId);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const paper = request.result as CachedPaper;
        if (paper) {
          paper.localThumbnailPath = localThumbnailPath;
          store.put(paper);
        }
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save filter state
   */
  async saveFilterState(filters: FilterCriteria): Promise<void> {
    if (!this.db) await this.init();

    const metadata: CacheMetadata = {
      key: 'filterState',
      value: filters,
      updatedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.METADATA], 'readwrite');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.put(metadata);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get saved filter state
   */
  async getFilterState(): Promise<FilterCriteria | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.METADATA], 'readonly');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.get('filterState');

      request.onsuccess = () => {
        const result = request.result as CacheMetadata | undefined;
        resolve(result?.value || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear expired cache (older than 24 hours)
   * This implements the 24-hour cache invalidation strategy
   */
  async clearExpiredCache(): Promise<void> {
    if (!this.db) await this.init();

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PAPERS], 'readwrite');
      const store = transaction.objectStore(STORES.PAPERS);
      const index = store.index('lastFetched');
      const range = IDBKeyRange.upperBound(twentyFourHoursAgo);
      const request = index.openCursor(range);

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const paper = cursor.value as CachedPaper;
          // Only delete if not downloaded (preserve downloaded papers)
          if (!paper.isDownloaded) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        if (deletedCount > 0) {
          console.log(`Cache cleanup: Removed ${deletedCount} expired papers`);
        }
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get all downloaded papers
   */
  async getDownloadedPapers(): Promise<DownloadedPaper[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.DOWNLOADS], 'readonly');
      const store = transaction.objectStore(STORES.DOWNLOADS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PAPERS, STORES.DOWNLOADS, STORES.METADATA], 'readwrite');

      transaction.objectStore(STORES.PAPERS).clear();
      transaction.objectStore(STORES.DOWNLOADS).clear();
      transaction.objectStore(STORES.METADATA).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const cacheService = new CacheService();
