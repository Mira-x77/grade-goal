import { supabase } from '@/integrations/supabase/client';
import { ExamPaper, FilterCriteria, CachedPaper } from '@/types/exam-library';
import { cacheService } from './cacheService';

interface SupabasePaper {
  id: string;
  title: string;
  subject: string;
  class_level: string;
  year: number;
  exam_type: string;
  session: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_size_formatted: string;
  content_hash: string;
  tags: string[];
  description?: string;
  preview_url?: string;
  downloads: number;
  created_at: string;
}

class ExamService {
  /**
   * Convert Supabase paper to ExamPaper format
   */
  private convertToExamPaper(paper: SupabasePaper): ExamPaper {
    return {
      id: paper.id,
      title: paper.title,
      subject: paper.subject,
      classLevel: paper.class_level as any,
      year: paper.year,
      examType: paper.exam_type as any,
      session: paper.session as any,
      fileUrl: paper.file_url,
      fileName: paper.file_name,
      fileSize: paper.file_size,
      fileSizeFormatted: paper.file_size_formatted,
      contentHash: paper.content_hash,
      // Convert Supabase created_at string to Firestore-like Timestamp for frontend compatibility
      uploadDate: {
        seconds: Math.floor(new Date(paper.created_at).getTime() / 1000),
        nanoseconds: 0,
        toDate: () => new Date(paper.created_at)
      } as any,
      downloads: paper.downloads,
      tags: paper.tags,
      description: paper.description,
      preview_url: paper.preview_url,
    };
  }

