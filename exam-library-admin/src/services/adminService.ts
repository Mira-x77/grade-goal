import { supabase } from '../lib/supabaseClient';
import { storageAdapter } from '../lib/storage-adapter';
import {
  ExamPaper,
  StorageAnalytics,
  DownloadAnalytics,
  BandwidthAnalytics,
  ClassLevel,
  ExamType,
  Session
} from '../types';

import { formatBytes } from '../lib/integrity';

export interface NewExamPaper {
  title: string;
  subject: string;
  classLevel: ClassLevel;
  year: number;
  examType: ExamType;
  session: Session;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  contentHash: string;
  tags: string[];
  description?: string;
}

/**
 * Validation helper for PDF files
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

class AdminService {
  /**
   * Upload PDF to Supabase Storage
   * Returns storage URL
   */
  async uploadPDF(
    file: File,
    metadata: {
      title: string;
      subject: string;
      classLevel: ClassLevel;
      year: number;
      examType: ExamType;
      session: Session;
      tags: string[];
      description?: string;
      contentHash: string;
    }
  ): Promise<string> {
    // Validate file
    const fileValidation = validatePDFFile(file);
    if (!fileValidation.valid) {
      throw new Error(fileValidation.error);
    }

    // Generate storage path: {classLevel}/{subject}/{year}/{fileName}
    const sanitizedClassLevel = metadata.classLevel.replace(/\s+/g, '-');
    const sanitizedSubject = metadata.subject.replace(/\s+/g, '-');
    const sanitizedFileName = file.name.replace(/\s+/g, '-');

    const storagePath = `${sanitizedClassLevel}/${sanitizedSubject}/${metadata.year}/${sanitizedFileName}`;

    console.log('📤 Uploading PDF to Supabase Storage:', storagePath);

    // Upload file using storage adapter
    const downloadURL = await storageAdapter.uploadFile(storagePath, file);

    console.log('✅ PDF uploaded successfully:', downloadURL);

    return downloadURL;
  }

  /**
   * Create exam paper document in Supabase
   */
  async createPaper(paper: NewExamPaper): Promise<string> {
    console.log('📝 Creating paper in Supabase database:', paper.title);

    const { data, error } = await supabase
      .from('exam_papers')
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
        description: paper.description,
        downloads: 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create paper in database:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('✅ Paper created successfully with ID:', data.id);

    // Update storage analytics
    await this.updateStorageAnalytics();

    return data.id;
  }

  /**
   * Update paper metadata
   */
  async updatePaper(
    paperId: string,
    updates: Partial<Pick<ExamPaper, 'title' | 'subject' | 'classLevel' | 'year' | 'examType' | 'session' | 'tags' | 'description'>>
  ): Promise<void> {
    console.log('📝 Updating paper:', paperId);

    // Convert camelCase to snake_case for Supabase
    const supabaseUpdates: any = {};
    if (updates.title !== undefined) supabaseUpdates.title = updates.title;
    if (updates.subject !== undefined) supabaseUpdates.subject = updates.subject;
    if (updates.classLevel !== undefined) supabaseUpdates.class_level = updates.classLevel;
    if (updates.year !== undefined) supabaseUpdates.year = updates.year;
    if (updates.examType !== undefined) supabaseUpdates.exam_type = updates.examType;
    if (updates.session !== undefined) supabaseUpdates.session = updates.session;
    if (updates.tags !== undefined) supabaseUpdates.tags = updates.tags;
    if (updates.description !== undefined) supabaseUpdates.description = updates.description;

    const { error } = await supabase
      .from('exam_papers')
      .update(supabaseUpdates)
      .eq('id', paperId);

    if (error) {
      console.error('❌ Failed to update paper:', error);
      throw new Error(`Update failed: ${error.message}`);
    }

    console.log('✅ Paper updated successfully');
  }

  /**
   * Delete paper (both Supabase database and Storage)
   */
  async deletePaper(paperId: string): Promise<void> {
    console.log('🗑️ Deleting paper:', paperId);

    // Get paper document to retrieve storage information
    const { data: paper, error: fetchError } = await supabase
      .from('exam_papers')
      .select('*')
      .eq('id', paperId)
      .single();

    if (fetchError || !paper) {
      throw new Error('Paper not found');
    }

    // Step 1: Delete from Supabase Storage first
    try {
      await storageAdapter.deleteFile(paper.file_url);
      console.log('✅ File deleted from storage');
    } catch (error) {
      console.error('❌ Failed to delete file from storage:', error);
      throw new Error(`Storage deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Step 2: Delete from Supabase database
    const { error: deleteError } = await supabase
      .from('exam_papers')
      .delete()
      .eq('id', paperId);

    if (deleteError) {
      console.error('❌ Failed to delete from database:', deleteError);
      throw new Error(`Database deletion failed: ${deleteError.message}`);
    }

    console.log('✅ Paper deleted successfully');

    // Step 3: Update analytics
    await this.updateStorageAnalytics();
  }

  /**
   * Get storage analytics
   */
  async getStorageAnalytics(): Promise<StorageAnalytics> {
    const { data: papers, error } = await supabase
      .from('exam_papers')
      .select('file_size');

    if (error) {
      console.error('Failed to fetch papers for analytics:', error);
      return {
        id: 'storage',
        totalFiles: 0,
        totalSizeBytes: 0,
        lastUpdated: new Date()
      };
    }

    const totalSize = papers?.reduce((sum, p) => sum + (p.file_size || 0), 0) || 0;

    return {
      id: 'storage',
      totalFiles: papers?.length || 0,
      totalSizeBytes: totalSize,
      lastUpdated: new Date()
    };
  }

  /**
   * Get download analytics
   */
  async getDownloadAnalytics(): Promise<DownloadAnalytics> {
    const { data: papers, error } = await supabase
      .from('exam_papers')
      .select('id, title, downloads, subject')
      .order('downloads', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Failed to fetch download analytics:', error);
      return {
        id: 'downloads',
        totalDownloads: 0,
        downloadsBySubject: {},
        topPapers: [],
        lastUpdated: new Date()
      };
    }

    // Calculate total downloads
    const totalDownloads = papers?.reduce((sum, p) => sum + (p.downloads || 0), 0) || 0;

    // Calculate downloads by subject
    const downloadsBySubject: { [key: string]: number } = {};
    papers?.forEach(p => {
      if (p.subject) {
        downloadsBySubject[p.subject] = (downloadsBySubject[p.subject] || 0) + (p.downloads || 0);
      }
    });

    // Top papers
    const topPapers = papers?.map(p => ({
      paperId: p.id,
      title: p.title,
      downloads: p.downloads || 0
    })) || [];

    return {
      id: 'downloads',
      totalDownloads,
      downloadsBySubject,
      topPapers,
      lastUpdated: new Date()
    };
  }

  /**
   * Get bandwidth usage for date
   */
  async getBandwidthUsage(date: string): Promise<BandwidthAnalytics> {
    // Note: This would require a separate analytics table in Supabase
    // For now, return empty analytics
    return {
      id: `bandwidth-${date}`,
      date,
      bytesTransferred: 0,
      downloadCount: 0
    };
  }

  /**
   * Get single paper by ID
   */
  async getPaper(paperId: string): Promise<ExamPaper | null> {
    const { data, error } = await supabase
      .from('exam_papers')
      .select('*')
      .eq('id', paperId)
      .single();

    if (error || !data) {
      return null;
    }

    // Convert snake_case to camelCase
    return {
      id: data.id,
      title: data.title,
      subject: data.subject,
      classLevel: data.class_level,
      year: data.year,
      examType: data.exam_type,
      session: data.session,
      fileUrl: data.file_url,
      fileName: data.file_name,
      fileSize: data.file_size,
      fileSizeFormatted: data.file_size_formatted,
      contentHash: data.content_hash,
      uploadDate: {
        seconds: Math.floor(new Date(data.created_at).getTime() / 1000),
        nanoseconds: 0,
        toDate: () => new Date(data.created_at)
      } as any,
      downloads: data.downloads,
      tags: data.tags,
      description: data.description,
      previewUrl: data.preview_url
    };
  }

  /**
   * Get all papers
   */
  async getAllPapers(): Promise<ExamPaper[]> {
    const { data, error } = await supabase
      .from('exam_papers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch papers:', error);
      return [];
    }

    return (data || []).map(paper => ({
      id: paper.id,
      title: paper.title,
      subject: paper.subject,
      classLevel: paper.class_level,
      year: paper.year,
      examType: paper.exam_type,
      session: paper.session,
      fileUrl: paper.file_url,
      fileName: paper.file_name,
      fileSize: paper.file_size,
      fileSizeFormatted: paper.file_size_formatted,
      contentHash: paper.content_hash,
      uploadDate: {
        seconds: Math.floor(new Date(paper.created_at).getTime() / 1000),
        nanoseconds: 0,
        toDate: () => new Date(paper.created_at)
      } as any,
      downloads: paper.downloads,
      tags: paper.tags,
      description: paper.description,
      previewUrl: paper.preview_url
    }));
  }

  /**
   * Update storage analytics
   * Called after upload or delete
   */
  private async updateStorageAnalytics(): Promise<void> {
    // Analytics are calculated on-demand in getStorageAnalytics()
    // No need to store them separately
    console.log('📊 Storage analytics will be calculated on next fetch');
  }

  /**
   * Update top papers list
   * Run periodically or after threshold downloads
   */
  async updateTopPapers(): Promise<void> {
    // Top papers are calculated on-demand in getDownloadAnalytics()
    console.log('📊 Top papers will be calculated on next fetch');
  }
}

export const adminService = new AdminService();
