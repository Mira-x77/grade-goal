import { supabase } from '@/integrations/supabase/client';
import { ExamPaper, FilterCriteria, CachedPaper } from '@/types/exam-library';
import { cacheService } from './cacheService';
import { fetchStaticPaperRows } from './staticCatalog';
import { paperMatchesClassFilter, paperMatchesSubjectFilter } from '@/lib/library-filters';

interface SupabasePaper {
  id: string;
  title: string;
  subject: string;
  class_level: string;
  class_levels?: string[];
  subjects?: string[];
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
  system?: string; // Optional system field for multi-system support
}

const SAMPLE_PAPERS: ExamPaper[] = [
  {
    id: "sample-math-tle-c-2024",
    title: "Baccalauréat Mathématiques Terminale C 2024",
    subject: "Mathématiques",
    classLevel: "Terminale",
    year: 2024,
    examType: "Baccalauréat",
    session: "Annuel",
    system: "apc",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    fileName: "Math_TleC_Bac_2024.pdf",
    fileSize: 2450000,
    fileSizeFormatted: "2.45 MB",
    contentHash: "hash_math_2024",
    uploadDate: { seconds: Math.floor(Date.now()/1000), nanoseconds: 0, toDate: () => new Date() } as any,
    downloads: 142,
    tags: ["Maths", "Bac", "Tle C"],
    description: "Épreuve officielle de Mathématiques de la session 2024 pour la série C."
  },
  {
    id: "sample-pc-1ere-d-2023",
    title: "Probatoire Physique-Chimie Première D 2023",
    subject: "Physique",
    classLevel: "1ère",
    year: 2023,
    examType: "Probatoire",
    session: "1er Trimestre",
    system: "apc",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    fileName: "Physique_1ereD_Prob_2023.pdf",
    fileSize: 1890000,
    fileSizeFormatted: "1.89 MB",
    contentHash: "hash_pc_2023",
    uploadDate: { seconds: Math.floor(Date.now()/1000), nanoseconds: 0, toDate: () => new Date() } as any,
    downloads: 98,
    tags: ["Physique", "Probatoire"],
    description: "Sujet de révision Physique-Chimie Première D."
  },
  {
    id: "sample-svt-tle-d-2024",
    title: "Baccalauréat SVT Terminale D 2024",
    subject: "SVT",
    classLevel: "Terminale",
    year: 2024,
    examType: "Baccalauréat",
    session: "Annuel",
    system: "apc",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    fileName: "SVT_TleD_Bac_2024.pdf",
    fileSize: 3100000,
    fileSizeFormatted: "3.10 MB",
    contentHash: "hash_svt_2024",
    uploadDate: { seconds: Math.floor(Date.now()/1000), nanoseconds: 0, toDate: () => new Date() } as any,
    downloads: 215,
    tags: ["SVT", "Bac", "Tle D"],
    description: "Épreuve complète des Sciences de la Vie et de la Terre."
  },
  {
    id: "sample-info-3eme-2024",
    title: "BEPC Informatique 3ème 2024",
    subject: "Informatique",
    classLevel: "3ème",
    year: 2024,
    examType: "BEPC",
    session: "2ème Trimestre",
    system: "apc",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    fileName: "Informatique_3eme_BEPC_2024.pdf",
    fileSize: 1200000,
    fileSizeFormatted: "1.20 MB",
    contentHash: "hash_info_2024",
    uploadDate: { seconds: Math.floor(Date.now()/1000), nanoseconds: 0, toDate: () => new Date() } as any,
    downloads: 74,
    tags: ["Informatique", "BEPC"],
    description: "Sujet BEPC Informatique théorique et pratique."
  },
  {
    id: "sample-philo-tle-a-2024",
    title: "Baccalauréat Philosophie Terminale A 2024",
    subject: "Philosophie",
    classLevel: "Terminale",
    year: 2024,
    examType: "Baccalauréat",
    session: "Annuel",
    system: "apc",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    fileName: "Philo_TleA_Bac_2024.pdf",
    fileSize: 1450000,
    fileSizeFormatted: "1.45 MB",
    contentHash: "hash_philo_2024",
    uploadDate: { seconds: Math.floor(Date.now()/1000), nanoseconds: 0, toDate: () => new Date() } as any,
    downloads: 160,
    tags: ["Philosophie", "Bac", "Tle A"],
    description: "Sujets de dissertation et étude de texte Philosophie."
  },
  {
    id: "sample-dnb-maths-2024",
    title: "Diplôme National du Brevet (DNB) Mathématiques 2024",
    subject: "Mathématiques",
    classLevel: "3ème",
    year: 2024,
    examType: "Brevet",
    session: "Annuel",
    system: "french",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    fileName: "DNB_Maths_2024.pdf",
    fileSize: 1900000,
    fileSizeFormatted: "1.90 MB",
    contentHash: "hash_dnb_maths",
    uploadDate: { seconds: Math.floor(Date.now()/1000), nanoseconds: 0, toDate: () => new Date() } as any,
    downloads: 310,
    tags: ["DNB", "Brevet", "AEFE"],
    description: "Sujet métropole DNB Mathématiques."
  },
  {
    id: "sample-gst-101-2024",
    title: "GST 101: Use of English & Communication Skills 2024",
    subject: "English",
    classLevel: "100",
    year: 2024,
    examType: "Semester Exam",
    session: "First Semester",
    system: "nigerian_university",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    fileName: "GST101_Past_Questions_2024.pdf",
    fileSize: 1500000,
    fileSizeFormatted: "1.50 MB",
    contentHash: "hash_gst101",
    uploadDate: { seconds: Math.floor(Date.now()/1000), nanoseconds: 0, toDate: () => new Date() } as any,
    downloads: 410,
    tags: ["GST101", "100 Level", "Nigerian Uni"],
    description: "General Studies 101 past exam questions and answers."
  },
  {
    id: "sample-mat-101-2024",
    title: "MAT 101: General Mathematics I (Algebra & Trigonometry)",
    subject: "Mathematics",
    classLevel: "100",
    year: 2024,
    examType: "Semester Exam",
    session: "First Semester",
    system: "nigerian_university",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    fileName: "MAT101_Past_Questions_2024.pdf",
    fileSize: 2200000,
    fileSizeFormatted: "2.20 MB",
    contentHash: "hash_mat101",
    uploadDate: { seconds: Math.floor(Date.now()/1000), nanoseconds: 0, toDate: () => new Date() } as any,
    downloads: 480,
    tags: ["MAT101", "100 Level"],
    description: "MAT 101 university semester past paper."
  }
];

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
      system: paper.system || 'apc',
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
      preview_url: paper.preview_url,
      classLevels: paper.class_levels as any,
      subjects: paper.subjects,
    };
  }

  /**
   * Fetch all exam papers from Supabase
   */
  async fetchPapers(): Promise<ExamPaper[]> {
    try {
      console.log('📥 ExamService: Fetching papers from Supabase...');
      console.log('🔗 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

      const { data, error, count } = await supabase
        .from('exam_papers')
        .select('*', { count: 'exact' })
        .order('year', { ascending: false });

      console.log('📊 ExamService: Supabase response:', {
        error: error ? error.message : null,
        errorDetails: error ? error : null,
        dataReceived: !!data,
        dataLength: data?.length ?? 0,
        dataType: Array.isArray(data) ? 'array' : typeof data,
        count: count,
        firstRow: data && data.length > 0 ? data[0] : null
      });

      if (error) {
        console.error('❌ ExamService: Supabase fetch error:', error.message, error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ ExamService: Query returned ZERO papers from database');
        console.warn('💡 This means either:');
        console.warn('  1. The table is empty (no INSERT statements ran)');
        console.warn('  2. RLS policies are blocking access (check Supabase dashboard)');
        console.warn('  3. Wrong table name or schema');
        console.warn('⚠️ Falling back to SAMPLE_PAPERS (8 hardcoded papers)');
        return SAMPLE_PAPERS;
      }

      console.log(`✅ ExamService: Successfully fetched ${data.length} papers from Supabase`);
      const papers = (data as SupabasePaper[]).map(p => this.convertToExamPaper(p));

      console.log('📄 ExamService: Converted papers:', {
        total: papers.length,
        firstPaper: papers[0] ? {
          id: papers[0].id,
          title: papers[0].title,
          classLevel: papers[0].classLevel,
          subject: papers[0].subject
        } : null,
        classCounts: papers.reduce((acc, p) => {
          acc[p.classLevel] = (acc[p.classLevel] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });

      try {
        await cacheService.cachePapers(papers);
        console.log('💾 ExamService: Papers cached successfully');
      } catch (cacheError) {
        console.warn('⚠️ ExamService: Failed to cache papers:', cacheError);
      }

      return papers;
    } catch (error) {
      console.error('❌ ExamService: Failed to fetch papers from network:', error);

      // A catalogue published next to the PDFs (R2/CDN) keeps real file URLs,
      // so it wins over the IndexedDB cache while the database is unreachable.
      const staticRows = await fetchStaticPaperRows();
      if (staticRows.length > 0) {
        console.log(`☁️ ExamService: Using ${staticRows.length} papers from the static catalogue`);
        const papers = staticRows.map((p) => this.convertToExamPaper(p));
        try {
          await cacheService.cachePapers(papers);
        } catch (cacheError) {
          console.warn('⚠️ ExamService: Failed to cache static catalogue:', cacheError);
        }
        return papers;
      }

      // Offline (or no catalogue configured): fall back to the cache
      const cachedPapers = await this.getCachedPapers();
      if (cachedPapers.length > 0) {
        console.log(`📦 ExamService: Using ${cachedPapers.length} cached papers`);
        return cachedPapers.map(this.convertCachedToExamPaper);
      }

      console.log('ℹ️ ExamService: Returning fallback sample papers (8 papers)');
      return SAMPLE_PAPERS;
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

      // Class and subject are multi-value (one PDF can belong to 1ère C and
      // 1ère D, or cover Histoire and Géographie). Filter them in JS.
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

      let papers = (data as SupabasePaper[]).map(p => this.convertToExamPaper(p));
      if (filters.classLevel) {
        papers = papers.filter((p) => paperMatchesClassFilter(p, filters.classLevel));
      }
      if (filters.subject) {
        papers = papers.filter((p) => paperMatchesSubjectFilter(p, filters.subject));
      }
      return papers;
    } catch (error) {
      console.error('Failed to fetch filtered papers:', error);
      // Fallback to client-side filtering of cached data
      const cachedPapers = await this.getCachedPapers();
      if (cachedPapers.length > 0) {
        return this.filterPapersClientSide(cachedPapers, filters);
      }
      const staticRows = await fetchStaticPaperRows();
      return staticRows
        .map((p) => this.convertToExamPaper(p))
        .filter((paper) => this.matchesFilters(paper, filters));
    }
  }

  private matchesFilters(paper: ExamPaper, filters: FilterCriteria): boolean {
    if (filters.classLevel && !paperMatchesClassFilter(paper, filters.classLevel)) return false;
    if (filters.subject && !paperMatchesSubjectFilter(paper, filters.subject)) return false;
    if (filters.year && paper.year !== filters.year) return false;
    if (filters.examType && paper.examType !== filters.examType) return false;
    return true;
  }

  /**
   * Client-side filtering helper
   */
  private filterPapersClientSide(papers: CachedPaper[], filters: FilterCriteria): ExamPaper[] {
    const filtered = papers.filter(paper => {
      if (filters.classLevel && !paperMatchesClassFilter(paper, filters.classLevel)) return false;
      if (filters.subject && !paperMatchesSubjectFilter(paper, filters.subject)) return false;
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
      fileUrl: cached.fileUrl ?? '',
      fileName: cached.fileName ?? '',
      fileSize: cached.fileSize,
      fileSizeFormatted: cached.fileSizeFormatted,
      contentHash: cached.contentHash ?? '',
      uploadDate: {
        seconds: new Date(cached.uploadDate).getTime() / 1000,
        nanoseconds: 0,
        toDate: () => new Date(cached.uploadDate)
      } as any,
      downloads: cached.downloads,
      tags: cached.tags,
      description: cached.description,
      preview_url: cached.preview_url,
      classLevels: cached.classLevels,
      subjects: cached.subjects,
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
        .maybeSingle();

      if (!error && data) {
        return this.convertToExamPaper(data as SupabasePaper);
      }
    } catch (error) {
      console.warn('Supabase get paper notice:', error);
    }

    // Check sample papers
    const sampleMatch = SAMPLE_PAPERS.find((p) => p.id === paperId);
    if (sampleMatch) return sampleMatch;

    // Check the published static catalogue first: it carries the real file URL,
    // while a cache entry written before the catalogue fallback may not.
    const staticRows = await fetchStaticPaperRows();
    const staticMatch = staticRows.find((p) => p.id === paperId);
    if (staticMatch) return this.convertToExamPaper(staticMatch);

    // Check cached papers
    const cachedPapers = await this.getCachedPapers();
    const cachedMatch = cachedPapers.find((p) => p.id === paperId);
    if (cachedMatch) return this.convertCachedToExamPaper(cachedMatch);

    return null;
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
