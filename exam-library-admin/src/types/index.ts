// Type for timestamp that works with both Firebase and Supabase
export interface TimestampLike {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
}

export type ClassLevel =
  | "6ème" | "5ème" | "4ème" | "3ème"
  | "2nde" | "2nde A4" | "2nde CD" | "2nde E" | "2nde F" | "2nde G"
  | "1ère" | "1ère A4" | "1ère C"  | "1ère D" | "1ère E" | "1ère F" | "1ère G"
  | "Tle"  | "Tle A4"  | "Tle C"   | "Tle D"  | "Tle E"  | "Tle F"  | "Tle G"
  | "CEPD" | "CAP" | "Primaire"
  | "CP1" | "CP2" | "CE1" | "CE2" | "CM1" | "CM2"
  | "Autre";

export type AcademicSystem = "apc" | "french" | "english";

export type ExamType = "Baccalauréat" | "Probatoire" | "BEPC" | "CEPD" | "CAP" | "Concours" | "Annales" | "Composition" | "Devoir" | "Interro" | "Exercices";

export type Session = "1st Semester" | "2nd Semester" | "Annual" | "1er Trimestre" | "2ème Trimestre" | "3ème Trimestre" | "Annuel" | "term1" | "term2" | "term3" | "Regular";

export interface ExamPaper {
  id: string;
  title: string;
  subject: string;
  classLevel: ClassLevel;
  year: number;
  examType: ExamType;
  session: Session;
  system: AcademicSystem;
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
  /** Multi-value companions of classLevel/subject (comma-joined scalars). */
  classLevels?: string[];
  subjects?: string[];
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
