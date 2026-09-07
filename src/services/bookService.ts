import { supabase } from '@/integrations/supabase/client';
import { LibraryBook, BookFilterCriteria, CachedBook } from '@/types/exam-library';
import { cacheService } from './cacheService';

interface SupabaseBook {
  id: string;
  title: string;
  author: string | null;
  subject: string;
  category: string;
  system: string;
  class_level: string | null;
  description: string | null;
  cover_url: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  file_size_formatted: string;
  tags: string[];
  downloads: number;
  published_year: number | null;
  created_at: string;
}

const SAMPLE_BOOKS: LibraryBook[] = [
  {
    id: "sample-book-math-tle",
    title: "Guide Pédagogique Mathématiques Terminale C & D",
    author: "Collection CIAM / EDICEF",
    subject: "Mathématiques",
    category: "Manuel Scolaire",
    system: "apc",
    class_level: "Terminale",
    description: "Manuel officiel CIAM complet couvrant l'analyse, l'algèbre et la géométrie vectorielle.",
    cover_url: null,
    file_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    file_name: "CIAM_Maths_Terminale.pdf",
    file_size: 4500000,
    file_size_formatted: "4.50 MB",
    tags: ["Maths", "CIAM", "Tle"],
    downloads: 320,
    published_year: 2023,
    created_at: new Date().toISOString()
  },
  {
    id: "sample-book-pc-1ere",
    title: "Physique Chimie Collection Eurin-Gié 1ère",
    author: "Eurin-Gié",
    subject: "Physique",
    category: "Manuel Scolaire",
    system: "apc",
    class_level: "1ère",
    description: "Mécanique, électricité, optique et chimie organique avec exercices corrigés.",
    cover_url: null,
    file_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    file_name: "Eurin_Gie_Physique_1ere.pdf",
    file_size: 3800000,
    file_size_formatted: "3.80 MB",
    tags: ["Physique", "Chimie", "1ère"],
    downloads: 210,
    published_year: 2022,
    created_at: new Date().toISOString()
  }
];

class BookService {
  /**
   * Convert Supabase book to LibraryBook format
   */
  private convertToLibraryBook(book: SupabaseBook): LibraryBook {
    return {
      id: book.id,
      title: book.title,
      author: book.author,
      subject: book.subject,
      category: book.category,
      system: book.system,
      class_level: book.class_level,
      description: book.description,
      cover_url: book.cover_url,
      file_url: book.file_url,
      file_name: book.file_name,
      file_size: book.file_size,
      file_size_formatted: book.file_size_formatted,
      tags: book.tags,
      downloads: book.downloads,
      published_year: book.published_year,
      created_at: book.created_at,
    };
  }

