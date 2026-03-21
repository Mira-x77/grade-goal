import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useNetworkStatus,
  fetchWithRetry,
  checkStorageBeforeDownload,
  safeFileOperation,
  handleFirebaseError,
  validatePaperForm,
  validatePDFFile,
  classifyError,
  ErrorType
} from './error-handling';
import { renderHook, act } from '@testing-library/react';

describe('Error Handling Utilities', () => {
  describe('useNetworkStatus', () => {
    beforeEach(() => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
    });

    it('should return initial online status', () => {
      const { result } = renderHook(() => useNetworkStatus());
      expect(result.current).toBe(true);
    });

    it('should update status when going offline', () => {
      const { result } = renderHook(() => useNetworkStatus());
      
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false });
        window.dispatchEvent(new Event('offline'));
      });
      
      expect(result.current).toBe(false);
    });

    it('should update status when going online', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      const { result } = renderHook(() => useNetworkStatus());
      
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: true });
        window.dispatchEvent(new Event('online'));
      });
      
      expect(result.current).toBe(true);
    });
  });

  describe('fetchWithRetry', () => {
    it('should return result on first success', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const result = await fetchWithRetry(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');
      
      const result = await fetchWithRetry(mockFn, 3, 10);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('persistent failure'));
      
      await expect(fetchWithRetry(mockFn, 3, 10)).rejects.toThrow('persistent failure');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      await fetchWithRetry(mockFn, 3, 10);
      const duration = Date.now() - startTime;
      
      // Should have delays of 10ms and 20ms (total ~30ms minimum)
      expect(duration).toBeGreaterThanOrEqual(25);
    });
  });

  describe('checkStorageBeforeDownload', () => {
    it('should return available true when sufficient storage', async () => {
      const result = await checkStorageBeforeDownload(1000);
      
      expect(result.available).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return available false when insufficient storage', async () => {
      // Mock getAvailableSpace to return small value
      const result = await checkStorageBeforeDownload(Number.MAX_SAFE_INTEGER);
      
      expect(result.available).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Insufficient storage');
    });
  });

  describe('safeFileOperation', () => {
    it('should return success with data on successful operation', async () => {
      const mockOp = vi.fn().mockResolvedValue('result');
      const result = await safeFileOperation(mockOp, 'error message');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('result');
      expect(result.error).toBeUndefined();
    });

    it('should return failure with error on failed operation', async () => {
      const mockOp = vi.fn().mockRejectedValue(new Error('operation failed'));
      const result = await safeFileOperation(mockOp, 'custom error');
      
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBe('operation failed');
    });

    it('should use custom error message for non-Error objects', async () => {
      const mockOp = vi.fn().mockRejectedValue('string error');
      const result = await safeFileOperation(mockOp, 'custom error');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('custom error');
    });
  });

  describe('handleFirebaseError', () => {
    it('should handle storage quota exceeded error', () => {
      const error = { code: 'storage/quota-exceeded' };
      const message = handleFirebaseError(error);
      
      expect(message).toContain('quota exceeded');
    });

    it('should handle unauthorized error', () => {
      const error = { code: 'storage/unauthorized' };
      const message = handleFirebaseError(error);
      
      expect(message).toContain('Unauthorized');
    });

    it('should handle permission denied error', () => {
      const error = { code: 'permission-denied' };
      const message = handleFirebaseError(error);
      
      expect(message).toContain('Permission denied');
    });

    it('should handle network errors', () => {
      const error = { message: 'network request failed' };
      const message = handleFirebaseError(error);
      
      expect(message).toContain('Network error');
    });

    it('should return generic message for unknown errors', () => {
      const error = { code: 'unknown-code' };
      const message = handleFirebaseError(error);
      
      expect(message).toBeTruthy();
    });
  });

  describe('validatePaperForm', () => {
    it('should validate correct form data', () => {
      const data = {
        title: 'Test Paper',
        subject: 'Mathematics',
        classLevel: 'Terminale D',
        year: 2023,
        examType: 'Baccalauréat',
        session: '1st Semester',
        tags: ['algebra'],
        description: 'Test description'
      };
      
      const result = validatePaperForm(data);
      
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should reject short title', () => {
      const data = {
        title: 'AB',
        subject: 'Math',
        classLevel: 'Terminale D',
        year: 2023,
        examType: 'Baccalauréat',
        session: '1st Semester'
      };
      
      const result = validatePaperForm(data);
      
      expect(result.valid).toBe(false);
      expect(result.errors.title).toBeDefined();
    });

    it('should reject missing required fields', () => {
      const data = {
        title: 'Test Paper'
      };
      
      const result = validatePaperForm(data);
      
      expect(result.valid).toBe(false);
      expect(result.errors.subject).toBeDefined();
      expect(result.errors.classLevel).toBeDefined();
      expect(result.errors.examType).toBeDefined();
    });

    it('should reject invalid year', () => {
      const data = {
        title: 'Test Paper',
        subject: 'Math',
        classLevel: 'Terminale D',
        year: 1999,
        examType: 'Baccalauréat',
        session: '1st Semester'
      };
      
      const result = validatePaperForm(data);
      
      expect(result.valid).toBe(false);
      expect(result.errors.year).toBeDefined();
    });

    it('should reject too many tags', () => {
      const data = {
        title: 'Test Paper',
        subject: 'Math',
        classLevel: 'Terminale D',
        year: 2023,
        examType: 'Baccalauréat',
        session: '1st Semester',
        tags: Array(11).fill('tag')
      };
      
      const result = validatePaperForm(data);
      
      expect(result.valid).toBe(false);
      expect(result.errors.tags).toBeDefined();
    });
  });

  describe('validatePDFFile', () => {
    it('should validate correct PDF file', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = validatePDFFile(file);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-PDF file', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = validatePDFFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('PDF');
    });

    it('should reject file larger than 50MB', () => {
      const largeContent = new Uint8Array(51 * 1024 * 1024); // 51MB
      const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
      const result = validatePDFFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('50MB');
    });
  });

  describe('classifyError', () => {
    it('should classify Firebase storage errors', () => {
      const error = { code: 'storage/quota-exceeded' };
      expect(classifyError(error)).toBe(ErrorType.FIREBASE);
    });

    it('should classify network errors', () => {
      const error = { message: 'network request failed' };
      expect(classifyError(error)).toBe(ErrorType.NETWORK);
    });

    it('should classify storage errors', () => {
      const error = { message: 'insufficient storage space' };
      expect(classifyError(error)).toBe(ErrorType.STORAGE);
    });

    it('should classify validation errors', () => {
      const error = { message: 'validation failed' };
      expect(classifyError(error)).toBe(ErrorType.VALIDATION);
    });

    it('should classify filesystem errors', () => {
      const error = { message: 'file not found' };
      expect(classifyError(error)).toBe(ErrorType.FILESYSTEM);
    });

    it('should classify unknown errors', () => {
      const error = { message: 'something went wrong' };
      expect(classifyError(error)).toBe(ErrorType.UNKNOWN);
    });
  });
});
