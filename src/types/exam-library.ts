import { z } from 'zod';

// Type unions
export type ClassLevel =
  | "6ème" | "5ème" | "4ème" | "3ème"
  | "2nde"
  | "2nde A4" | "2nde CD" | "2nde E" | "2nde F" | "2nde G"
  | "1ère" | "1ère A4" | "1ère C" | "1ère D" | "1ère E" | "1ère F" | "1ère G"
  | "Tle"  | "Tle A4"  | "Tle C"  | "Tle D"  | "Tle E"  | "Tle F"  | "Tle G";

export type ExamType = "Baccalauréat" | "Composition" | "Devoir" | "Interro" | "midterm" | "Practice" | "Revision";

export type Session = "1st Semester" | "2nd Semester" | "Annual" | "term1" | "term2" | "term3" | "Regular";

// Main exam paper interface (Supabase row)
export interface ExamPaper {
  id: string;
  title: string;
  subject: string;
  classLevel: ClassLevel;
  year: number;
  examType: ExamType;
  session: Session;
  system: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileSizeFormatted: string;
  contentHash: string;
  uploadDate: string; // ISO string from Supabase
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
  lastUpdated: string; // ISO string
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
  lastUpdated: string; // ISO string
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
  "6ème", "5ème", "4ème", "3ème",
  "2nde", "2nde A4", "2nde CD", "2nde E", "2nde F", "2nde G",
  "1ère", "1ère A4", "1ère C", "1ère D", "1ère E", "1ère F", "1ère G",
  "Tle",  "Tle A4",  "Tle C",  "Tle D",  "Tle E",  "Tle F",  "Tle G",
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

// ===== BOOK-RELATED TYPES =====

// Main library book interface (Supabase row)
export interface LibraryBook {
  id: string;
  title: string;
  author: string | null;
  subject: string;
  category: string;
  system: string;
  class_level: string | null;
  description: string | null;
  cover_url: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  file_size_formatted: string;
  tags: string[];
  downloads: number;
  published_year: number | null;
  created_at: string;
}

// Cached book interface (IndexedDB)
export interface CachedBook {
  id: string;
  title: string;
  author: string | null;
  subject: string;
  category: string;
  fileSize: number;
  fileSizeFormatted: string;
  tags: string[];
  downloads: number;
  publishedYear: number | null;
  isDownloaded: boolean;
  localPath?: string;
  downloadedAt?: string;
  lastFetched: string;
}

// Downloaded book interface (IndexedDB)
export interface DownloadedBook {
  id: string;
  bookId: string;
  localPath: string;
  downloadedAt: string;
  fileSize: number;
  title: string;
  author: string | null;
  subject: string;
  category: string;
}

// Book filter criteria
export interface BookFilterCriteria {
  category?: string;
  subject?: string;
  system?: string;
  classLevel?: string;
}

// ===== UNIFIED DOWNLOAD TYPES =====

// Enhanced download progress supporting both papers and books
export interface UnifiedDownloadProgress {
  itemId: string;
  itemType: 'paper' | 'book';
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
  status: 'downloading' | 'completed' | 'failed' | 'cancelled';
}

// Download status for UI components
export interface DownloadStatus {
  isDownloaded: boolean;
  isDownloading: boolean;
  localPath?: string;
}

// Unified download item for bulk operations
export type DownloadItem = {
  id: string;
  type: 'paper';
  data: CachedPaper;
} | {
  id: string;
  type: 'book';
  data: CachedBook;
};

// ===== VALIDATION SCHEMAS =====

export const LibraryBookMetadataSchema = z.object({
  title: z.string().min(3).max(200),
  author: z.string().max(100).optional(),
  subject: z.string().min(2).max(100),
  category: z.string().min(2).max(50),
  system: z.string().min(2).max(20),
  class_level: z.string().max(20).optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).max(10),
  published_year: z.number().min(1900).max(2100).optional()
});

// Helper type for creating new books (without auto-generated fields)
export type NewLibraryBook = Omit<LibraryBook, 'id' | 'created_at' | 'downloads' | 'file_size_formatted'>;
