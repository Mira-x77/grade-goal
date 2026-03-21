import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService, validatePaperMetadata, validatePDFFile } from './adminService';
import * as firestore from 'firebase/firestore';
import * as storage from 'firebase/storage';
import { ExamPaper } from '@/types/exam-library';

// Mock Firebase modules
vi.mock('firebase/firestore');
vi.mock('firebase/storage');
vi.mock('@/lib/firebase', () => ({
  db: {},
  storage: {}
}));
vi.mock('@/lib/integrity', () => ({
  calculateFileHash: vi.fn().mockResolvedValue('mock-hash-123'),
  formatBytes: vi.fn((bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`)
}));

describe('AdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validatePaperMetadata', () => {
    it('should validate correct metadata', () => {
      const validMetadata = {
        title: 'Baccalauréat Mathématiques 2023',
        subject: 'Mathématiques',
        classLevel: 'Terminale D',
        year: 2023,
        examType: 'Baccalauréat',
        session: '1st Semester',
        tags: ['algebra', 'geometry'],
        description: 'Test description'
      };

      const result = validatePaperMetadata(validMetadata);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject metadata with missing required fields', () => {
      const invalidMetadata = {
        title: 'Test',
        // missing subject
        classLevel: 'Terminale D',
        year: 2023,
        examType: 'Baccalauréat',
        session: '1st Semester',
        tags: []
      };

      const result = validatePaperMetadata(invalidMetadata);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject metadata with invalid year', () => {
      const invalidMetadata = {
        title: 'Test Paper',
        subject: 'Math',
        classLevel: 'Terminale D',
        year: 1999, // too old
        examType: 'Baccalauréat',
        session: '1st Semester',
        tags: []
      };

      const result = validatePaperMetadata(invalidMetadata);
      expect(result.valid).toBe(false);
    });

    it('should reject metadata with too many tags', () => {
      const invalidMetadata = {
        title: 'Test Paper',
        subject: 'Math',
        classLevel: 'Terminale D',
        year: 2023,
        examType: 'Baccalauréat',
        session: '1st Semester',
        tags: Array(11).fill('tag') // more than 10 tags
      };

      const result = validatePaperMetadata(invalidMetadata);
      expect(result.valid).toBe(false);
    });
  });

  describe('validatePDFFile', () => {
    it('should validate correct PDF file', () => {
      const validFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }); // 1MB

      const result = validatePDFFile(validFile);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-PDF files', () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });

      const result = validatePDFFile(invalidFile);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File must be a PDF');
    });

    it('should reject files larger than 50MB', () => {
      const largeFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(largeFile, 'size', { value: 51 * 1024 * 1024 }); // 51MB

      const result = validatePDFFile(largeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File size must be less than 50MB');
    });
  });

  describe('uploadPDF', () => {
    it('should upload PDF and return download URL', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 });

      const mockMetadata = {
        title: 'Test Paper',
        subject: 'Mathematics',
        classLevel: 'Terminale D' as const,
        year: 2023,
        examType: 'Baccalauréat' as const,
        session: '1st Semester' as const,
        tags: ['test']
      };

      const mockDownloadURL = 'https://storage.example.com/test.pdf';

      vi.mocked(storage.ref).mockReturnValue({} as any);
      vi.mocked(storage.uploadBytes).mockResolvedValue({} as any);
      vi.mocked(storage.getDownloadURL).mockResolvedValue(mockDownloadURL);

      const result = await adminService.uploadPDF(mockFile, mockMetadata);

      expect(result).toBe(mockDownloadURL);
      expect(storage.uploadBytes).toHaveBeenCalled();
      expect(storage.getDownloadURL).toHaveBeenCalled();
    });

    it('should reject invalid file', async () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });

      const mockMetadata = {
        title: 'Test Paper',
        subject: 'Mathematics',
        classLevel: 'Terminale D' as const,
        year: 2023,
        examType: 'Baccalauréat' as const,
        session: '1st Semester' as const,
        tags: []
      };

      await expect(adminService.uploadPDF(invalidFile, mockMetadata)).rejects.toThrow('File must be a PDF');
    });
  });

  describe('createPaper', () => {
    it('should create paper document in Firestore', async () => {
      const mockPaper = {
        title: 'Test Paper',
        subject: 'Mathematics',
        classLevel: 'Terminale D' as const,
        year: 2023,
        examType: 'Baccalauréat' as const,
        session: '1st Semester' as const,
        fileUrl: 'https://example.com/test.pdf',
        fileName: 'test.pdf',
        fileSize: 1024 * 1024,
        contentHash: 'hash123',
        tags: ['test']
      };

      const mockDocRef = { id: 'mock-id' };
      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);
      vi.mocked(firestore.getDocs).mockResolvedValue({ size: 1, forEach: vi.fn() } as any);

      const result = await adminService.createPaper(mockPaper);

      expect(result).toBe('mock-id');
      expect(firestore.setDoc).toHaveBeenCalled();
    });
  });

  describe('updatePaper', () => {
    it('should update paper metadata', async () => {
      const paperId = 'test-paper-id';
      const updates = {
        title: 'Updated Title',
        description: 'Updated description'
      };

      const mockDocRef = {};
      const mockDocSnap = { exists: () => true, data: () => ({}) };

      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      await adminService.updatePaper(paperId, updates);

      expect(firestore.updateDoc).toHaveBeenCalledWith(mockDocRef, updates);
    });

    it('should throw error if paper not found', async () => {
      const paperId = 'non-existent-id';
      const updates = { title: 'Updated Title' };

      const mockDocSnap = { exists: () => false };
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      await expect(adminService.updatePaper(paperId, updates)).rejects.toThrow('Paper not found');
    });
  });

  describe('deletePaper', () => {
    it('should delete paper from both Storage and Firestore', async () => {
      const paperId = 'test-paper-id';
      const mockPaperData = {
        fileUrl: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/exam-papers%2Ftest.pdf?alt=media',
        fileSize: 1024,
        classLevel: 'Terminale D',
        subject: 'Mathematics',
        year: 2023,
        fileName: 'test.pdf'
      };

      const mockDocRef = {};
      const mockDocSnap = { 
        exists: () => true, 
        data: () => mockPaperData 
      };

      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined);
      vi.mocked(storage.ref).mockReturnValue({} as any);
      vi.mocked(storage.deleteObject).mockResolvedValue(undefined);
      vi.mocked(firestore.getDocs).mockResolvedValue({ size: 0, forEach: vi.fn() } as any);

      await adminService.deletePaper(paperId);

      expect(storage.deleteObject).toHaveBeenCalled();
      expect(firestore.deleteDoc).toHaveBeenCalledWith(mockDocRef);
    });

    it('should throw error if paper not found', async () => {
      const paperId = 'non-existent-id';
      const mockDocSnap = { exists: () => false };

      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      await expect(adminService.deletePaper(paperId)).rejects.toThrow('Paper not found');
    });

    it('should not delete from Firestore if Storage deletion fails (atomic operation)', async () => {
      const paperId = 'test-paper-id';
      const mockPaperData = {
        fileUrl: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/exam-papers%2Ftest.pdf?alt=media',
        fileSize: 1024,
        classLevel: 'Terminale D',
        subject: 'Mathematics',
        year: 2023,
        fileName: 'test.pdf'
      };

      const mockDocRef = {};
      const mockDocSnap = { 
        exists: () => true, 
        data: () => mockPaperData 
      };

      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);
      vi.mocked(storage.ref).mockReturnValue({} as any);
      vi.mocked(storage.deleteObject).mockRejectedValue(new Error('Storage deletion failed'));

      await expect(adminService.deletePaper(paperId)).rejects.toThrow('Storage deletion failed');
      
      // Verify Firestore deletion was NOT called
      expect(firestore.deleteDoc).not.toHaveBeenCalled();
    });

    it('should update analytics after successful deletion', async () => {
      const paperId = 'test-paper-id';
      const mockPaperData = {
        fileUrl: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/exam-papers%2Ftest.pdf?alt=media',
        fileSize: 1024,
        classLevel: 'Terminale D',
        subject: 'Mathematics',
        year: 2023,
        fileName: 'test.pdf'
      };

      const mockDocRef = {};
      const mockDocSnap = { 
        exists: () => true, 
        data: () => mockPaperData 
      };

      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined);
      vi.mocked(storage.ref).mockReturnValue({} as any);
      vi.mocked(storage.deleteObject).mockResolvedValue(undefined);
      vi.mocked(firestore.getDocs).mockResolvedValue({ 
        size: 5, 
        forEach: vi.fn((callback) => {
          // Simulate 5 papers with total size
          for (let i = 0; i < 5; i++) {
            callback({ data: () => ({ fileSize: 1000 }) });
          }
        })
      } as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      await adminService.deletePaper(paperId);

      // Verify analytics update was called
      expect(firestore.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'storage',
          totalFiles: 5,
          totalSizeBytes: 5000
        })
      );
    });
  });

  describe('getStorageAnalytics', () => {
    it('should return storage analytics', async () => {
      const mockAnalytics = {
        id: 'storage',
        totalFiles: 10,
        totalSizeBytes: 1024 * 1024 * 100,
        lastUpdated: { seconds: Date.now() / 1000 }
      };

      const mockDocSnap = {
        exists: () => true,
        data: () => mockAnalytics
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await adminService.getStorageAnalytics();

      expect(result).toEqual(mockAnalytics);
    });
  });

  describe('getDownloadAnalytics', () => {
    it('should return download analytics', async () => {
      const mockAnalytics = {
        id: 'downloads',
        totalDownloads: 500,
        downloadsBySubject: { Mathematics: 200, Physics: 150 },
        topPapers: [],
        lastUpdated: { seconds: Date.now() / 1000 }
      };

      const mockDocSnap = {
        exists: () => true,
        data: () => mockAnalytics
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await adminService.getDownloadAnalytics();

      expect(result).toEqual(mockAnalytics);
    });
  });

  describe('getBandwidthUsage', () => {
    it('should return bandwidth usage for date', async () => {
      const date = '2024-01-15';
      const mockBandwidth = {
        id: `bandwidth-${date}`,
        date,
        bytesTransferred: 1024 * 1024 * 50,
        downloadCount: 25
      };

      const mockDocSnap = {
        exists: () => true,
        data: () => mockBandwidth
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await adminService.getBandwidthUsage(date);

      expect(result).toEqual(mockBandwidth);
    });

    it('should return empty analytics if no data exists', async () => {
      const date = '2024-01-15';
      const mockDocSnap = { exists: () => false };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await adminService.getBandwidthUsage(date);

      expect(result).toEqual({
        id: `bandwidth-${date}`,
        date,
        bytesTransferred: 0,
        downloadCount: 0
      });
    });
  });
});
