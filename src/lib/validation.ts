import { ExamPaperMetadataSchema, PDFFileSchema } from '@/types/exam-library';

/**
 * Validate paper metadata
 */
export function validatePaperMetadata(data: unknown): { valid: boolean; errors?: string[] } {
  try {
    ExamPaperMetadataSchema.parse(data);
    return { valid: true };
  } catch (error: any) {
    const errors = error.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`) || ['Invalid metadata'];
    return { valid: false, errors };
  }
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
  
  return { valid: true };
}
