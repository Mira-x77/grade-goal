/**
 * Admin Service — Supabase
 * Manages exam papers: upload, update, delete, analytics
 * Requires admin access (controlled by Supabase RLS / admin email list)
 */

import { supabase } from '@/integrations/supabase/client';
import { storageAdapter } from '@/lib/storage-adapter';
import { validatePDFFile, validatePaperForm } from '@/lib/error-handling';
import { formatBytes } from '@/lib/integrity';
import {
  ExamPaper,
  NewExamPaper,
  ExamPaperMetadataSchema,
} from '@/types/exam-library';

const PAPERS_TABLE = 'exam_papers';

/**
 * Validation helper for paper metadata using Zod schema
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

export { validatePDFFile };

class AdminService {
  /**
   * Upload a PDF to Supabase Storage and return its public URL
   */
  async uploadPDF(
    file: File,
    metadata: Pick<NewExamPaper, 'classLevel' | 'subject' | 'year'>
  ): Promise<string> {
    const fileValidation = validatePDFFile(file);
    if (!fileValidation.valid) throw new Error(fileValidation.error);

    // Path: exam-papers/{classLevel}/{subject}/{year}/{filename}
    const sanitize = (s: string) => s.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_.]/g, '');
    const storagePath = `${sanitize(metadata.classLevel)}/${sanitize(metadata.subject)}/${metadata.year}/${sanitize(file.name)}`;

    return storageAdapter.uploadFile(storagePath, file);
  }

  /**
   * Create an exam paper record in Supabase
   */
  async createPaper(paper: NewExamPaper & { fileUrl: string }): Promise<string> {
    const metaValidation = validatePaperMetadata({
      title: paper.title,
      subject: paper.subject,
      classLevel: paper.classLevel,
      year: paper.year,
      examType: paper.examType,
      session: paper.session,
      tags: paper.tags,
      description: paper.description,
    });

    if (!metaValidation.valid) {
      throw new Error(`Invalid metadata: ${metaValidation.errors?.join(', ')}`);
    }

    const { data, error } = await supabase
      .from(PAPERS_TABLE)
      .insert({
        title: paper.title,
        subject: paper.subject,
        class_level: paper.classLevel,
        year: paper.year,
        exam_type: paper.examType,
        session: paper.session,
        file_url: paper.fileUrl,
        file_name: paper.fileName,
        file_size: paper.fileSize,
        file_size_formatted: formatBytes(paper.fileSize),
        content_hash: paper.contentHash,
        tags: paper.tags,
        description: paper.description ?? null,
        downloads: 0,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create paper: ${error.message}`);
    return data.id;
  }

  /**
   * Update paper metadata
   */
  async updatePaper(
    paperId: string,
    updates: Partial<Pick<ExamPaper, 'title' | 'subject' | 'classLevel' | 'year' | 'examType' | 'session' | 'tags' | 'description'>>
  ): Promise<void> {
    const { error } = await supabase
      .from(PAPERS_TABLE)
      .update({
        ...(updates.title && { title: updates.title }),
        ...(updates.subject && { subject: updates.subject }),
        ...(updates.classLevel && { class_level: updates.classLevel }),
        ...(updates.year && { year: updates.year }),
        ...(updates.examType && { exam_type: updates.examType }),
        ...(updates.session && { session: updates.session }),
        ...(updates.tags && { tags: updates.tags }),
        ...(updates.description !== undefined && { description: updates.description }),
      })
      .eq('id', paperId);

    if (error) throw new Error(`Failed to update paper: ${error.message}`);
  }

  /**
   * Delete a paper — removes from Supabase Storage + database row
   */
  async deletePaper(paperId: string): Promise<void> {
    // Fetch the paper to get its file URL
    const { data: paper, error: fetchError } = await supabase
      .from(PAPERS_TABLE)
      .select('file_url')
      .eq('id', paperId)
      .single();

    if (fetchError || !paper) throw new Error('Paper not found');

    // Delete from storage first
    const storagePath = storageAdapter.extractPath(paper.file_url);
    await storageAdapter.deleteFile(storagePath);

    // Then delete from database
    const { error } = await supabase.from(PAPERS_TABLE).delete().eq('id', paperId);
    if (error) throw new Error(`Failed to delete paper record: ${error.message}`);
  }

  /**
   * Fetch all papers (for admin table view)
   */
  async getAllPapers(): Promise<ExamPaper[]> {
    const { data, error } = await supabase
      .from(PAPERS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch papers: ${error.message}`);

    return (data ?? []).map(row => this.rowToExamPaper(row));
  }

  /**
   * Get a single paper by ID
   */
  async getPaper(paperId: string): Promise<ExamPaper | null> {
    const { data, error } = await supabase
      .from(PAPERS_TABLE)
      .select('*')
      .eq('id', paperId)
      .single();

    if (error || !data) return null;
    return this.rowToExamPaper(data);
  }

  /**
   * Get storage analytics (total files + sizes from DB)
   */
  async getStorageAnalytics(): Promise<{ totalFiles: number; totalSizeBytes: number; totalSizeFormatted: string }> {
    const { data, error } = await supabase
      .from(PAPERS_TABLE)
      .select('file_size');

    if (error) throw new Error(`Failed to get analytics: ${error.message}`);

    const totalSizeBytes = (data ?? []).reduce((sum, row) => sum + (row.file_size ?? 0), 0);
    return {
      totalFiles: data?.length ?? 0,
      totalSizeBytes,
      totalSizeFormatted: formatBytes(totalSizeBytes),
    };
  }

  /**
   * Get top downloaded papers
   */
  async getTopPapers(limit = 10): Promise<Array<{ id: string; title: string; downloads: number }>> {
    const { data, error } = await supabase
      .from(PAPERS_TABLE)
      .select('id, title, downloads')
      .order('downloads', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get top papers: ${error.message}`);
    return data ?? [];
  }

  /**
   * Map Supabase row to ExamPaper interface
   */
  private rowToExamPaper(row: any): ExamPaper {
    return {
      id: row.id,
      title: row.title,
      subject: row.subject,
      classLevel: row.class_level,
      year: row.year,
      examType: row.exam_type,
      session: row.session,
      fileUrl: row.file_url,
      fileName: row.file_name,
      fileSize: row.file_size,
      fileSizeFormatted: row.file_size_formatted ?? formatBytes(row.file_size ?? 0),
      contentHash: row.content_hash ?? '',
      uploadDate: row.created_at,
      downloads: row.downloads ?? 0,
      tags: row.tags ?? [],
      description: row.description ?? undefined,
      preview_url: row.preview_url ?? undefined,
    };
  }
}

export const adminService = new AdminService();
