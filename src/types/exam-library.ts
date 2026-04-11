import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

// Type unions
export type ClassLevel =
  | "Sixième" | "Cinquième" | "Quatrième" | "Troisième"
  | "Seconde" 
  | "Première A" | "Première C" | "Première D" | "Première E"
  | "Terminale A" | "Terminale C" | "Terminale D" | "Terminale E";

export type ExamType = "Baccalauréat" | "Composition" | "Devoir" | "Interro" | "midterm" | "Practice" | "Revision";

export type Session = "1st Semester" | "2nd Semester" | "Annual" | "term1" | "term2" | "term3" | "Regular";

// Main exam paper interface (Firestore document)
export interface ExamPaper {
  id: string;
  title: string;
  subject: string;
  classLevel: ClassLevel;
  year: number;
  examType: ExamType;
  session: Session;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileSizeFormatted: string;
  contentHash: string;
  uploadDate: Timestamp;
  downloads: number;
  tags: string[];
  description?: string;
  preview_url?: string;
}

// Cached paper interface (IndexedDB)
export interface CachedPaper {
  id: string;
  title: string;
  subject: string;
  classLevel: ClassLevel;
  year: number;
  examType: ExamType;
  session: Session;
  fileSize: number;
  fileSizeFormatted: string;
  uploadDate: string;
  downloads: number;
  tags: string[];
  description?: string;
  preview_url?: string;
  isDownloaded: boolean;
  localPath?: string;
  localThumbnailPath?: string;
  downloadedAt?: string;
  lastFetched: string;
}

// Downloaded paper interface (IndexedDB)
export interface DownloadedPaper {
  id: string;
  paperId: string;
  localPath: string;
  downloadedAt: string;
  fileSize: number;
}

// Filter criteria
export interface FilterCriteria {
  classLevel?: ClassLevel;
  subject?: string;
  year?: number;
  examType?: ExamType;
}

// Download progress
export interface DownloadProgress {
  paperId: string;
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
  status: 'downloading' | 'completed' | 'failed' | 'cancelled';
}

// Analytics interfaces
export interface StorageAnalytics {
  id: 'storage';
  totalFiles: number;
  totalSizeBytes: number;
  lastUpdated: Timestamp;
}

export interface DownloadAnalytics {
  id: 'downloads';
  totalDownloads: number;
  downloadsBySubject: Record<string, number>;
  topPapers: Array<{
    paperId: string;
    title: string;
    downloads: number;
  }>;
  lastUpdated: Timestamp;
}

export interface BandwidthAnalytics {
  id: string;
  date: string;
  bytesTransferred: number;
  downloadCount: number;
}

// Cache metadata
export interface CacheMetadata {
  key: string;
  value: unknown;
  updatedAt: string;
}

// Validation schemas
export const ClassLevelSchema = z.enum([
  "Sixième", "Cinquième", "Quatrième", "Troisième",
  "Seconde",
  "Première A", "Première C", "Première D", "Première E",
  "Terminale A", "Terminale C", "Terminale D", "Terminale E"
]);

export const ExamTypeSchema = z.enum(["Baccalauréat", "Composition", "Devoir", "Interro", "midterm", "Practice", "Revision"]);

export const SessionSchema = z.enum(["1st Semester", "2nd Semester", "Annual", "term1", "term2", "term3", "Regular"]);

export const ExamPaperMetadataSchema = z.object({
  title: z.string().min(3).max(200),
  subject: z.string().min(2).max(100),
  classLevel: ClassLevelSchema,
  year: z.number().min(2000).max(2100),
  examType: ExamTypeSchema,
  session: SessionSchema,
  tags: z.array(z.string()).max(10),
  description: z.string().max(1000).optional()
});

export const PDFFileSchema = z.object({
  type: z.literal('application/pdf'),
  size: z.number().max(50 * 1024 * 1024) // 50MB max
});

// Helper type for creating new papers (without auto-generated fields)
export type NewExamPaper = Omit<ExamPaper, 'id' | 'uploadDate' | 'downloads' | 'fileSizeFormatted'>;
