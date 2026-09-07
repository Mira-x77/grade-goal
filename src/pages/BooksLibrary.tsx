import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Search, X, ArrowLeft, WifiOff, Download, Check, Share2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { loadState } from '@/lib/storage';
import { toast } from 'sonner';
import { InAppPDFViewer } from '@/components/exam/InAppPDFViewer';
import { BookGrid } from '@/components/library/BookGrid';
import TaskBar from '@/components/TaskBar';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePremium } from '@/contexts/AppConfigContext';
import { LibraryBook, UnifiedDownloadProgress, DownloadStatus } from '@/types/exam-library';
import { bookService } from '@/services/bookService';
import { downloadService } from '@/services/downloadService';
import { fileShareService } from '@/services/fileShareService';
import { readBookFileAsBase64 } from '@/lib/filesystem';
import { cacheService } from '@/services/cacheService';

export default function BooksLibrary() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { requirePremium } = usePremium();

  // Get grading system for badge display
  const userState = loadState();
  const gradingSystem = userState?.settings?.gradingSystem ?? 'apc';

  // Analytics: Track page view (lazy loaded)
  useEffect(() => {
    import('@/services/analyticsService')
      .then(({ analyticsService }) => {
        analyticsService.trackPageView('books_library', '/library/books').catch(() => {});
      })
      .catch(() => {});
  }, []);

  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentPDF, setCurrentPDF] = useState<{ data: string; title: string } | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  // Download state management
  const [downloadStatuses, setDownloadStatuses] = useState<Map<string, DownloadStatus>>(new Map());
  const [downloadProgresses, setDownloadProgresses] = useState<Map<string, UnifiedDownloadProgress>>(new Map());
  const [downloadedBookIds, setDownloadedBookIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleOnline  = () => { setIsOffline(false); loadBooks(); };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    if (navigator.onLine) {
      loadBooks();
    } else {
      setLoading(false);
    }
    loadDownloadStatuses();
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadBooks = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('📥 BooksLibrary: Fetching from Supabase...');

      const state = loadState();
      const gradingSystem = state?.settings?.gradingSystem ?? 'apc';
      let mappedSystem = 'apc';
      if (gradingSystem === 'french' || gradingSystem === 'aefe') mappedSystem = 'french';
      if (gradingSystem === 'nigerian_university') mappedSystem = 'english';

      // Use bookService to fetch books with system filtering
      const fetchedBooks = await bookService.getBooks({ system: mappedSystem });
      const allSystemBooks = await bookService.getBooks({ system: 'all' });
      
      const combinedBooks = [...fetchedBooks, ...allSystemBooks];
      const uniqueBooks = combinedBooks.filter((book, index, self) => 
        index === self.findIndex(b => b.id === book.id)
      );

      if (uniqueBooks.length > 0) {
        console.log(`✅ BooksLibrary: Fetched ${uniqueBooks.length} books`);
        setBooks(uniqueBooks);
      } else {
        console.log('[BooksLibrary] No system matches, fetching all/sample books');
        const fallbackBooks = await bookService.fetchBooks();
        setBooks(fallbackBooks);
      }
    } catch (err) {
      console.warn('[BooksLibrary] Failed to load books, using sample fallback:', err);
      const fallbackBooks = await bookService.fetchBooks();
      setBooks(fallbackBooks);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    console.log('🔄 Refreshing books from server...');
    try {
      // Clear cache first
      await cacheService.clearAllBooks();
      console.log('✅ Books cache cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear books cache:', error);
    }
    await loadBooks();
    toast.success('Books refreshed');
  };

  const loadDownloadStatuses = async () => {
    try {
      const downloadedBooks = await downloadService.getDownloadedBooks();
      const downloadedIds = new Set(downloadedBooks.map(b => b.bookId));
      setDownloadedBookIds(downloadedIds);

      // Update download statuses
      const statuses = new Map<string, DownloadStatus>();
      downloadedBooks.forEach(book => {
        statuses.set(book.bookId, {
          isDownloaded: true,
          isDownloading: false,
          localPath: book.localPath
        });
      });
      setDownloadStatuses(statuses);
    } catch (error) {
      console.error('Failed to load download statuses:', error);
    }
  };

  const handleOpenBook = (book: LibraryBook) => {
    // Navigate to book detail page
    navigate(`/book/${book.id}`);
  };

  const handleDownloadBook = async (book: LibraryBook) => {
    requirePremium(async () => {
    try {
      // Set downloading status
      setDownloadStatuses(prev => new Map(prev.set(book.id, {
        isDownloaded: false,
        isDownloading: true
      })));

      await downloadService.downloadBook(book, (progress) => {
        setDownloadProgresses(prev => new Map(prev.set(book.id, progress)));
        
        if (progress.status === 'completed') {
          // Update download status
          setDownloadStatuses(prev => new Map(prev.set(book.id, {
            isDownloaded: true,
            isDownloading: false,
            localPath: `books/${book.file_name}`
          })));
          
          setDownloadedBookIds(prev => new Set(prev.add(book.id)));
          setDownloadProgresses(prev => {
            const newMap = new Map(prev);
            newMap.delete(book.id);
            return newMap;
          });
          
          toast.success(`"${book.title}" downloaded successfully`);
        }
      });
    } catch (err) {
      console.error("Download failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Download failed. Please try again.";
      
      // Reset download status on error
      setDownloadStatuses(prev => new Map(prev.set(book.id, {
        isDownloaded: false,
        isDownloading: false
      })));
      
      setDownloadProgresses(prev => {
        const newMap = new Map(prev);
        newMap.delete(book.id);
        return newMap;
      });
      
      // Check if it's a quota error
      if (errorMessage.includes('Download limit reached') || errorMessage.includes('limit reached')) {
        toast.error(t("downloadLimitReached") || "Download limit reached. Upgrade to premium for unlimited downloads.");
      } else {
        toast.error(`Failed to download "${book.title}": ${errorMessage}`);
      }
    }
    });
  };

  const handleCancelDownload = async (bookId: string) => {
    try {
      await downloadService.cancelBookDownload(bookId);
      
      // Reset download status
      setDownloadStatuses(prev => {
        const newMap = new Map(prev);
        newMap.delete(bookId);
        return newMap;
      });
      setDownloadProgresses(prev => {
        const newMap = new Map(prev);
        newMap.delete(bookId);
        return newMap;
      });
      
      toast.info('Download cancelled');
    } catch (error) {
      console.error('Failed to cancel download:', error);
    }
  };

  const handleShareBook = async (book: LibraryBook) => {
    try {
      const downloadInfo = await downloadService.getBookDownloadInfo(book.id);
      if (!downloadInfo) {
        toast.error('Book not downloaded. Please download first to share.');
        return;
      }

      await fileShareService.shareBook(downloadInfo.localPath, book.title);
    } catch (error) {
      console.error('Share failed:', error);
      if (error instanceof Error && !error.message.includes('cancel')) {
        toast.error(error.message);
      }
    }
  };

  const categories = Array.from(new Set(books.map(b => b.category).filter(Boolean))).sort();
  const subjects = Array.from(new Set(books.map(b => b.subject).filter(Boolean))).sort();

  const filtered = books.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      b.title.toLowerCase().includes(q) ||
      (b.author ?? '').toLowerCase().includes(q) ||
      b.subject.toLowerCase().includes(q);
    const matchCategory = !categoryFilter || b.category === categoryFilter;
    const matchSubject = !subjectFilter || b.subject === subjectFilter;
    return matchSearch && matchCategory && matchSubject;
  });

  console.log('Filtered books:', filtered.length, 'from total:', books.length);

  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(160);

  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setHeaderHeight(entry.target.clientHeight);
      }
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex-1 bg-background min-h-screen pb-24">
      {/* Header */}
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-20 bg-background/90 backdrop-blur-lg border-b border-border pb-3 safe-area-top">
        <div className="header-inner">
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => navigate(-1)}
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-muted active:scale-95 transition-transform shrink-0"
            >
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-black text-foreground">Books</h1>
              <p className="text-xs font-semibold text-muted-foreground">Textbooks & study guides</p>
              {/* System Badge */}
              <div className="mt-1.5">
                {gradingSystem === "apc" && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30">
                    <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                    <span className="text-[10px] font-bold text-blue-400">APC System</span>
                  </div>
                )}
                {gradingSystem === "french" && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30">
                    <div className="w-1 h-1 rounded-full bg-purple-500"></div>
                    <span className="text-[10px] font-bold text-purple-400">French System</span>
                  </div>
                )}
                {gradingSystem === "nigerian_university" && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30">
                    <div className="w-1 h-1 rounded-full bg-green-500"></div>
                    <span className="text-[10px] font-bold text-green-400">Nigerian System</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-card border-2 border-foreground active:scale-95 transition-transform shrink-0 disabled:opacity-50"
              title="Refresh books"
            >
              <RefreshCw className={`h-4 w-4 text-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search */}
          {books.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search books, authors..."
                  className="w-full bg-card border-2 border-foreground rounded-2xl py-2.5 pl-9 pr-10 text-sm font-semibold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filter pills */}
              {(categories.length > 1 || subjects.length > 1) && (
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(prev => prev === cat ? '' : cat)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black border-2 transition-all active:scale-95 ${
                        categoryFilter === cat
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-card text-foreground border-foreground/30'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  {subjects.map(sub => (
                    <button
                      key={sub}
                      onClick={() => setSubjectFilter(prev => prev === sub ? '' : sub)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black border-2 transition-all active:scale-95 ${
                        subjectFilter === sub
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-foreground border-foreground/30'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="content-col pb-36" style={{ paddingTop: headerHeight + 12 }}>
        {isOffline && (
          <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <WifiOff className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-black text-foreground">You're offline</p>
              <p className="text-sm font-semibold text-muted-foreground mt-1">
                Can't load books without a connection.
              </p>
              <p className="text-sm font-semibold text-muted-foreground">
                Connect to the internet to browse books.
              </p>
            </div>
          </div>
        )}

        {!isOffline && error && (
          <div className="py-12 text-center">
            <div className="bg-muted/50 rounded-2xl p-8">
              <p className="text-lg font-bold text-foreground mb-2">Couldn't load books</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <button onClick={loadBooks} className="text-sm font-black text-primary active:scale-95 transition-transform">
                Retry
              </button>
            </div>
          </div>
        )}

        {!isOffline && !error && books.length > 0 && filtered.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-sm font-bold text-muted-foreground">No results for "{search}"</p>
          </div>
        )}

        {!isOffline && !error && (
          <>
            {!loading && filtered.length > 0 && (
              <div className="space-y-3 pt-3">
                <p className="text-xs text-muted-foreground font-bold">
                  {filtered.length} {filtered.length === 1 ? 'book' : 'books'}
                </p>
              </div>
            )}
            <BookGrid
              books={filtered}
              onBookClick={handleOpenBook}
              loading={loading}
              openingId={openingId}
              downloadStatuses={downloadStatuses}
              downloadProgresses={downloadProgresses}
              onDownload={handleDownloadBook}
              onCancelDownload={handleCancelDownload}
              onShare={handleShareBook}
            />
          </>
        )}
      </div>

      {showPDFViewer && currentPDF && currentPDF.data !== 'loading' && (
        <InAppPDFViewer
          pdfData={currentPDF.data}
          fileName={currentPDF.title}
          onClose={() => { setShowPDFViewer(false); setCurrentPDF(null); }}
        />
      )}

      <TaskBar showBack />
    </div>
  );
}
