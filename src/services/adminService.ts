import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { storageAdapter } from '@/lib/storage-adapter';
import { 
  ExamPaper, 
  NewExamPaper, 
  StorageAnalytics, 
  DownloadAnalytics, 
  BandwidthAnalytics,
  ExamPaperMetadataSchema,
  PDFFileSchema
} from '@/types/exam-library';
import { calculateFileHash, formatBytes } from '@/lib/integrity';
import { validatePDFFile as validatePDF, handleFirebaseError } from '@/lib/error-handling';

const PAPERS_COLLECTION = 'examPapers';
const ANALYTICS_COLLECTION = 'analytics';

/**
 * Validation helper for paper metadata
 */
export function validatePaperMetadata(data: unknown): { valid: boolean; errors?: string[] } {
  try {
    ExamPaperMetadataSchema.parse(data);
    return { valid: true };
  } catch (error: any) {
    const errors = error.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`) || ['Invalid metadata'];
    return { valid: false, errors };
  }
}

/**
 * Validation helper for PDF files
 * Re-export from error-handling for backward compatibility
 */
export { validatePDF as validatePDFFile };

class AdminService {
  /**
   * Upload PDF to Firebase Storage
   * Returns storage URL
   */
  async uploadPDF(
    file: File,
    metadata: Omit<ExamPaper, 'id' | 'fileUrl' | 'fileName' | 'fileSize' | 'fileSizeFormatted' | 'contentHash' | 'uploadDate' | 'downloads'>
  ): Promise<string> {
    // Validate file
    const fileValidation = validatePDF(file);
    if (!fileValidation.valid) {
      throw new Error(fileValidation.error);
    }

    // Validate metadata
    const metadataValidation = validatePaperMetadata(metadata);
    if (!metadataValidation.valid) {
      throw new Error(`Invalid metadata: ${metadataValidation.errors?.join(', ')}`);
    }

    // Generate storage path: /exam-papers/{classLevel}/{subject}/{year}/{fileName}
    const sanitizedClassLevel = metadata.classLevel.replace(/\s+/g, '-');
    const sanitizedSubject = metadata.subject.replace(/\s+/g, '-');
    const sanitizedFileName = file.name.replace(/\s+/g, '-');
    
    const storagePath = `exam-papers/${sanitizedClassLevel}/${sanitizedSubject}/${metadata.year}/${sanitizedFileName}`;

    // Upload file using storage adapter
    const downloadURL = await storageAdapter.uploadFile(storagePath, file);

    return downloadURL;
  }

  /**
   * Create exam paper document in Firestore
   */
  async createPaper(paper: NewExamPaper): Promise<string> {
    // Validate metadata
    const metadataValidation = validatePaperMetadata({
      title: paper.title,
      subject: paper.subject,
      classLevel: paper.classLevel,
      year: paper.year,
      examType: paper.examType,
      session: paper.session,
      tags: paper.tags,
      description: paper.description
    });
    
    if (!metadataValidation.valid) {
      throw new Error(`Invalid metadata: ${metadataValidation.errors?.join(', ')}`);
    }

    // Create new document with auto-generated ID
    const paperRef = doc(collection(db, PAPERS_COLLECTION));
    
    const paperData = {
      ...paper,
      fileSizeFormatted: formatBytes(paper.fileSize),
      uploadDate: serverTimestamp(),
      downloads: 0
    };

    await setDoc(paperRef, paperData);

    // Update storage analytics
    await this.updateStorageAnalytics();

    return paperRef.id;
  }

  /**
   * Update paper metadata
   */
  async updatePaper(
    paperId: string, 
    updates: Partial<Pick<ExamPaper, 'title' | 'subject' | 'classLevel' | 'year' | 'examType' | 'session' | 'tags' | 'description'>>
  ): Promise<void> {
    // Validate updates if metadata fields are present
    if (Object.keys(updates).length > 0) {
      const metadataValidation = validatePaperMetadata({
        title: updates.title || 'Valid Title',
        subject: updates.subject || 'Valid Subject',
        classLevel: updates.classLevel || 'Terminale D',
        year: updates.year || 2024,
        examType: updates.examType || 'Baccalauréat',
        session: updates.session || '1st Semester',
        tags: updates.tags || [],
        description: updates.description
      });
      
      if (!metadataValidation.valid) {
        throw new Error(`Invalid metadata: ${metadataValidation.errors?.join(', ')}`);
      }
    }

    const paperRef = doc(db, PAPERS_COLLECTION, paperId);
    
    // Verify paper exists
    const paperDoc = await getDoc(paperRef);
    if (!paperDoc.exists()) {
      throw new Error('Paper not found');
    }

    await updateDoc(paperRef, updates);
  }

  /**
   * Delete paper (both Firestore and Storage)
   */
  async deletePaper(paperId: string): Promise<void> {
      // Get paper document to retrieve storage path
      const paperRef = doc(db, PAPERS_COLLECTION, paperId);
      const paperDoc = await getDoc(paperRef);

      if (!paperDoc.exists()) {
        throw new Error('Paper not found');
      }

      const paperData = paperDoc.data() as ExamPaper;

      // Delete from storage using adapter - must succeed before Firestore deletion
      const storagePath = this.extractStoragePath(paperData.fileUrl);
      await storageAdapter.deleteFile(storagePath);

      // Delete from Firestore only after storage deletion succeeds
      await deleteDoc(paperRef);

      // Update storage analytics
      await this.updateStorageAnalytics();
    }


  /**
   * Get storage analytics
   */
  async getStorageAnalytics(): Promise<StorageAnalytics> {
    const analyticsRef = doc(db, ANALYTICS_COLLECTION, 'storage');
    const analyticsDoc = await getDoc(analyticsRef);
    
    if (!analyticsDoc.exists()) {
      // Initialize if doesn't exist
      await this.updateStorageAnalytics();
      const newDoc = await getDoc(analyticsRef);
      return newDoc.data() as StorageAnalytics;
    }
    
    return analyticsDoc.data() as StorageAnalytics;
  }

  /**
   * Get download analytics
   */
  async getDownloadAnalytics(): Promise<DownloadAnalytics> {
    const analyticsRef = doc(db, ANALYTICS_COLLECTION, 'downloads');
    const analyticsDoc = await getDoc(analyticsRef);
    
    if (!analyticsDoc.exists()) {
      // Initialize with default values
      const defaultAnalytics: DownloadAnalytics = {
        id: 'downloads',
        totalDownloads: 0,
        downloadsBySubject: {},
        topPapers: [],
        lastUpdated: Timestamp.now()
      };
      
      await setDoc(analyticsRef, defaultAnalytics);
      return defaultAnalytics;
    }
    
    return analyticsDoc.data() as DownloadAnalytics;
  }

  /**
   * Get bandwidth usage for date
   */
  async getBandwidthUsage(date: string): Promise<BandwidthAnalytics> {
    const bandwidthRef = doc(db, ANALYTICS_COLLECTION, `bandwidth-${date}`);
    const bandwidthDoc = await getDoc(bandwidthRef);
    
    if (!bandwidthDoc.exists()) {
      // Return empty analytics for date
      return {
        id: `bandwidth-${date}`,
        date,
        bytesTransferred: 0,
        downloadCount: 0
      };
    }
    
    return bandwidthDoc.data() as BandwidthAnalytics;
  }

  /**
   * Get single paper by ID
   */
  async getPaper(paperId: string): Promise<ExamPaper | null> {
    const paperRef = doc(db, PAPERS_COLLECTION, paperId);
    const paperDoc = await getDoc(paperRef);
    
    if (!paperDoc.exists()) {
      return null;
    }

    const data = paperDoc.data();
    return {
      id: paperDoc.id,
      ...data,
      fileSizeFormatted: formatBytes(data.fileSize)
    } as ExamPaper;
  }

  /**
   * Update storage analytics
   * Called after upload or delete
   */
  private async updateStorageAnalytics(): Promise<void> {
    const papers = await getDocs(collection(db, PAPERS_COLLECTION));
    
    let totalSize = 0;
    papers.forEach(doc => {
      const data = doc.data();
      totalSize += data.fileSize || 0;
    });
    
    const analyticsRef = doc(db, ANALYTICS_COLLECTION, 'storage');
    await setDoc(analyticsRef, {
      id: 'storage',
      totalFiles: papers.size,
      totalSizeBytes: totalSize,
      lastUpdated: serverTimestamp()
    });
  }

  /**
   * Update top papers list
   * Run periodically or after threshold downloads
   */
  async updateTopPapers(): Promise<void> {
    // Get all papers and sort by downloads
    const papersSnapshot = await getDocs(collection(db, PAPERS_COLLECTION));
    const papers = papersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ExamPaper[];

    // Sort by downloads descending and take top 10
    const topPapers = papers
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 10)
      .map(paper => ({
        paperId: paper.id,
        title: paper.title,
        downloads: paper.downloads
      }));

    // Update analytics document
    const analyticsRef = doc(db, ANALYTICS_COLLECTION, 'downloads');
    await updateDoc(analyticsRef, {
      topPapers,
      lastUpdated: serverTimestamp()
    });
  }

  /**
   * Extract storage path from URL
   * Handles both Firebase Storage URLs and R2 URLs
   */
  private extractStoragePath(fileUrl: string): string {
    try {
      const url = new URL(fileUrl);
      
      // Firebase Storage URL format
      if (url.hostname.includes('firebasestorage.googleapis.com')) {
        const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);
        if (pathMatch) {
          return decodeURIComponent(pathMatch[1]);
        }
      }
      
      // R2 or generic URL - extract path after domain
      const pathParts = url.pathname.split('/').filter(p => p);
      return pathParts.join('/');
    } catch (error) {
      // If URL parsing fails, assume it's already a path
      return fileUrl;
    }
  }
}

export const adminService = new AdminService();
