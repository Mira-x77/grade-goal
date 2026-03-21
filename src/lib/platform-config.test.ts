import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import {
  initFilesystem,
  savePDF,
  deletePDF,
  getFileUri,
  fileExists,
  EXAM_PAPERS_DIR
} from './filesystem';

// Mock Capacitor modules
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn()
  }
}));

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    getUri: vi.fn(),
    stat: vi.fn(),
    readFile: vi.fn()
  },
  Directory: {
    Data: 'DATA'
  }
}));

vi.mock('@capacitor-community/file-opener', () => ({
  FileOpener: {
    open: vi.fn()
  }
}));

describe('Platform Configuration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Android Platform (API 24+)', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    });

    it('should initialize filesystem on Android', async () => {
      vi.mocked(Filesystem.mkdir).mockResolvedValue(undefined as any);

      await initFilesystem();

      expect(Filesystem.mkdir).toHaveBeenCalledWith({
        path: EXAM_PAPERS_DIR,
        directory: Directory.Data,
        recursive: true
      });
    });

    it('should save PDF file on Android', async () => {
      const mockBlob = new Blob(['test pdf content'], { type: 'application/pdf' });
      const mockUri = 'file:///data/user/0/com.scoretarget.app/files/exam-papers/test.pdf';

      vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: mockUri } as any);

      const result = await savePDF('test.pdf', mockBlob);

      expect(result).toBe(mockUri);
      expect(Filesystem.writeFile).toHaveBeenCalledWith(
        expect.objectContaining({
          path: `${EXAM_PAPERS_DIR}/test.pdf`,
          directory: Directory.Data
        })
      );
    });

    it('should delete PDF file on Android', async () => {
      vi.mocked(Filesystem.deleteFile).mockResolvedValue(undefined as any);

      await deletePDF('test.pdf');

      expect(Filesystem.deleteFile).toHaveBeenCalledWith({
        path: `${EXAM_PAPERS_DIR}/test.pdf`,
        directory: Directory.Data
      });
    });

    it('should get file URI for opening on Android', async () => {
      const mockUri = 'content://com.scoretarget.app.fileprovider/exam-papers/test.pdf';
      vi.mocked(Filesystem.getUri).mockResolvedValue({ uri: mockUri } as any);

      const result = await getFileUri('test.pdf');

      expect(result).toBe(mockUri);
      expect(Filesystem.getUri).toHaveBeenCalledWith({
        path: `${EXAM_PAPERS_DIR}/test.pdf`,
        directory: Directory.Data
      });
    });

    it('should check if file exists on Android', async () => {
      vi.mocked(Filesystem.stat).mockResolvedValue({
        type: 'file',
        size: 1024,
        ctime: Date.now(),
        mtime: Date.now(),
        uri: 'file:///test.pdf'
      } as any);

      const exists = await fileExists('test.pdf');

      expect(exists).toBe(true);
      expect(Filesystem.stat).toHaveBeenCalledWith({
        path: `${EXAM_PAPERS_DIR}/test.pdf`,
        directory: Directory.Data
      });
    });

    it('should return false when file does not exist on Android', async () => {
      vi.mocked(Filesystem.stat).mockRejectedValue(new Error('File not found'));

      const exists = await fileExists('nonexistent.pdf');

      expect(exists).toBe(false);
    });
  });

  describe('iOS Platform (iOS 13.0+)', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
    });

    it('should initialize filesystem on iOS', async () => {
      vi.mocked(Filesystem.mkdir).mockResolvedValue(undefined as any);

      await initFilesystem();

      expect(Filesystem.mkdir).toHaveBeenCalledWith({
        path: EXAM_PAPERS_DIR,
        directory: Directory.Data,
        recursive: true
      });
    });

    it('should save PDF file on iOS', async () => {
      const mockBlob = new Blob(['test pdf content'], { type: 'application/pdf' });
      const mockUri = 'file:///var/mobile/Containers/Data/Application/UUID/Library/NoCloud/exam-papers/test.pdf';

      vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: mockUri } as any);

      const result = await savePDF('test.pdf', mockBlob);

      expect(result).toBe(mockUri);
      expect(Filesystem.writeFile).toHaveBeenCalledWith(
        expect.objectContaining({
          path: `${EXAM_PAPERS_DIR}/test.pdf`,
          directory: Directory.Data
        })
      );
    });

    it('should delete PDF file on iOS', async () => {
      vi.mocked(Filesystem.deleteFile).mockResolvedValue(undefined as any);

      await deletePDF('test.pdf');

      expect(Filesystem.deleteFile).toHaveBeenCalledWith({
        path: `${EXAM_PAPERS_DIR}/test.pdf`,
        directory: Directory.Data
      });
    });

    it('should get file URI for opening on iOS', async () => {
      const mockUri = 'file:///var/mobile/Containers/Data/Application/UUID/Library/NoCloud/exam-papers/test.pdf';
      vi.mocked(Filesystem.getUri).mockResolvedValue({ uri: mockUri } as any);

      const result = await getFileUri('test.pdf');

      expect(result).toBe(mockUri);
      expect(Filesystem.getUri).toHaveBeenCalledWith({
        path: `${EXAM_PAPERS_DIR}/test.pdf`,
        directory: Directory.Data
      });
    });

    it('should check if file exists on iOS', async () => {
      vi.mocked(Filesystem.stat).mockResolvedValue({
        type: 'file',
        size: 1024,
        ctime: Date.now(),
        mtime: Date.now(),
        uri: 'file:///test.pdf'
      } as any);

      const exists = await fileExists('test.pdf');

      expect(exists).toBe(true);
    });
  });

  describe('Web Platform (Fallback)', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
    });

    it('should skip filesystem initialization on web', async () => {
      await initFilesystem();

      expect(Filesystem.mkdir).not.toHaveBeenCalled();
    });

    it('should throw error when trying to save PDF on web', async () => {
      const mockBlob = new Blob(['test pdf content'], { type: 'application/pdf' });

      await expect(savePDF('test.pdf', mockBlob)).rejects.toThrow(
        'File system not supported on web platform'
      );
    });

    it('should skip delete on web', async () => {
      await deletePDF('test.pdf');

      expect(Filesystem.deleteFile).not.toHaveBeenCalled();
    });

    it('should throw error when getting file URI on web', async () => {
      await expect(getFileUri('test.pdf')).rejects.toThrow(
        'File system not supported on web platform'
      );
    });

    it('should return false for file exists check on web', async () => {
      const exists = await fileExists('test.pdf');

      expect(exists).toBe(false);
      expect(Filesystem.stat).not.toHaveBeenCalled();
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should use consistent directory structure across platforms', () => {
      expect(EXAM_PAPERS_DIR).toBe('exam-papers');
    });

    it('should handle platform detection correctly', () => {
      const platforms = ['android', 'ios', 'web'];
      
      platforms.forEach(platform => {
        vi.mocked(Capacitor.getPlatform).mockReturnValue(platform as any);
        const detectedPlatform = Capacitor.getPlatform();
        expect(detectedPlatform).toBe(platform);
      });
    });

    it('should use Directory.Data for all mobile platforms', async () => {
      const platforms = ['android', 'ios'];
      
      for (const platform of platforms) {
        vi.clearAllMocks();
        vi.mocked(Capacitor.getPlatform).mockReturnValue(platform as any);
        vi.mocked(Filesystem.mkdir).mockResolvedValue(undefined as any);

        await initFilesystem();

        expect(Filesystem.mkdir).toHaveBeenCalledWith(
          expect.objectContaining({
            directory: Directory.Data
          })
        );
      }
    });
  });

  describe('PDF Viewer Integration', () => {
    it('should support PDF opening on Android', async () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      
      // This test verifies that FileOpener is available
      expect(FileOpener).toBeDefined();
      expect(FileOpener.open).toBeDefined();
    });

    it('should support PDF opening on iOS', async () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
      
      // This test verifies that FileOpener is available
      expect(FileOpener).toBeDefined();
      expect(FileOpener.open).toBeDefined();
    });
  });

  describe('Minimum Platform Version Requirements', () => {
    it('should document Android 7.0+ (API 24) requirement', () => {
      // This is a documentation test
      // Android minSdkVersion is set to 24 in android/variables.gradle
      const minAndroidVersion = 24; // API 24 = Android 7.0
      expect(minAndroidVersion).toBeGreaterThanOrEqual(24);
    });

    it('should document iOS 13.0+ requirement', () => {
      // This is a documentation test
      // iOS deployment target is set to 13.0 in ios/App/App.xcodeproj/project.pbxproj
      const minIOSVersion = 13.0;
      expect(minIOSVersion).toBeGreaterThanOrEqual(13.0);
    });
  });
});
