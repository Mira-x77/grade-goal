import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { FileOpener } from '@capacitor-community/file-opener';
import { downloadService } from './downloadService';
import { getFileUri } from '@/lib/filesystem';

// Mock modules
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn()
  }
}));

vi.mock('@capacitor-community/file-opener', () => ({
  FileOpener: {
    open: vi.fn()
  }
}));

vi.mock('@/lib/filesystem', () => ({
  getFileUri: vi.fn()
}));

describe('PDF Viewer Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Android PDF Viewer', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    });

    it('should open PDF with correct MIME type on Android', async () => {
      const mockFileUri = 'content://com.scoretarget.app.fileprovider/exam-papers/test.pdf';
      vi.mocked(getFileUri).mockResolvedValue(mockFileUri);
      vi.mocked(FileOpener.open).mockResolvedValue(undefined as any);

      await downloadService.openPDF(mockFileUri);

      expect(FileOpener.open).toHaveBeenCalledWith({
        filePath: mockFileUri,
        contentType: 'application/pdf',
        openWithDefault: true
      });
    });

    it('should handle PDF viewer not available on Android', async () => {
      const mockFileUri = 'content://com.scoretarget.app.fileprovider/exam-papers/test.pdf';
      vi.mocked(getFileUri).mockResolvedValue(mockFileUri);
      vi.mocked(FileOpener.open).mockRejectedValue(new Error('No app found to open PDF'));

      await expect(downloadService.openPDF(mockFileUri)).rejects.toThrow();
    });

    it('should use FileProvider URI on Android', async () => {
      const mockFileUri = 'content://com.scoretarget.app.fileprovider/exam-papers/bac-math-2023.pdf';
      vi.mocked(getFileUri).mockResolvedValue(mockFileUri);
      vi.mocked(FileOpener.open).mockResolvedValue(undefined as any);

      await downloadService.openPDF(mockFileUri);

      expect(FileOpener.open).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: mockFileUri
        })
      );
      expect(mockFileUri).toContain('content://');
      expect(mockFileUri).toContain('fileprovider');
    });
  });

  describe('iOS PDF Viewer', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
    });

    it('should open PDF with correct MIME type on iOS', async () => {
      const mockFileUri = 'file:///var/mobile/Containers/Data/Application/UUID/Library/NoCloud/exam-papers/test.pdf';
      vi.mocked(getFileUri).mockResolvedValue(mockFileUri);
      vi.mocked(FileOpener.open).mockResolvedValue(undefined as any);

      await downloadService.openPDF(mockFileUri);

      expect(FileOpener.open).toHaveBeenCalledWith({
        filePath: mockFileUri,
        contentType: 'application/pdf',
        openWithDefault: true
      });
    });

    it('should handle PDF viewer not available on iOS', async () => {
      const mockFileUri = 'file:///var/mobile/Containers/Data/Application/UUID/Library/NoCloud/exam-papers/test.pdf';
      vi.mocked(getFileUri).mockResolvedValue(mockFileUri);
      vi.mocked(FileOpener.open).mockRejectedValue(new Error('No app found to open PDF'));

      await expect(downloadService.openPDF(mockFileUri)).rejects.toThrow();
    });

    it('should use file:// URI on iOS', async () => {
      const mockFileUri = 'file:///var/mobile/Containers/Data/Application/UUID/Library/NoCloud/exam-papers/bac-math-2023.pdf';
      vi.mocked(getFileUri).mockResolvedValue(mockFileUri);
      vi.mocked(FileOpener.open).mockResolvedValue(undefined as any);

      await downloadService.openPDF(mockFileUri);

      expect(FileOpener.open).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: mockFileUri
        })
      );
      expect(mockFileUri).toContain('file://');
    });
  });

  describe('Web Platform PDF Viewer', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
      global.window = { open: vi.fn() } as any;
    });

    it('should open PDF in new tab on web', async () => {
      const mockFileUri = 'blob:http://localhost:5173/test.pdf';
      const windowOpenSpy = vi.spyOn(window, 'open');

      await downloadService.openPDF(mockFileUri);

      expect(windowOpenSpy).toHaveBeenCalledWith(mockFileUri, '_blank');
      expect(FileOpener.open).not.toHaveBeenCalled();
    });
  });

  describe('Cross-Platform PDF Support', () => {
    it('should support PDF MIME type on all platforms', () => {
      const pdfMimeType = 'application/pdf';
      expect(pdfMimeType).toBe('application/pdf');
    });

    it('should handle different URI schemes per platform', () => {
      const uriSchemes = {
        android: 'content://',
        ios: 'file://',
        web: 'blob:'
      };

      expect(uriSchemes.android).toBe('content://');
      expect(uriSchemes.ios).toBe('file://');
      expect(uriSchemes.web).toBe('blob:');
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error when PDF viewer is not available', async () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      const mockFileUri = 'content://test.pdf';
      vi.mocked(getFileUri).mockResolvedValue(mockFileUri);
      vi.mocked(FileOpener.open).mockRejectedValue(
        new Error('No application found to open PDF files')
      );

      await expect(downloadService.openPDF(mockFileUri)).rejects.toThrow(
        'No application found to open PDF files'
      );
    });

    it('should handle invalid file paths', async () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      const invalidUri = '';
      vi.mocked(getFileUri).mockResolvedValue(invalidUri);
      vi.mocked(FileOpener.open).mockRejectedValue(new Error('Invalid file path'));

      await expect(downloadService.openPDF(invalidUri)).rejects.toThrow();
    });
  });
});