  /**
   * Fetch all exam papers from Supabase
   */
  async fetchPapers(): Promise<ExamPaper[]> {
    try {
      console.log('📥 Fetching papers from Supabase...');
      console.log('🔑 Using URL:', supabaseUrl);
      console.log('🔑 Using Key:', supabaseKey.substring(0, 30) + '...');

      const { data, error } = await supabase
        .from('exam_papers')
        .select('*')
        .order('year', { ascending: false });

      if (error) {
        console.error('❌ Supabase fetch error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} papers from Supabase`);
      console.log('📄 Raw data:', data);

      const papers = (data as SupabasePaper[]).map(p => this.convertToExamPaper(p));

      // Cache the results safely
      try {
        await cacheService.cachePapers(papers);
      } catch (cacheError) {
        console.warn('⚠️ Failed to cache papers:', cacheError);
        // Continue even if caching fails
      }

      return papers;
    } catch (error) {
      console.error('Failed to fetch papers:', error);
      // Fallback to cached data
      const cachedPapers = await this.getCachedPapers();

      if (cachedPapers.length > 0) {
        console.log(`📦 Using ${cachedPapers.length} cached papers`);
        return cachedPapers.map(this.convertCachedToExamPaper);
      }

      throw new Error('Failed to fetch papers. Please check your internet connection.');
    }
  }

  /**
   * Fetch papers with filters applied
   */
  async fetchPapersWithFilters(filters: FilterCriteria): Promise<ExamPaper[]> {
    try {
      let query = supabase
        .from('exam_papers')
        .select('*');

      // Apply filters
      if (filters.classLevel) {
        query = query.eq('class_level', filters.classLevel);
      }
      if (filters.subject) {
        query = query.eq('subject', filters.subject);
      }
      if (filters.year) {
        query = query.eq('year', filters.year);
      }
      if (filters.examType) {
        query = query.eq('exam_type', filters.examType);
      }

      // Order by year descending
      query = query.order('year', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Supabase filter error:', error);
        throw error;
      }

      return (data as SupabasePaper[]).map(p => this.convertToExamPaper(p));
    } catch (error) {
      console.error('Failed to fetch filtered papers:', error);
      // Fallback to client-side filtering of cached data
      const cachedPapers = await this.getCachedPapers();
      return this.filterPapersClientSide(cachedPapers, filters);
    }
  }

  /**
   * Client-side filtering helper
   */
  private filterPapersClientSide(papers: CachedPaper[], filters: FilterCriteria): ExamPaper[] {
    const filtered = papers.filter(paper => {
      if (filters.classLevel && paper.classLevel !== filters.classLevel) return false;
      if (filters.subject && paper.subject !== filters.subject) return false;
      if (filters.year && paper.year !== filters.year) return false;
      if (filters.examType && paper.examType !== filters.examType) return false;
      return true;
    });

    return filtered.map(this.convertCachedToExamPaper);
  }

  /**
   * Convert CachedPaper to ExamPaper format
   */
  private convertCachedToExamPaper(cached: CachedPaper): ExamPaper {
    return {
      id: cached.id,
      title: cached.title,
      subject: cached.subject,
      classLevel: cached.classLevel,
      year: cached.year,
      examType: cached.examType,
      session: cached.session,
      fileUrl: '',
      fileName: '',
      fileSize: cached.fileSize,
      fileSizeFormatted: cached.fileSizeFormatted,
      contentHash: '',
      uploadDate: {
        seconds: new Date(cached.uploadDate).getTime() / 1000,
        nanoseconds: 0,
        toDate: () => new Date(cached.uploadDate)
      } as any,
      downloads: cached.downloads,
      tags: cached.tags,
      description: cached.description
    };
  }

  /**
   * Search papers by title or subject
   */
  async searchPapers(searchQuery: string): Promise<ExamPaper[]> {
    try {
      const { data, error } = await supabase
        .from('exam_papers')
        .select('*')
        .or(`title.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`)
        .order('year', { ascending: false });

      if (error) {
        console.error('Supabase search error:', error);
        throw error;
      }

      return (data as SupabasePaper[]).map(p => this.convertToExamPaper(p));
    } catch (error) {
      console.error('Failed to search papers:', error);
      // Fallback to client-side search
      const allPapers = await this.fetchPapers();
      const searchLower = searchQuery.toLowerCase();
      return allPapers.filter(paper =>
        paper.title.toLowerCase().includes(searchLower) ||
        paper.subject.toLowerCase().includes(searchLower)
      );
    }
  }

  /**
   * Get single paper by ID
   */
  async getPaper(paperId: string): Promise<ExamPaper | null> {
    try {
      const { data, error } = await supabase
        .from('exam_papers')
        .select('*')
        .eq('id', paperId)
        .single();

      if (error) {
        console.error('Supabase get paper error:', error);
        return null;
      }

      return this.convertToExamPaper(data as SupabasePaper);
    } catch (error) {
      console.error('Failed to fetch paper:', error);

      // Fallback to cached data
      const cachedPapers = await cacheService.getCachedPapers();
      const cachedPaper = cachedPapers.find(p => p.id === paperId);

      if (cachedPaper) {
        return this.convertCachedToExamPaper(cachedPaper);
      }

      return null;
    }
  }

  /**
   * Get cached papers from IndexedDB (offline mode)
   */
  async getCachedPapers(): Promise<CachedPaper[]> {
    return cacheService.getCachedPapers();
  }

  /**
   * Increment download count in Supabase
   */
  async incrementDownloadCount(paperId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_downloads', { paper_id: paperId });

      if (error) {
        console.error('Failed to increment download count:', error);
      }
    } catch (error) {
      console.error('Failed to increment download count:', error);
      // Silently fail - analytics are not critical
    }
  }

  /**
   * Get unique subjects from all papers
   */
  async getUniqueSubjects(): Promise<string[]> {
    const papers = await this.fetchPapers();
    const subjects = new Set(papers.map(p => p.subject));
    return Array.from(subjects).sort();
  }

  /**
   * Get unique years from all papers
   */
  async getUniqueYears(): Promise<number[]> {
    const papers = await this.fetchPapers();
    const years = new Set(papers.map(p => p.year));
    return Array.from(years).sort((a, b) => b - a);
  }
}

export const examService = new ExamService();
