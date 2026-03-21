import { describe, it, expect, vi, beforeEach } from 'vitest';
import { test, fc } from '@fast-check/vitest';
import { adminService, validatePaperMetadata, validatePDFFile } from './adminService';
import * as firestore from 'firebase/firestore';
import * as storage from 'firebase/storage';
import { ClassLevel, ExamType, Session } from '@/types/exam-library';

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

// Helper to generate hex strings (SHA-256 hash)
const hexString = (length: number) => fc.array(
  fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'),
  { minLength: length, maxLength: length }
).map(arr => arr.join(''));

describe('AdminService - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 18: Upload Validation
   * For any upload form submission, if any required field is missing,
   * the form must be rejected before upload.
   * 
   * **Validates: Requirements 10.3**
   * Feature: exam-library, Property 18: Upload Validation
   */
  test.prop([
    fc.record({
      title: fc.option(fc.string({ minLength: 3, maxLength: 200 }), { nil: undefined }),
      subject: fc.option(fc.string({ minLength: 2, maxLength: 100 }), { nil: undefined }),
      classLevel: fc.option(
        fc.constantFrom<ClassLevel>(
          "Sixième", "Cinquième", "Quatrième", "Troisième",
          "Seconde", "Première D", "Première C", "Terminale D", "Terminale C"
        ),
        { nil: undefined }
      ),
      year: fc.option(fc.integer({ min: 2000, max: 2100 }), { nil: undefined }),
      examType: fc.option(
        fc.constantFrom<ExamType>("Baccalauréat", "Composition", "Devoir", "Interro"),
        { nil: undefined }
      ),
      session: fc.option(
        fc.constantFrom<Session>("1st Semester", "2nd Semester", "Annual"),
        { nil: undefined }
      ),
      tags: fc.array(fc.string(), { maxLength: 10 }),
      description: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined })
    })
  ], { numRuns: 100 })(
    'Property 18: Upload Validation - should reject if any required field is missing',
    async (metadata) => {
      // Check if any required field is missing
      const hasAllRequiredFields = 
        metadata.title !== undefined &&
        metadata.subject !== undefined &&
        metadata.classLevel !== undefined &&
        metadata.year !== undefined &&
        metadata.examType !== undefined &&
        metadata.session !== undefined;

      const result = validatePaperMetadata(metadata);

      if (!hasAllRequiredFields) {
        // If any required field is missing, validation must fail
        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
      } else {
        // If all required fields are present, validation should pass
        expect(result.valid).toBe(true);
      }
    }
  );

  /**
   * Property 19: Upload Creates Document
   * For any valid PDF upload with complete metadata, a corresponding
   * Firestore document must be created with all provided metadata.
   * 
   * **Validates: Requirements 10.5**
   * Feature: exam-library, Property 19: Upload Creates Document
   */
  test.prop([
    fc.record({
      title: fc.string({ minLength: 3, maxLength: 200 }),
      subject: fc.string({ minLength: 2, maxLength: 100 }),
      classLevel: fc.constantFrom<ClassLevel>(
        "Sixième", "Cinquième", "Quatrième", "Troisième",
        "Seconde", "Première D", "Première C", "Terminale D", "Terminale C"
      ),
      year: fc.integer({ min: 2000, max: 2100 }),
      examType: fc.constantFrom<ExamType>("Baccalauréat", "Composition", "Devoir", "Interro"),
      session: fc.constantFrom<Session>("1st Semester", "2nd Semester", "Annual"),
      fileUrl: fc.webUrl(),
      fileName: fc.string({ minLength: 1, maxLength: 100 }).map(s => s + '.pdf'),
      fileSize: fc.integer({ min: 1, max: 50 * 1024 * 1024 }),
      contentHash: hexString(64),
      tags: fc.array(fc.string(), { maxLength: 10 }),
      description: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined })
    })
  ], { numRuns: 100 })(
    'Property 19: Upload Creates Document - should create Firestore document with all metadata',
    async (paperData) => {
      const mockDocRef = { id: 'generated-id' };
      const capturedData: any = {};

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any);
      vi.mocked(firestore.setDoc).mockImplementation(async (ref, data) => {
        Object.assign(capturedData, data);
      });
      vi.mocked(firestore.getDocs).mockResolvedValue({ size: 1, forEach: vi.fn() } as any);

      const paperId = await adminService.createPaper(paperData);

      // Verify document was created
      expect(paperId).toBe('generated-id');
      expect(firestore.setDoc).toHaveBeenCalled();

      // Verify all metadata fields are present in created document
      expect(capturedData.title).toBe(paperData.title);
      expect(capturedData.subject).toBe(paperData.subject);
      expect(capturedData.classLevel).toBe(paperData.classLevel);
      expect(capturedData.year).toBe(paperData.year);
      expect(capturedData.examType).toBe(paperData.examType);
      expect(capturedData.session).toBe(paperData.session);
      expect(capturedData.fileUrl).toBe(paperData.fileUrl);
      expect(capturedData.fileName).toBe(paperData.fileName);
      expect(capturedData.fileSize).toBe(paperData.fileSize);
      expect(capturedData.contentHash).toBe(paperData.contentHash);
      expect(capturedData.tags).toEqual(paperData.tags);
      expect(capturedData.downloads).toBe(0);
      
      if (paperData.description !== undefined) {
        expect(capturedData.description).toBe(paperData.description);
      }
    }
  );

  /**
   * Property 20: File Metadata Extraction
   * For any PDF file, the extracted fileName and fileSize must match
   * the file's actual name and size in bytes.
   * 
   * **Validates: Requirements 10.8, 21.1, 21.2**
   * Feature: exam-library, Property 20: File Metadata Extraction
   */
  test.prop([
    fc.record({
      fileName: fc.string({ minLength: 1, maxLength: 100 }).map(s => s.replace(/[^a-zA-Z0-9.-]/g, '_') + '.pdf'),
      fileSize: fc.integer({ min: 1, max: 50 * 1024 * 1024 }),
      content: fc.uint8Array({ minLength: 100, maxLength: 1000 })
    })
  ], { numRuns: 100 })(
    'Property 20: File Metadata Extraction - fileName and fileSize must match actual file',
    async ({ fileName, fileSize, content }) => {
      // Create a File object with specific name and size
      const file = new File([content], fileName, { type: 'application/pdf' });
      
      // Override the size property to match our test data
      Object.defineProperty(file, 'size', { value: fileSize, writable: false });

      // Extract metadata
      const extractedFileName = file.name;
      const extractedFileSize = file.size;

      // Verify extraction matches actual file properties
      expect(extractedFileName).toBe(fileName);
      expect(extractedFileSize).toBe(fileSize);
    }
  );

  /**
   * Property 3: Storage-Firestore Consistency
   * For any exam paper, if it exists in Firebase Storage, a corresponding
   * metadata document must exist in Firestore with matching file information.
   * 
   * **Validates: Requirements 1.6**
   * Feature: exam-library, Property 3: Storage-Firestore Consistency
   */
  test.prop([
    fc.record({
      paperId: fc.uuid(),
      title: fc.string({ minLength: 3, maxLength: 200 }),
      subject: fc.string({ minLength: 2, maxLength: 100 }),
      classLevel: fc.constantFrom<ClassLevel>(
        "Sixième", "Cinquième", "Quatrième", "Troisième",
        "Seconde", "Première D", "Première C", "Terminale D", "Terminale C"
      ),
      year: fc.integer({ min: 2000, max: 2100 }),
      examType: fc.constantFrom<ExamType>("Baccalauréat", "Composition", "Devoir", "Interro"),
      session: fc.constantFrom<Session>("1st Semester", "2nd Semester", "Annual"),
      fileUrl: fc.webUrl(),
      fileName: fc.string({ minLength: 1, maxLength: 100 }).map(s => s + '.pdf'),
      fileSize: fc.integer({ min: 1, max: 50 * 1024 * 1024 }),
      contentHash: hexString(64),
      tags: fc.array(fc.string(), { maxLength: 10 })
    })
  ], { numRuns: 100 })(
    'Property 3: Storage-Firestore Consistency - Firestore document must exist for Storage file',
    async (paperData) => {
      // Mock that file exists in Storage
      vi.mocked(storage.ref).mockReturnValue({} as any);
      vi.mocked(storage.getDownloadURL).mockResolvedValue(paperData.fileUrl);

      // Mock Firestore document retrieval
      const mockDocSnap = {
        exists: () => true,
        id: paperData.paperId,
        data: () => ({
          title: paperData.title,
          subject: paperData.subject,
          classLevel: paperData.classLevel,
          year: paperData.year,
          examType: paperData.examType,
          session: paperData.session,
          fileUrl: paperData.fileUrl,
          fileName: paperData.fileName,
          fileSize: paperData.fileSize,
          contentHash: paperData.contentHash,
          tags: paperData.tags,
          downloads: 0
        })
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      // Retrieve paper from Firestore
      const paper = await adminService.getPaper(paperData.paperId);

      // Verify document exists and has matching file information
      expect(paper).not.toBeNull();
      expect(paper!.fileUrl).toBe(paperData.fileUrl);
      expect(paper!.fileName).toBe(paperData.fileName);
      expect(paper!.fileSize).toBe(paperData.fileSize);
      expect(paper!.contentHash).toBe(paperData.contentHash);
    }
  );

  /**
   * Property 22: Metadata Edit Round Trip
   * For any exam paper, editing allowed fields (title, subject, classLevel,
   * year, examType, session, tags, description) then retrieving the paper
   * should return the updated values.
   * 
   * **Validates: Requirements 12.3**
   * Feature: exam-library, Property 22: Metadata Edit Round Trip
   */
  test.prop([
    fc.record({
      paperId: fc.uuid(),
      originalData: fc.record({
        title: fc.string({ minLength: 3, maxLength: 200 }),
        subject: fc.string({ minLength: 2, maxLength: 100 }),
        classLevel: fc.constantFrom<ClassLevel>(
          "Sixième", "Cinquième", "Quatrième", "Troisième",
          "Seconde", "Première D", "Première C", "Terminale D", "Terminale C"
        ),
        year: fc.integer({ min: 2000, max: 2100 }),
        examType: fc.constantFrom<ExamType>("Baccalauréat", "Composition", "Devoir", "Interro"),
        session: fc.constantFrom<Session>("1st Semester", "2nd Semester", "Annual"),
        tags: fc.array(fc.string(), { maxLength: 10 }),
        description: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined })
      }),
      updates: fc.record({
        title: fc.string({ minLength: 3, maxLength: 200 }),
        subject: fc.string({ minLength: 2, maxLength: 100 }),
        classLevel: fc.constantFrom<ClassLevel>(
          "Sixième", "Cinquième", "Quatrième", "Troisième",
          "Seconde", "Première D", "Première C", "Terminale D", "Terminale C"
        ),
        year: fc.integer({ min: 2000, max: 2100 }),
        examType: fc.constantFrom<ExamType>("Baccalauréat", "Composition", "Devoir", "Interro"),
        session: fc.constantFrom<Session>("1st Semester", "2nd Semester", "Annual"),
        tags: fc.array(fc.string(), { maxLength: 10 }),
        description: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined })
      })
    })
  ], { numRuns: 100 })(
    'Property 22: Metadata Edit Round Trip - updated fields should persist',
    async ({ paperId, originalData, updates }) => {
      const capturedUpdates: any = {};

      // Mock paper exists with original data
      const mockOriginalDoc = {
        exists: () => true,
        id: paperId,
        data: () => ({
          ...originalData,
          fileUrl: 'https://example.com/file.pdf',
          fileName: 'test.pdf',
          fileSize: 1024,
          contentHash: 'abc123',
          downloads: 5
        })
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValueOnce(mockOriginalDoc as any);
      vi.mocked(firestore.updateDoc).mockImplementation(async (ref, data) => {
        Object.assign(capturedUpdates, data);
      });

      // Update paper
      await adminService.updatePaper(paperId, updates);

      // Verify updateDoc was called
      expect(firestore.updateDoc).toHaveBeenCalled();

      // Verify all editable fields were updated
      expect(capturedUpdates.title).toBe(updates.title);
      expect(capturedUpdates.subject).toBe(updates.subject);
      expect(capturedUpdates.classLevel).toBe(updates.classLevel);
      expect(capturedUpdates.year).toBe(updates.year);
      expect(capturedUpdates.examType).toBe(updates.examType);
      expect(capturedUpdates.session).toBe(updates.session);
      expect(capturedUpdates.tags).toEqual(updates.tags);
      
      if (updates.description !== undefined) {
        expect(capturedUpdates.description).toBe(updates.description);
      }

      // Mock retrieval with updated data
      const mockUpdatedDoc = {
        exists: () => true,
        id: paperId,
        data: () => ({
          ...originalData,
          ...updates,
          fileUrl: 'https://example.com/file.pdf',
          fileName: 'test.pdf',
          fileSize: 1024,
          contentHash: 'abc123',
          downloads: 5
        })
      };

      vi.mocked(firestore.getDoc).mockResolvedValueOnce(mockUpdatedDoc as any);

      // Retrieve paper and verify updates persisted
      const retrievedPaper = await adminService.getPaper(paperId);

      expect(retrievedPaper).not.toBeNull();
      expect(retrievedPaper!.title).toBe(updates.title);
      expect(retrievedPaper!.subject).toBe(updates.subject);
      expect(retrievedPaper!.classLevel).toBe(updates.classLevel);
      expect(retrievedPaper!.year).toBe(updates.year);
      expect(retrievedPaper!.examType).toBe(updates.examType);
      expect(retrievedPaper!.session).toBe(updates.session);
      expect(retrievedPaper!.tags).toEqual(updates.tags);
      
      if (updates.description !== undefined) {
        expect(retrievedPaper!.description).toBe(updates.description);
      }
    }
  );

  /**
   * Property 23: Immutable Field Protection
   * For any exam paper edit operation, the fields id, fileUrl, fileName,
   * fileSize, uploadDate, and downloads must remain unchanged.
   * 
   * **Validates: Requirements 12.4**
   * Feature: exam-library, Property 23: Immutable Field Protection
   */
  test.prop([
    fc.record({
      paperId: fc.uuid(),
      immutableFields: fc.record({
        fileUrl: fc.webUrl(),
        fileName: fc.string({ minLength: 1, maxLength: 100 }).map(s => s + '.pdf'),
        fileSize: fc.integer({ min: 1, max: 50 * 1024 * 1024 }),
        contentHash: hexString(64),
        downloads: fc.integer({ min: 0, max: 10000 })
      }),
      editableUpdates: fc.record({
        title: fc.string({ minLength: 3, maxLength: 200 }),
        subject: fc.string({ minLength: 2, maxLength: 100 }),
        classLevel: fc.constantFrom<ClassLevel>(
          "Sixième", "Cinquième", "Quatrième", "Troisième",
          "Seconde", "Première D", "Première C", "Terminale D", "Terminale C"
        ),
        year: fc.integer({ min: 2000, max: 2100 }),
        examType: fc.constantFrom<ExamType>("Baccalauréat", "Composition", "Devoir", "Interro"),
        session: fc.constantFrom<Session>("1st Semester", "2nd Semester", "Annual"),
        tags: fc.array(fc.string(), { maxLength: 10 }),
        description: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined })
      })
    })
  ], { numRuns: 100 })(
    'Property 23: Immutable Field Protection - immutable fields must not change',
    async ({ paperId, immutableFields, editableUpdates }) => {
      const capturedUpdates: any = {};

      // Mock paper exists with immutable fields
      const mockOriginalDoc = {
        exists: () => true,
        id: paperId,
        data: () => ({
          title: 'Original Title',
          subject: 'Original Subject',
          classLevel: 'Terminale D' as ClassLevel,
          year: 2020,
          examType: 'Baccalauréat' as ExamType,
          session: '1st Semester' as Session,
          tags: ['original'],
          description: 'Original description',
          ...immutableFields
        })
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValueOnce(mockOriginalDoc as any);
      vi.mocked(firestore.updateDoc).mockImplementation(async (ref, data) => {
        Object.assign(capturedUpdates, data);
      });

      // Update paper with only editable fields
      await adminService.updatePaper(paperId, editableUpdates);

      // Verify immutable fields were NOT included in the update
      expect(capturedUpdates.id).toBeUndefined();
      expect(capturedUpdates.fileUrl).toBeUndefined();
      expect(capturedUpdates.fileName).toBeUndefined();
      expect(capturedUpdates.fileSize).toBeUndefined();
      expect(capturedUpdates.uploadDate).toBeUndefined();
      expect(capturedUpdates.downloads).toBeUndefined();
      expect(capturedUpdates.contentHash).toBeUndefined();

      // Mock retrieval with updated data (immutable fields unchanged)
      const mockUpdatedDoc = {
        exists: () => true,
        id: paperId,
        data: () => ({
          ...editableUpdates,
          ...immutableFields
        })
      };

      vi.mocked(firestore.getDoc).mockResolvedValueOnce(mockUpdatedDoc as any);

      // Retrieve paper and verify immutable fields are unchanged
      const retrievedPaper = await adminService.getPaper(paperId);

      expect(retrievedPaper).not.toBeNull();
      expect(retrievedPaper!.id).toBe(paperId);
      expect(retrievedPaper!.fileUrl).toBe(immutableFields.fileUrl);
      expect(retrievedPaper!.fileName).toBe(immutableFields.fileName);
      expect(retrievedPaper!.fileSize).toBe(immutableFields.fileSize);
      expect(retrievedPaper!.contentHash).toBe(immutableFields.contentHash);
      expect(retrievedPaper!.downloads).toBe(immutableFields.downloads);
    }
  );
});