  /**
   * Fetch all books from Supabase
   */
  async fetchBooks(): Promise<LibraryBook[]> {
    try {
      console.log('📚 Fetching books from Supabase...');

      const { data, error } = await supabase
        .from('library_books')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('⚠️ Supabase fetch books notice:', error.message);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('ℹ️ No books in database yet, returning sample books');
        return SAMPLE_BOOKS;
      }

      console.log(`✅ Fetched ${data.length} books from Supabase`);

      const books = (data as SupabaseBook[]).map(b => this.convertToLibraryBook(b));

      try {
        await cacheService.cacheBooks(books);
      } catch (cacheError) {
        console.warn('⚠️ Failed to cache books:', cacheError);
      }

      return books;
    } catch (error) {
      console.error('Failed to fetch books:', error);
      const cachedBooks = await this.getCachedBooks();

      if (cachedBooks.length > 0) {
        console.log(`📦 Using ${cachedBooks.length} cached books`);
        return cachedBooks.map(this.convertCachedToLibraryBook);
      }

      console.log('ℹ️ Returning fallback sample books');
      return SAMPLE_BOOKS;
    }
  }

  /**
   * Fetch books with filters applied
   */
  async getBooks(filters?: BookFilterCriteria): Promise<LibraryBook[]> {
    try {
      let query = supabase
        .from('library_books')
        .select('*');

      // Apply filters
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.subject) {
        query = query.eq('subject', filters.subject);
      }
      if (filters?.system) {
        query = query.eq('system', filters.system);
      }
      if (filters?.classLevel) {
        query = query.eq('class_level', filters.classLevel);
      }

      // Order by creation date descending
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Supabase filter books error:', error);
        throw error;
      }

      return (data as SupabaseBook[]).map(b => this.convertToLibraryBook(b));
    } catch (error) {
      console.error('Failed to fetch filtered books:', error);
      // Fallback to client-side filtering of cached data
      const cachedBooks = await this.getCachedBooks();
      return this.filterBooksClientSide(cachedBooks, filters);
    }
  }

  /**
   * Client-side filtering helper
   */
  private filterBooksClientSide(books: CachedBook[], filters?: BookFilterCriteria): LibraryBook[] {
    if (!filters) return books.map(this.convertCachedToLibraryBook);

    const filtered = books.filter(book => {
      if (filters.category && book.category !== filters.category) return false;
      if (filters.subject && book.subject !== filters.subject) return false;
      if (filters.classLevel && book.category !== filters.classLevel) return false;
      // Note: system filtering not available in cached books
      return true;
    });

    return filtered.map(this.convertCachedToLibraryBook);
  }

  /**
   * Convert CachedBook to LibraryBook format
   */
  private convertCachedToLibraryBook(cached: CachedBook): LibraryBook {
    return {
      id: cached.id,
      title: cached.title,
      author: cached.author,
      subject: cached.subject,
      category: cached.category,
      system: '', // Not available in cached data
      class_level: null, // Not available in cached data
      description: null, // Not available in cached data
      cover_url: null, // Not available in cached data
      file_url: '',
      file_name: '',
      file_size: cached.fileSize,
      file_size_formatted: cached.fileSizeFormatted,
      tags: cached.tags,
      downloads: cached.downloads,
      published_year: cached.publishedYear,
      created_at: cached.lastFetched
    };
  }

  /**
   * Search books by title, author, or subject
   */
  async searchBooks(searchQuery: string): Promise<LibraryBook[]> {
    try {
      const { data, error } = await supabase
        .from('library_books')
        .select('*')
        .or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase search books error:', error);
        throw error;
      }

      return (data as SupabaseBook[]).map(b => this.convertToLibraryBook(b));
    } catch (error) {
      console.error('Failed to search books:', error);
      // Fallback to client-side search
      const allBooks = await this.fetchBooks();
      const searchLower = searchQuery.toLowerCase();
      return allBooks.filter(book =>
        book.title.toLowerCase().includes(searchLower) ||
        (book.author && book.author.toLowerCase().includes(searchLower)) ||
        book.subject.toLowerCase().includes(searchLower)
      );
    }
  }

  /**
   * Get single book by ID
   */
  async getBook(bookId: string): Promise<LibraryBook | null> {
    try {
      const { data, error } = await supabase
        .from('library_books')
        .select('*')
        .eq('id', bookId)
        .single();

      if (error) {
        console.error('Supabase get book error:', error);
        return null;
      }

      return this.convertToLibraryBook(data as SupabaseBook);
    } catch (error) {
      console.error('Failed to fetch book:', error);

      // Fallback to cached data
      const cachedBooks = await cacheService.getCachedBooks();
      const cachedBook = cachedBooks.find(b => b.id === bookId);

      if (cachedBook) {
        return this.convertCachedToLibraryBook(cachedBook);
      }

      return null;
    }
  }

  /**
   * Get cached books from IndexedDB (offline mode)
   */
  async getCachedBooks(): Promise<CachedBook[]> {
    return cacheService.getCachedBooks();
  }

  /**
   * Increment download count in Supabase
   */
  async incrementDownloadCount(bookId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_book_downloads', { book_id: bookId });

      if (error) {
        console.error('Failed to increment book download count:', error);
      }
    } catch (error) {
      console.error('Failed to increment book download count:', error);
      // Silently fail - analytics are not critical
    }
  }

  /**
   * Get unique categories from all books
   */
  async getUniqueCategories(): Promise<string[]> {
    const books = await this.fetchBooks();
    const categories = new Set(books.map(b => b.category));
    return Array.from(categories).sort();
  }

  /**
   * Get unique subjects from all books
   */
  async getUniqueSubjects(): Promise<string[]> {
    const books = await this.fetchBooks();
    const subjects = new Set(books.map(b => b.subject));
    return Array.from(subjects).sort();
  }

  /**
   * Get books by system (for filtering by grading system)
   */
  async getBooksBySystem(system: string): Promise<LibraryBook[]> {
    return this.getBooks({ system });
  }

  /**
   * Get books by category
   */
  async getBooksByCategory(category: string): Promise<LibraryBook[]> {
    return this.getBooks({ category });
  }

  /**
   * Get books by subject
   */
  async getBooksBySubject(subject: string): Promise<LibraryBook[]> {
    return this.getBooks({ subject });
  }
}

export const bookService = new BookService();