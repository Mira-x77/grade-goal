import { useState, useEffect } from 'react';
import { getAvailableSpace } from './filesystem';
import { formatBytes } from './integrity';

/**
 * Hook for online/offline detection
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
}

/**
 * Retry helper with exponential backoff
 * Already implemented in examService.ts but exported here for reuse
 */
export async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        // Exponential backoff: delayMs * (i + 1)
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Check storage before download
 */
export async function checkStorageBeforeDownload(
  requiredBytes: number
): Promise<{ available: boolean; error?: string }> {
  try {
    const { available: availableSpace } = await getAvailableSpace();
    
    if (availableSpace < requiredBytes) {
      return {
        available: false,
        error: `Insufficient storage. Need ${formatBytes(requiredBytes)}, have ${formatBytes(availableSpace)}`
      };
    }
    
    return { available: true };
  } catch (error) {
    console.error('Failed to check storage:', error);
    return {
      available: false,
      error: 'Unable to check storage space'
    };
  }
}

/**
 * Safe file operation wrapper
 */
export async function safeFileOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    console.error(errorMessage, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : errorMessage
    };
  }
}

/**
 * Handle Firebase-specific errors
 */
export function handleFirebaseError(error: any): string {
  // Storage errors
  if (error.code === 'storage/quota-exceeded') {
    return 'Storage quota exceeded. Please contact administrator.';
  }
  
  if (error.code === 'storage/unauthorized') {
    return 'Unauthorized access. Please check permissions.';
  }
  
  if (error.code === 'storage/canceled') {
    return 'Operation was cancelled.';
  }
  
  if (error.code === 'storage/unknown') {
    return 'An unknown error occurred. Please try again.';
  }
  
  if (error.code === 'storage/object-not-found') {
    return 'File not found. It may have been deleted.';
  }
  
  if (error.code === 'storage/bucket-not-found') {
    return 'Storage bucket not found. Please contact administrator.';
  }
  
  if (error.code === 'storage/project-not-found') {
    return 'Firebase project not found. Please contact administrator.';
  }
  
  if (error.code === 'storage/retry-limit-exceeded') {
    return 'Operation failed after multiple retries. Please check your connection.';
  }
  
  if (error.code === 'storage/invalid-checksum') {
    return 'File verification failed. Please try downloading again.';
  }
  
  if (error.code === 'storage/cannot-slice-blob') {
    return 'File processing error. Please try again.';
  }
  
  if (error.code === 'storage/server-file-wrong-size') {
    return 'File size mismatch. Please try downloading again.';
  }
  
  // Firestore errors
  if (error.code === 'permission-denied') {
    return 'Permission denied. Please check your access rights.';
  }
  
  if (error.code === 'unavailable') {
    return 'Service temporarily unavailable. Please try again later.';
  }
  
  if (error.code === 'deadline-exceeded') {
    return 'Operation timed out. Please check your connection.';
  }
  
  if (error.code === 'not-found') {
    return 'Document not found.';
  }
  
  if (error.code === 'already-exists') {
    return 'Document already exists.';
  }
  
  if (error.code === 'resource-exhausted') {
    return 'Quota exceeded. Please try again later.';
  }
  
  if (error.code === 'failed-precondition') {
    return 'Operation failed. Please refresh and try again.';
  }
  
  if (error.code === 'aborted') {
    return 'Operation was aborted. Please try again.';
  }
  
  if (error.code === 'out-of-range') {
    return 'Invalid operation range.';
  }
  
  if (error.code === 'unimplemented') {
    return 'Operation not supported.';
  }
  
  if (error.code === 'internal') {
    return 'Internal error. Please try again.';
  }
  
  if (error.code === 'data-loss') {
    return 'Data loss detected. Please contact administrator.';
  }
  
  if (error.code === 'unauthenticated') {
    return 'Authentication required. Please sign in.';
  }
  
  // Network errors
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return 'Network error. Please check your internet connection.';
  }
  
  // Generic error
  return error.message || 'An error occurred. Please try again.';
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate paper form data
 */
export function validatePaperForm(data: any): ValidationResult {
  const errors: Record<string, string> = {};
  
  if (!data.title || data.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters';
  }
  
  if (data.title && data.title.length > 200) {
    errors.title = 'Title must be less than 200 characters';
  }
  
  if (!data.subject) {
    errors.subject = 'Subject is required';
  }
  
  if (data.subject && data.subject.length > 100) {
    errors.subject = 'Subject must be less than 100 characters';
  }
  
  if (!data.classLevel) {
    errors.classLevel = 'Class level is required';
  }
  
  if (!data.year || data.year < 2000 || data.year > 2100) {
    errors.year = 'Year must be between 2000 and 2100';
  }
  
  if (!data.examType) {
    errors.examType = 'Exam type is required';
  }
  
  if (!data.session) {
    errors.session = 'Session is required';
  }
  
  if (data.tags && data.tags.length > 10) {
    errors.tags = 'Maximum 10 tags allowed';
  }
  
  if (data.description && data.description.length > 1000) {
    errors.description = 'Description must be less than 1000 characters';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate PDF file
 */
export function validatePDFFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'File must be a PDF' };
  }
  
  // Check file size (max 50MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 50MB' };
  }
  
  // Check file name
  if (!file.name || file.name.length === 0) {
    return { valid: false, error: 'File must have a name' };
  }
  
  return { valid: true };
}

/**
 * Error types for better error handling
 */
export enum ErrorType {
  NETWORK = 'network',
  STORAGE = 'storage',
  VALIDATION = 'validation',
  FIREBASE = 'firebase',
  FILESYSTEM = 'filesystem',
  UNKNOWN = 'unknown'
}

/**
 * Classify error type
 */
export function classifyError(error: any): ErrorType {
  if (error.code?.startsWith('storage/')) {
    return ErrorType.FIREBASE;
  }
  
  if (error.code && ['permission-denied', 'unavailable', 'deadline-exceeded'].includes(error.code)) {
    return ErrorType.FIREBASE;
  }
  
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return ErrorType.NETWORK;
  }
  
  if (error.message?.includes('storage') || error.message?.includes('quota')) {
    return ErrorType.STORAGE;
  }
  
  if (error.message?.includes('validation') || error.message?.includes('invalid')) {
    return ErrorType.VALIDATION;
  }
  
  if (error.message?.includes('filesystem') || error.message?.includes('file')) {
    return ErrorType.FILESYSTEM;
  }
  
  return ErrorType.UNKNOWN;
}
