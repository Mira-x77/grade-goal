import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { WifiOff, RefreshCw, Download } from "lucide-react";
import { PaperGrid } from "@/components/exam/PaperGrid";
import { PaperFilters } from "@/components/exam/PaperFilters";
import { PaperSearch } from "@/components/exam/PaperSearch";
import { SubscriptionDetailDialog } from "@/components/subscription/SubscriptionDetailDialog";
import { PremiumCodeDialog } from "@/components/subscription/PremiumCodeDialog";
import TaskBar from "@/components/TaskBar";
import { examService } from "@/services/examService";
import { cacheService } from "@/services/cacheService";
import { loadState } from "@/lib/storage";
import { FilterCriteria, ExamPaper, CachedPaper } from "@/types/exam-library";
import { t } from "@/lib/i18n";

// Pagination constants
const PAPERS_PER_PAGE = 50;

const Library = () => {
  const navigate = useNavigate();

  // Load user profile once — class level and subject names
  const userState = loadState();
  const userClassLevel = userState?.classLevel ?? null;
  const userSubjectNames = userState?.subjects?.map(s => s.name) ?? [];

  const [papers, setPapers] = useState<(ExamPaper | CachedPaper)[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<(ExamPaper | CachedPaper)[]>([]);
  const [displayedPapers, setDisplayedPapers] = useState<(ExamPaper | CachedPaper)[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterCriteria>({});
  const [subjects, setSubjects] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [downloadedPaperIds, setDownloadedPaperIds] = useState<Set<string>>(new Set());
  
  // Subscription dialogs
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);

  // Monitor online/offline status
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

  // Load papers on mount
  useEffect(() => {
    loadPapers();
    loadFilterState();
    loadDownloadedPapers();
  }, []);

  // Apply pagination when filtered papers change
  useEffect(() => {
    const startIndex = (currentPage - 1) * PAPERS_PER_PAGE;
    const endIndex = startIndex + PAPERS_PER_PAGE;
    setDisplayedPapers(filteredPapers.slice(startIndex, endIndex));
  }, [filteredPapers, currentPage]);

  const loadPapers = async () => {
    try {
      setLoading(true);
      console.log('🔄 Library: Starting to load papers...');
      const fetchedPapers = await examService.fetchPapers();
      console.log('✅ Library: Loaded papers:', fetchedPapers.length);
      setPapers(fetchedPapers);

      // Years from papers matching user's class
      const classFiltered = userClassLevel
        ? fetchedPapers.filter(p => p.classLevel === userClassLevel)
        : fetchedPapers;
      const uniqueYears = Array.from(new Set(classFiltered.map(p => p.year))).sort((a, b) => b - a);
      setYears(uniqueYears);

      // Subjects: user's own subjects that exist in the library for their class
      const availableSubjects = new Set(classFiltered.map(p => p.subject));
      const filteredSubjects = userSubjectNames.length > 0
        ? userSubjectNames.filter(s => availableSubjects.has(s))
        : Array.from(availableSubjects).sort();
      setSubjects(filteredSubjects);
    } catch (error) {
      console.error('❌ Library: Failed to load papers:', error);
      
      // Load from cache - don't show error toast if cache is empty (first time)
      try {
        const cachedPapers = await cacheService.getCachedPapers();
        console.log('📦 Library: Loaded from cache:', cachedPapers.length);
        setPapers(cachedPapers);
        if (cachedPapers.length === 0) {
          console.log('ℹ️ Library: No papers in database yet');
        }
      } catch (cacheError) {
        console.error('❌ Library: Failed to load from cache:', cacheError);
        setPapers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFilterState = async () => {
    const savedFilters = await cacheService.getFilterState();
    if (savedFilters) {
      setFilters(savedFilters);
    }
  };

  const loadDownloadedPapers = async () => {
    const cachedPapers = await cacheService.getCachedPapers();
    const downloaded = new Set(
      cachedPapers.filter(p => p.isDownloaded).map(p => p.id)
    );
    setDownloadedPaperIds(downloaded);
  };

  const applyFiltersAndSearch = useCallback(() => {
    let result = [...papers];

    // Filter out downloaded papers
    result = result.filter(p => !downloadedPaperIds.has(p.id));

    // Always filter by user's class level
    if (userClassLevel) {
      result = result.filter(p => p.classLevel === userClassLevel);
    }

    // Apply remaining filters
    if (filters.subject) {
      result = result.filter(p => p.subject === filters.subject);
    }
    if (filters.year) {
      result = result.filter(p => p.year === filters.year);
    }
    if (filters.examType) {
      result = result.filter(p => p.examType === filters.examType);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.subject.toLowerCase().includes(query)
      );
    }

    setFilteredPapers(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [papers, filters, searchQuery, downloadedPaperIds]);

  // Apply filters and search when dependencies change
  useEffect(() => {
    applyFiltersAndSearch();
  }, [applyFiltersAndSearch]);

  const handleFilterChange = async (newFilters: FilterCriteria) => {
    setFilters(newFilters);
    await cacheService.saveFilterState(newFilters);
  };

  const handleClearFilters = async () => {
    setFilters({});
    await cacheService.saveFilterState({});
  };

  const handlePaperClick = (paperId: string) => {
    navigate(`/library/${paperId}`);
  };

  const handleRetry = () => {
    loadPapers();
  };

  const totalPages = Math.ceil(filteredPapers.length / PAPERS_PER_PAGE);
  const showPagination = filteredPapers.length > PAPERS_PER_PAGE;

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="safe-area-top pb-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start justify-between"
          >
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-black text-foreground">{t("examLibrary")}</h1>
                <p className="text-sm font-semibold text-muted-foreground">
                  {t("browseDownloadPapers")}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/my-downloads")}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 active:scale-95 transition-transform"
            >
              <Download className="h-5 w-5 text-primary" />
            </button>
          </motion.div>
        </div>

        {/* Offline Indicator */}
        {!isOnline && (
          <div className="mb-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-warning/15 p-3 border-2 border-warning/30 flex items-center gap-2"
            >
              <WifiOff className="h-4 w-4 text-warning" />
              <span className="text-xs font-bold text-warning">
                {t("offlineMode")}
              </span>
            </motion.div>
          </div>
        )}

        <div className="flex flex-col gap-4 pb-8">
          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <PaperSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t("searchByTitle")}
            />
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <PaperFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClear={handleClearFilters}
              subjects={subjects}
              years={years}
            />
          </motion.div>

          {/* Papers Grid */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Results Count */}
            {!loading && (
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground/70 tracking-wide">
                  About {filteredPapers.length.toLocaleString()} {filteredPapers.length === 1 ? t("paperFound") : t("papersFound")}
                  {showPagination && (
                    <span className="ml-1">
                      &middot; {t("page")} {currentPage} {t("of")} {totalPages}
                    </span>
                  )}
                </p>
                {!isOnline && (
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1 text-xs font-bold text-primary active:scale-95 transition-transform"
                  >
                    <RefreshCw className="h-3 w-3" />
                    {t("retry")}
                  </button>
                )}
              </div>
            )}
            <PaperGrid
              papers={displayedPapers}
              onPaperClick={handlePaperClick}
              loading={loading}
              downloadedPaperIds={downloadedPaperIds}
            />
          </motion.div>

          {/* Pagination Controls */}
          {showPagination && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-between gap-4 pt-4"
            >
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="flex-1 bg-card rounded-xl py-3 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
              >
                {t("previous")}
              </button>
              <div className="text-sm font-bold text-muted-foreground whitespace-nowrap">
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="flex-1 bg-card rounded-xl py-3 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
              >
                {t("next")}
              </button>
            </motion.div>
          )}
        </div>
      </div>

      <TaskBar />
      
      {/* Subscription Dialogs */}
      <SubscriptionDetailDialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        onUpgrade={() => {
          setShowDetailDialog(false);
          setShowCodeDialog(true);
        }}
      />
      
      <PremiumCodeDialog
        open={showCodeDialog}
        onClose={() => setShowCodeDialog(false)}
        onSuccess={() => {
          // Refresh the page to update badge
          window.location.reload();
        }}
      />
    </div>
  );
};

export default Library;
