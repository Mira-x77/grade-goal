// Type for timestamp that works with both Firebase and Supabase
export interface TimestampLike {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
}

export type ClassLevel =
  | "Sixième" | "Cinquième" | "Quatrième" | "Troisième"  // Collège
  | "Seconde"  // Lycée without series
  | "Première" | "Première A" | "Première C" | "Première D" | "Première E"  // Première with/without series
  | "Terminale" | "Terminale A" | "Terminale C" | "Terminale D" | "Terminale E";  // Terminale with/without series

export type ExamType = "Baccalauréat" | "Probatoire" | "BEPC" | "Composition" | "Devoir" | "Interro" | "midterm" | "Practice" | "Revision";

export type Session = "1st Semester" | "2nd Semester" | "Annual" | "1er Trimestre" | "2ème Trimestre" | "3ème Trimestre" | "Annuel" | "term1" | "term2" | "term3" | "Regular";

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
  uploadDate: TimestampLike | Date | string;
  downloads: number;
  tags: string[];
  description?: string;
  previewUrl?: string;
}

export interface StorageAnalytics {
  id: 'storage';
  totalFiles: number;
  totalSizeBytes: number;
  lastUpdated: Date | string;
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
  lastUpdated: Date | string;
}

export interface BandwidthAnalytics {
  id: string;
  date: string;
  bytesTransferred: number;
  downloadCount: number;
}
