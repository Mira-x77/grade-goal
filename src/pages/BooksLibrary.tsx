import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Search, X, ArrowLeft, WifiOff, Download, Check, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { loadState } from '@/lib/storage';
import { toast } from 'sonner';
import { InAppPDFViewer } from '@/components/exam/InAppPDFViewer';
import { BookGrid } from '@/components/library/BookGrid';
import TaskBar from '@/components/TaskBar';
import { useLanguage } from '@/contexts/LanguageContext';
import { gradingSystemBadgeLabel } from '@/lib/i18n';
import {
  paperMatchesClassFilter,
  paperMatchesSubjectFilter,
  collectPaperSubjects,
  uniqueClassLevelsFromPapers,
  uniqueSubjectsFromPapers,
} from '@/lib/library-filters';
import { usePremium } from '@/contexts/AppConfigContext';
import { LibraryBook, UnifiedDownloadProgress, DownloadStatus } from '@/types/exam-library';
import { bookService } from '@/services/bookService';
import { downloadService } from '@/services/downloadService';
import { readBookFileAsBase64 } from '@/lib/filesystem';
import { cacheService } from '@/services/cacheService';

export default function BooksLibrary() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
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
  const [classFilter, setClassFilter] = useState('');
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentPDF, setCurrentPDF] = useState<{ data: string; title: string } | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [headerExpanded, setHeaderExpanded] = useState(true);

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

      // Prefer user's system + universal books; fall back to full library
      const [systemBooks, universalBooks, allBooks] = await Promise.all([
        bookService.getBooks({ system: mappedSystem }),
        bookService.getBooks({ system: 'all' }),
        bookService.fetchBooks(),
      ]);

      const combinedBooks = [...systemBooks, ...universalBooks];
      const uniqueBooks = combinedBooks.filter((book, index, self) =>
        index === self.findIndex(b => b.id === book.id)
      );

      const booksToShow = uniqueBooks.length > 0 ? uniqueBooks : allBooks;
      console.log(`✅ BooksLibrary: Showing ${booksToShow.length} books`);
      setBooks(booksToShow);
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
    toast.success(t("booksRefreshed"));
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
      
      toast.info(t("operationCancelled"));
    } catch (error) {
      console.error('Failed to cancel download:', error);
    }
  };

  const categories = Array.from(new Set(books.map(b => b.category).filter(Boolean))).sort();
  const subjects = uniqueSubjectsFromPapers(books);
  const classLevels = uniqueClassLevelsFromPapers(books);

  const filtered = books.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      b.title.toLowerCase().includes(q) ||
      (b.author ?? '').toLowerCase().includes(q) ||
      b.subject.toLowerCase().includes(q) ||
      collectPaperSubjects(b).some(s => s.toLowerCase().includes(q));
    const matchCategory = !categoryFilter || b.category === categoryFilter;
    const matchSubject = !subjectFilter || paperMatchesSubjectFilter(b, subjectFilter);
    const matchClass = paperMatchesClassFilter(b, classFilter || undefined);
    return matchSearch && matchCategory && matchSubject && matchClass;
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
              <h1 className="text-xl font-black text-foreground">{t("booksTitle")}</h1>
              <p className="text-xs font-semibold text-muted-foreground">{t("booksSubtitle")}</p>
              {/* System Badge */}
              <div className="mt-1.5">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30">
                  <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                  <span className="text-[10px] font-bold text-blue-400">
                    {gradingSystemBadgeLabel(gradingSystem, language)}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-card border-2 border-foreground active:scale-95 transition-transform shrink-0 disabled:opacity-50"
              title={t("booksRefreshTitle")}
            >
              <RefreshCw className={`h-4 w-4 text-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setHeaderExpanded(open => !open)}
              aria-expanded={headerExpanded}
              aria-controls="books-header-filters"
              aria-label={headerExpanded ? t("hideFilters") : t("showFilters")}
              className="h-9 w-9 flex items-center justify-center rounded-full bg-card border-2 border-foreground card-shadow active:scale-95 transition-transform shrink-0"
            >
              {headerExpanded ? (
                <ChevronDown className="h-4 w-4 text-foreground" />
              ) : (
                <ChevronUp className="h-4 w-4 text-foreground" />
              )}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {headerExpanded && (
              <motion.div
                key="books-header-filters"
                id="books-header-filters"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
          {/* Search */}
          {books.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t("booksSearchPlaceholder")}
                  className="w-full bg-card border-2 border-foreground rounded-2xl py-2.5 pl-9 pr-10 text-sm font-semibold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filter pills */}
              {(categories.length > 1 || subjects.length > 1 || classLevels.length > 1) && (
                <div className="space-y-2">
                  {categories.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
                      {categories.map(cat => (
                        <button
                          key={`cat-${cat}`}
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
                    </div>
                  )}
                  {subjects.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
                      {subjects.map(sub => (
                        <button
                          key={`sub-${sub}`}
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
                  {classLevels.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
                      {classLevels.map(level => (
                        <button
                          key={`cls-${level}`}
                          onClick={() => setClassFilter(prev => prev === level ? '' : level)}
                          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black border-2 transition-all active:scale-95 ${
                            classFilter === level
                              ? 'bg-secondary text-secondary-foreground border-secondary'
                              : 'bg-card text-foreground border-foreground/30'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
              </motion.div>
            )}
          </AnimatePresence>
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
              <p className="text-lg font-black text-foreground">{t("offlineTitle")}</p>
              <p className="text-sm font-semibold text-muted-foreground mt-1">
                {t("booksOfflineBody")}
              </p>
              <p className="text-sm font-semibold text-muted-foreground">
                {t("booksConnectInternet")}
              </p>
            </div>
          </div>
        )}

        {!isOffline && error && (
          <div className="py-12 text-center">
            <div className="bg-muted/50 rounded-2xl p-8">
              <p className="text-lg font-bold text-foreground mb-2">{t("booksLoadError")}</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <button onClick={loadBooks} className="text-sm font-black text-primary active:scale-95 transition-transform">
                {t("retry")}
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
