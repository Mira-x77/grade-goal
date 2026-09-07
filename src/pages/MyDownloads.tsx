import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trash2,
  FileText,
  HardDrive,
  Search,
  X,
  AlertTriangle,
  Share2,
  CheckCircle2,
  Circle,
  CloudDownload,
  BookOpen,
  Crown,
  Download,
  Check,
  Eye,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { downloadService } from "@/services/downloadService";
import { cacheService } from "@/services/cacheService";
import { examService } from "@/services/examService";
import { fileShareService } from "@/services/fileShareService";
import {
  getCloudOnlyDownloads,
  CloudDownload as CloudDownloadType,
} from "@/services/downloadSyncService";
import {
  CachedPaper,
  CachedBook,
  LibraryBook,
  DownloadStatus,
  UnifiedDownloadProgress,
} from "@/types/exam-library";
import { OpenLocalPdfButton } from "@/components/pdf/OpenLocalPdfButton";
import { formatBytes } from "@/lib/integrity";
import { InAppPDFViewer } from "@/components/exam/InAppPDFViewer";
import {
  readFileAsBase64,
  readBookFileAsBase64,
  getAvailableSpace,
} from "@/lib/filesystem";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsTablet } from "@/hooks/useIsTablet";
import { useAuth } from "@/contexts/AuthContext";
import TaskBar from "@/components/TaskBar";
import { useDownloadQuota } from "@/hooks/useDownloadQuota";
import { usePremium } from "@/contexts/AppConfigContext";
import {
  DownloadQuotaDisplay,
  DownloadQuotaDisplayRef,
} from "@/components/DownloadQuotaDisplay";
import { BookCard } from "@/components/library/BookCard";

const MyDownloads = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const isTablet = useIsTablet();
  const { quota, refreshQuota, canDownload } = useDownloadQuota();
  const { isPremium, openPremiumGate, openDownloadLimitGate } = usePremium();
  const quotaDisplayRef = useRef<DownloadQuotaDisplayRef>(null);
  const [downloadedPapers, setDownloadedPapers] = useState<CachedPaper[]>([]);
  const [downloadedBooks, setDownloadedBooks] = useState<CachedBook[]>([]);
  const [cloudOnlyDownloads, setCloudOnlyDownloads] = useState<
    CloudDownloadType[]
  >([]);
  const [redownloadingId, setRedownloadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState<{
    available: number;
    used: number;
    total: number;
  } | null>(null);
  const [revealedDelete, setRevealedDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "papers" | "books">(
    "all",
  );
  const [examTypeFilter, setExamTypeFilter] = useState("");
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentPDF, setCurrentPDF] = useState<{
    data: string;
    title: string;
  } | null>(null);
  // URL-streaming viewer state (web: papers opened from server URL)
  const [showStreamViewer, setShowStreamViewer] = useState(false);
  const [streamPdfUrl, setStreamPdfUrl] = useState<string | null>(null);
  const [streamPdfTitle, setStreamPdfTitle] = useState("");
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(80);

  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedPapers, setSelectedPapers] = useState<Set<string>>(new Set());
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  const [tempFilters, setTempFilters] = useState({ examType: "" });
  const [appliedFilters, setAppliedFilters] = useState({ examType: "" });
  const hasFilterChanges = tempFilters.examType !== appliedFilters.examType;

  const urlParams = new URLSearchParams(window.location.search);
  const wasOffline = urlParams.get("offline") === "true";
  const [isOffline, setIsOffline] = useState(wasOffline || !navigator.onLine);

  useEffect(() => {
    loadDownloads();
  }, []);

  useEffect(() => {
    setTempFilters({ examType: examTypeFilter });
    setAppliedFilters({ examType: examTypeFilter });
  }, [examTypeFilter]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!headerRef.current) return;
    const ro = new ResizeObserver(() => {
      setHeaderHeight(headerRef.current?.getBoundingClientRect().height ?? 0);
    });
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, [loading]);

  const loadDownloads = async () => {
    try {
      setLoading(true);
      const [cachedPapers, cachedBooks] = await Promise.all([
        cacheService.getCachedPapers(),
        cacheService.getCachedBooks(),
      ]);

      const downloadedPapersData = cachedPapers.filter((p) => p.isDownloaded);
      const downloadedBooksData = cachedBooks.filter((b) => b.isDownloaded);

      setDownloadedPapers(downloadedPapersData);
      setDownloadedBooks(downloadedBooksData);

      let totalUsedBytes = 0;
      for (const paper of downloadedPapersData) {
        totalUsedBytes += paper.fileSize || 0;
      }
      for (const book of downloadedBooksData) {
        totalUsedBytes += book.fileSize || 0;
      }

      // Storage info is best-effort — don't let it block the page
      try {
        const deviceInfo = await getAvailableSpace();
        const used = totalUsedBytes;
        const available =
          deviceInfo.available > 0
            ? deviceInfo.available
            : Math.max(0, deviceInfo.total - deviceInfo.used);
        const total = deviceInfo.total > 0 ? deviceInfo.total : 0;
        setStorageInfo({ used, available, total });
      } catch {
        // Storage API unavailable (incognito / browser restriction) — show used bytes only
        setStorageInfo({ used: totalUsedBytes, available: 0, total: 0 });
      }
      await refreshQuota();

      if (user?.id) {
        const localPaperIds = downloadedPapersData.map((p) => p.id);
        const cloudOnly = await getCloudOnlyDownloads(user.id, localPaperIds);
        setCloudOnlyDownloads(cloudOnly);
      }
    } catch (error) {
      console.error("Failed to load downloads:", error);
      toast.error(t("failedLoadDownloads"));
    } finally {
      setLoading(false);
    }
  };

  const handlePaperClick = async (
    item: CachedPaper | CachedBook,
    type: "paper" | "book",
  ) => {
    if (isMultiSelectMode) {
      if (type === "paper") {
        togglePaperSelection(item.id);
      } else {
        toggleBookSelection(item.id);
      }
      return;
    }
    if (revealedDelete === item.id) {
      setRevealedDelete(null);
      return;
    }
    const isWeb = Capacitor.getPlatform() === "web";
    try {
      console.log(`📄 Opening ${type}:`, item.title);
      console.log(`📁 Local path:`, item.localPath);

      setShowPDFViewer(true);
      setCurrentPDF({ data: "loading", title: item.title });

      if (!isWeb && item.localPath) {
        const fileName = item.localPath.split("/").pop() || "";
        console.log(`📝 Reading file: ${fileName}`);

        let base64Data: string;
        try {
          if (type === "book") {
            base64Data = await readBookFileAsBase64(fileName);
          } else {
            base64Data = await readFileAsBase64(fileName);
          }
          console.log(
            `✅ File read successfully, size: ${base64Data.length} chars`,
          );
        } catch (readError) {
          console.error(`❌ Failed to read file:`, readError);
          throw new Error(`File not found or corrupted. Please re-download.`);
        }

        // Clean whitespaces if any
        const sanitizedData = base64Data.replace(/\s/g, "");
        setCurrentPDF({ data: sanitizedData, title: item.title });
      } else {
        // On web, "downloaded" papers were saved to the OS Downloads folder.
        // We can still open them by streaming from the server URL.
        console.log(`🌐 Fetching from server...`);
        let fullItem;
        if (type === "book") {
          const { bookService } = await import("@/services/bookService");
          fullItem = await bookService.getBook(item.id);
        } else {
          fullItem = await examService.getPaper(item.id);
        }

        if (!fullItem)
          throw new Error(`${type} not found. Please check your connection.`);
        const fileUrl =
          type === "book"
            ? (fullItem as any).file_url
            : (fullItem as any).fileUrl;

        if (!fileUrl) {
          // No URL available (offline + no cache URL) — guide user to OS Downloads
          setShowPDFViewer(false);
          setCurrentPDF(null);
          toast.info(
            "File was saved to your Downloads folder. Open it from there to read it.",
          );
          return;
        }

        // Stream directly via URL — avoids large base64 conversion in memory
        setCurrentPDF({ data: "loading", title: item.title });
        setShowPDFViewer(false); // close the base64 path; re-open with URL
        setCurrentPDF(null);
        // Re-open viewer in URL streaming mode
        setStreamPdfTitle(item.title);
        setStreamPdfUrl(fileUrl);
        setShowStreamViewer(true);
        return;
      }
      console.log(`✅ PDF loaded successfully`);
    } catch (error) {
      console.error(`❌ Failed to open ${type}:`, error);
      const errorMsg =
        error instanceof Error ? error.message : `Failed to open ${type}`;
      toast.error(errorMsg);
      setShowPDFViewer(false);
      setCurrentPDF(null);
    }
  };

  const togglePaperSelection = (paperId: string) => {
    setSelectedPapers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(paperId)) {
        newSet.delete(paperId);
      } else {
        newSet.add(paperId);
      }
      if (newSet.size === 0 && selectedBooks.size === 0) exitMultiSelectMode();
      return newSet;
    });
  };

  const toggleBookSelection = (bookId: string) => {
    setSelectedBooks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) {
        newSet.delete(bookId);
      } else {
        newSet.add(bookId);
      }
      if (newSet.size === 0 && selectedPapers.size === 0) exitMultiSelectMode();
      return newSet;
    });
  };

  const selectAll = () => {
    const filteredItems = getFilteredItems();
    const paperIds = filteredItems
      .filter((item) => item.type === "paper")
      .map((item) => item.id);
    const bookIds = filteredItems
      .filter((item) => item.type === "book")
      .map((item) => item.id);
    setSelectedPapers(new Set(paperIds));
    setSelectedBooks(new Set(bookIds));
    setIsSheetExpanded(false);
  };

  const deselectAll = () => {
    setSelectedPapers(new Set());
    setSelectedBooks(new Set());
    exitMultiSelectMode();
  };

  const exitMultiSelectMode = () => {
    setIsMultiSelectMode(false);
    setSelectedPapers(new Set());
    setSelectedBooks(new Set());
    setIsSheetExpanded(false);
  };

  const examTypes = Array.from(
    new Set(downloadedPapers.map((p) => p.examType).filter(Boolean)),
  ).sort();

  const handleMultiDelete = async () => {
    const totalSelected = selectedPapers.size + selectedBooks.size;
    if (totalSelected === 0) return;

    const paperIds = Array.from(selectedPapers);
    const bookIds = Array.from(selectedBooks);

    try {
      for (const paperId of paperIds) {
        setDeletingId(paperId);
        await downloadService.deletePaper(paperId);
      }
      for (const bookId of bookIds) {
        setDeletingId(bookId);
        await downloadService.deleteBook(bookId);
      }

      toast.success(
        t("itemsDeleted").replace("{count}", String(totalSelected)),
      );
      exitMultiSelectMode();
      loadDownloads();
    } catch (error) {
      console.error("Failed to delete items:", error);
      toast.error(t("failedDeleteItems"));
    } finally {
      setDeletingId(null);
    }
  };

  const handleMultiShare = async () => {
    const totalSelected = selectedPapers.size + selectedBooks.size;
    if (totalSelected === 0) return;
    if (!isPremium) {
      openPremiumGate();
      return;
    }

    const isWeb = Capacitor.getPlatform() === "web";
    if (isWeb) {
      toast.error(t("shareNotAvailableWeb"));
      return;
    }

    try {
      const selectedPapersList = downloadedPapers.filter((p) =>
        selectedPapers.has(p.id),
      );
      const selectedBooksList = downloadedBooks.filter((b) =>
        selectedBooks.has(b.id),
      );
      const shareItems: Array<{
        path: string;
        title: string;
        type: "paper" | "book";
      }> = [];

      selectedPapersList
        .filter((p) => p.localPath)
        .forEach((p) =>
          shareItems.push({
            path: p.localPath!,
            title: p.title,
            type: "paper",
          }),
        );

      selectedBooksList
        .filter((b) => b.localPath)
        .forEach((b) =>
          shareItems.push({
            path: b.localPath!,
            title: b.title,
            type: "book",
          }),
        );

      if (shareItems.length === 0) {
        toast.error(t("noFilesToShare"));
        return;
      }

      await fileShareService.shareMixed(shareItems);
      exitMultiSelectMode();
    } catch (error) {
      console.error("Failed to share items:", error);
      if (error instanceof Error && !error.message.includes("cancel")) {
        toast.error(t("failedShareItems"));
      }
    }
  };

  const startLongPress = useCallback(
    (itemId: string, type: "paper" | "book") => {
      longPressTimer.current = setTimeout(() => {
        setIsMultiSelectMode(true);
        if (type === "paper") {
          setSelectedPapers(new Set([itemId]));
        } else {
          setSelectedBooks(new Set([itemId]));
        }
      }, 500);
    },
    [],
  );

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleRedownload = async (cloudPaper: CloudDownloadType) => {
    if (!isPremium && !canDownload) {
      openDownloadLimitGate();
      return;
    }
    setRedownloadingId(cloudPaper.paper_id);
    try {
      const fullPaper = await examService.getPaper(cloudPaper.paper_id);
      if (!fullPaper) {
        toast.error("Paper no longer available in the library.");
        return;
      }
      await downloadService.downloadPaper(fullPaper, (progress) => {
        if (progress.status === "completed") {
          toast.success(`"${cloudPaper.paper_title}" downloaded`);
          loadDownloads();
        }
      });
    } catch (err) {
      console.error("Re-download failed:", err);
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("limit reached") || msg.includes("Download limit")) {
        openDownloadLimitGate();
      } else {
        toast.error("Download failed. Please try again.");
      }
    } finally {
      setRedownloadingId(null);
    }
  };

  const handleDelete = async (paperId: string) => {
    setDeletingId(paperId);
    setTimeout(async () => {
      try {
        await downloadService.deletePaper(paperId);
        toast.success(t("paperDeleted"));
        setRevealedDelete(null);
        setDeletingId(null);
        loadDownloads();
        // Refresh quota after deletion
        await refreshQuota();
        quotaDisplayRef.current?.refreshQuota();
      } catch (error) {
        console.error("Failed to delete paper:", error);
        toast.error(t("failedDeletePaper"));
        setDeletingId(null);
      }
    }, 300);
  };

  const handleDeleteBook = async (bookId: string) => {
    setDeletingId(bookId);
    setTimeout(async () => {
      try {
        await downloadService.deleteBook(bookId);
        toast.success(t("bookDeleted") || "Book deleted");
        setRevealedDelete(null);
        setDeletingId(null);
        loadDownloads();
        // Refresh quota after deletion
        await refreshQuota();
        quotaDisplayRef.current?.refreshQuota();
      } catch (error) {
        console.error("Failed to delete book:", error);
        toast.error(t("failedDeleteBook") || "Failed to delete book");
        setDeletingId(null);
      }
    }, 300);
  };

  const handleSharePaper = async (paper: CachedPaper) => {
    if (!isPremium) {
      openPremiumGate();
      return;
    }
    try {
      if (!paper.localPath) {
        toast.error("File not found locally.");
        return;
      }
      await fileShareService.sharePaper(paper.localPath, paper.title);
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  const handleShareBook = async (book: CachedBook) => {
    if (!isPremium) {
      openPremiumGate();
      return;
    }
    try {
      if (!book.localPath) {
        toast.error("File not found locally.");
        return;
      }
      await fileShareService.shareBook(book.localPath, book.title);
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  const getFilteredItems = () => {
    const allItems: Array<{
      id: string;
      type: "paper" | "book";
      data: CachedPaper | CachedBook;
    }> = [];

    if (filterType === "all" || filterType === "papers") {
      downloadedPapers.forEach((paper) => {
        allItems.push({ id: paper.id, type: "paper", data: paper });
      });
    }

    if (filterType === "all" || filterType === "books") {
      downloadedBooks.forEach((book) => {
        allItems.push({ id: book.id, type: "book", data: book });
      });
    }

    return allItems.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        item.data.title.toLowerCase().includes(q) ||
        item.data.subject.toLowerCase().includes(q);

      if (item.type === "paper" && examTypeFilter) {
        const paper = item.data as CachedPaper;
        return matchesSearch && paper.examType === examTypeFilter;
      }
      return matchesSearch;
    });
  };

  const filteredItems = getFilteredItems();

  const filteredPapers = filteredItems
    .filter((item) => item.type === "paper")
    .map((item) => item.data as CachedPaper);

  const filteredBooks = filteredItems
    .filter((item) => item.type === "book")
    .map((item) => item.data as CachedBook);

  const mapCachedBookToLibraryBook = (cached: CachedBook): LibraryBook => {
    return {
      id: cached.id,
      title: cached.title,
      author: cached.author,
      subject: cached.subject,
      category: cached.category,
      system: "",
      class_level: null,
      description: null,
      cover_url: null,
      file_url: "",
      file_name: "",
      file_size: cached.fileSize,
      file_size_formatted: cached.fileSizeFormatted,
      tags: cached.tags,
      downloads: cached.downloads,
      published_year: cached.publishedYear,
      created_at: cached.lastFetched,
    };
  };

  return (
    <div className="flex-1 bg-background min-h-screen">
      {/* Fixed header */}
      <div
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-20 bg-background/90 backdrop-blur-lg border-b border-border pb-3 safe-area-top"
      >
        <div className="header-inner">
          <div
            className="mt-3 space-y-3"
            style={{ minHeight: isMultiSelectMode ? "140px" : "auto" }}
          >
            <AnimatePresence mode="wait">
              {!isMultiSelectMode && (
                <>
                  <motion.div
                    key="quota"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <DownloadQuotaDisplay
                      ref={quotaDisplayRef}
                      showUpgradeButton={false}
                      className="mb-3"
                    />
                  </motion.div>

                  <motion.div
                    key="storage"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                    className="bg-card border-2 border-border rounded-2xl"
                  >
                    <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                        <HardDrive className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          {t("usedStorage")}
                        </p>
                        <p className="text-base font-black text-foreground leading-tight">
                          {formatBytes(storageInfo?.used ?? 0)}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-border mx-1" />
                      <div className="flex-1 min-w-0 text-right">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          {t("freeStorage")}
                        </p>
                        <p className="text-base font-black text-foreground leading-tight">
                          {storageInfo && storageInfo.available > 0
                            ? formatBytes(storageInfo.available)
                            : "—"}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-border mx-1" />
                      <div className="text-center shrink-0 px-2">
                        <p className="text-2xl font-black text-foreground leading-none">
                          {downloadedPapers.length + downloadedBooks.length}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                          {t("items")}
                        </p>
                      </div>
                    </div>
                    <OpenLocalPdfButton variant="card" className="w-full mt-2" />
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {(downloadedPapers.length > 0 || downloadedBooks.length > 0) && (
            <div className="mt-2 space-y-2">
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
                <button
                  onClick={() => setFilterType("all")}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black border-2 transition-all active:scale-95 ${
                    filterType === "all"
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card text-foreground border-foreground/30"
                  }`}
                >
                  {t("allItems") || "All Items"}
                </button>
                <button
                  onClick={() => setFilterType("papers")}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black border-2 transition-all active:scale-95 ${
                    filterType === "papers"
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card text-foreground border-foreground/30"
                  }`}
                >
                  {t("examLibrary") || "Papers"}
                </button>
                <button
                  onClick={() => setFilterType("books")}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black border-2 transition-all active:scale-95 ${
                    filterType === "books"
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card text-foreground border-foreground/30"
                  }`}
                >
                  {t("bookLibrary") || "Books"}
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("searchByTitle")}
                  className="w-full bg-card border-2 border-foreground rounded-2xl py-2.5 pl-9 pr-10 text-sm font-semibold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {examTypes.length > 1 && filterType === "papers" && (
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
                  <button
                    onClick={() => setExamTypeFilter("")}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black border-2 transition-all active:scale-95 ${
                      !examTypeFilter
                        ? "bg-foreground text-background border-foreground"
                        : "bg-card text-foreground border-foreground/30"
                    }`}
                  >
                    {t("all")}
                  </button>
                  {examTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() =>
                        setExamTypeFilter((prev) => (prev === type ? "" : type))
                      }
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black border-2 transition-all active:scale-95 ${
                        examTypeFilter === type
                          ? "bg-foreground text-background border-foreground"
                          : "bg-card text-foreground border-foreground/30"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Offline banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed left-0 right-0 z-10"
            style={{ top: headerHeight + 12 }}
          >
            <div className="header-inner">
              <div className="rounded-2xl bg-warning/15 border-2 border-warning/40 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/20 shrink-0">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-foreground leading-tight">
                      {t("offlineTitle")}
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                      {t("offlineHasDownloads")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable list */}
      <div
        className="content-col pb-36"
        style={{ paddingTop: headerHeight + 12 + (isOffline ? 80 : 0) }}
        onClick={() => setRevealedDelete(null)}
      >
        {downloadedPapers.length === 0 && downloadedBooks.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-lg font-bold text-muted-foreground mb-2">
              {t("noDownloadsYet")}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {t("papersDownloadAppear")}
            </p>
            <button
              onClick={() => navigate("/library")}
              className="bg-primary text-primary-foreground rounded-xl px-6 py-3 font-bold"
            >
              {t("browseLibrary")}
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm font-bold text-muted-foreground">
              {t("noResultsFor")} "{search}"
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. Exam Papers Section */}
            {filteredPapers.length > 0 && (
              <div>
                {filterType === "all" && (
                  <h2 className="text-base font-black text-foreground mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Exam Papers
                    <span className="text-xs text-muted-foreground font-bold">
                      ({filteredPapers.length})
                    </span>
                  </h2>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredPapers.map((paper) => {
                    const isSelected = selectedPapers.has(paper.id);
                    return (
                      <motion.div
                        key={paper.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handlePaperClick(paper, "paper")}
                        onTouchStart={() =>
                          !isMultiSelectMode &&
                          startLongPress(paper.id, "paper")
                        }
                        onTouchEnd={cancelLongPress}
                        onTouchMove={cancelLongPress}
                        className={`bg-card rounded-2xl border-2 overflow-hidden cursor-pointer card-shadow flex flex-col justify-between transition-all select-none ${
                          isSelected
                            ? "border-primary ring-2 ring-primary ring-offset-2"
                            : "border-foreground"
                        }`}
                      >
                        {/* Paper preview */}
                        <div className="relative h-32 bg-muted/50 overflow-hidden shrink-0 flex items-center justify-center">
                          {paper.localThumbnailPath || paper.preview_url ? (
                            <img
                              src={
                                paper.localThumbnailPath || paper.preview_url
                              }
                              alt=""
                              className="w-full h-full object-cover object-top"
                            />
                          ) : (
                            <FileText className="h-10 w-10 text-muted-foreground/45" />
                          )}

                          {/* Selection Checkmark */}
                          {isMultiSelectMode && (
                            <div className="absolute top-2 left-2 z-10">
                              {isSelected ? (
                                <div className="h-5 w-5 bg-primary rounded-full border border-foreground flex items-center justify-center">
                                  <Check className="h-3.5 w-3.5 text-primary-foreground stroke-[4]" />
                                </div>
                              ) : (
                                <div className="h-5 w-5 bg-card rounded-full border-2 border-foreground" />
                              )}
                            </div>
                          )}

                          {/* Quick delete button */}
                          {!isMultiSelectMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(paper.id);
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-destructive/15 border border-destructive/20 text-destructive rounded-xl hover:bg-destructive/20 active:scale-90 transition-all z-10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Paper details */}
                        <div className="p-2.5 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-black text-foreground text-xs line-clamp-2 leading-tight">
                              {paper.title || `${paper.subject} ${paper.year}`}
                            </h3>
                            <p className="text-[10px] font-bold text-muted-foreground mt-1">
                              {paper.classLevel} · {paper.examType}
                            </p>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/10 shrink-0">
                            <span className="text-[9px] font-black text-muted-foreground">
                              {paper.fileSizeFormatted}
                            </span>
                            {!isMultiSelectMode && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSharePaper(paper);
                                }}
                                className="p-1 text-muted-foreground active:scale-90 transition-all"
                              >
                                <Share2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Library Books Section */}
            {filteredBooks.length > 0 && (
              <div>
                {filterType === "all" && (
                  <h2 className="text-base font-black text-foreground mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Library Books
                    <span className="text-xs text-muted-foreground font-bold">
                      ({filteredBooks.length})
                    </span>
                  </h2>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredBooks.map((cached) => {
                    const book = mapCachedBookToLibraryBook(cached);
                    const isSelected = selectedBooks.has(book.id);
                    const downloadStatus: DownloadStatus = {
                      isDownloaded: true,
                      isDownloading: false,
                      localPath: cached.localPath,
                    };

                    return (
                      <div
                        key={book.id}
                        className={`relative rounded-2xl overflow-hidden transition-all ${
                          isSelected ? "ring-2 ring-primary ring-offset-2" : ""
                        }`}
                        onClick={() => handlePaperClick(cached, "book")}
                        onTouchStart={() =>
                          !isMultiSelectMode &&
                          startLongPress(cached.id, "book")
                        }
                        onTouchEnd={cancelLongPress}
                        onTouchMove={cancelLongPress}
                      >
                        {/* Checkbox overlay in multi-select */}
                        {isMultiSelectMode && (
                          <div className="absolute top-4 left-4 z-10">
                            {isSelected ? (
                              <div className="h-5 w-5 bg-primary rounded-full border border-foreground flex items-center justify-center">
                                <Check className="h-3.5 w-3.5 text-primary-foreground stroke-[4]" />
                              </div>
                            ) : (
                              <div className="h-5 w-5 bg-card rounded-full border-2 border-foreground" />
                            )}
                          </div>
                        )}

                        <BookCard
                          book={book}
                          isOpening={deletingId === book.id}
                          onClick={() => handlePaperClick(cached, "book")}
                          downloadStatus={downloadStatus}
                          onShare={() => handleShareBook(cached)}
                        />

                        {/* Always visible Trash Delete Button overlay in downloads mode */}
                        {!isMultiSelectMode && (
                          <div className="absolute top-2 right-2 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBook(book.id);
                              }}
                              className="p-1.5 bg-destructive/15 border border-destructive/20 text-destructive rounded-xl hover:bg-destructive/20 active:scale-90 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cloud-only downloads */}
        {cloudOnlyDownloads.length > 0 && !search && (
          <div className="mt-8 pt-6 border-t-2 border-dashed border-border">
            <div className="flex items-center gap-2 mb-3">
              <CloudDownload className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                From other devices
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cloudOnlyDownloads.map((paper) => (
                <div
                  key={paper.paper_id}
                  className="bg-card rounded-2xl overflow-hidden card-shadow border-2 border-dashed border-border flex justify-between p-4 items-center"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted shrink-0 border border-border overflow-hidden">
                      {paper.preview_url ? (
                        <img
                          src={paper.preview_url}
                          className="w-full h-full object-cover object-top"
                          alt=""
                        />
                      ) : (
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-foreground text-sm leading-tight truncate">
                        {paper.paper_title}
                      </h3>
                      <p className="text-[10px] font-bold text-muted-foreground mt-1">
                        {formatBytes(paper.file_size)} · {paper.paper_subject}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRedownload(paper)}
                    disabled={redownloadingId === paper.paper_id}
                    className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/30 rounded-xl px-3 py-2 text-xs font-black shrink-0 active:scale-95 transition-transform disabled:opacity-50"
                  >
                    {redownloadingId === paper.paper_id ? (
                      <span className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
                    ) : (
                      <CloudDownload className="h-3.5 w-3.5" />
                    )}
                    {redownloadingId === paper.paper_id ? "..." : "Download"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showPDFViewer && currentPDF && currentPDF.data !== "loading" && (
        <InAppPDFViewer
          pdfData={currentPDF.data}
          fileName={currentPDF.title}
          onClose={() => {
            setShowPDFViewer(false);
            setCurrentPDF(null);
          }}
        />
      )}

      {/* URL-streaming viewer — used on web where files aren't stored locally */}
      {showStreamViewer && streamPdfUrl && (
        <InAppPDFViewer
          pdfUrl={streamPdfUrl}
          fileName={streamPdfTitle}
          onClose={() => {
            setShowStreamViewer(false);
            setStreamPdfUrl(null);
            setStreamPdfTitle("");
          }}
        />
      )}

      {/* Multi-select bottom sheet */}
      <AnimatePresence>
        {isMultiSelectMode &&
          (selectedPapers.size > 0 || selectedBooks.size > 0) && (
            <>
              {isSheetExpanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] bg-black/50"
                  onClick={() => setIsSheetExpanded(false)}
                />
              )}

              <AnimatePresence>
                {(selectedPapers.size > 0 || selectedBooks.size > 0) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="fixed top-4 left-4 z-[110] safe-area-top"
                  >
                    <div className="flex items-center gap-3 bg-card border-2 border-foreground rounded-full px-4 py-2.5 card-shadow">
                      <button
                        onClick={exitMultiSelectMode}
                        className="p-1 -ml-1 active:scale-95 transition-transform"
                      >
                        <X className="h-5 w-5 text-foreground" />
                      </button>
                      <p className="text-sm font-black text-foreground">
                        {selectedPapers.size + selectedBooks.size} selected
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                initial={
                  isTablet
                    ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 }
                    : { y: "100%" }
                }
                animate={
                  isTablet
                    ? { x: "-50%", y: "-50%", scale: 1, opacity: 1 }
                    : { y: 0 }
                }
                exit={
                  isTablet
                    ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 }
                    : { y: "100%" }
                }
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`fixed z-[105] bg-background border-t-2 border-foreground rounded-t-3xl overflow-hidden bottom-0 ${
                  isTablet
                    ? "left-1/2 top-1/2 w-[90vw] max-w-2xl rounded-3xl border-2"
                    : "left-0 right-0"
                }`}
              >
                <div className="px-5 py-4">
                  <div className="flex gap-3">
                    <button
                      onClick={handleMultiShare}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary border-2 border-foreground text-primary-foreground font-black text-sm card-shadow active:scale-95 transition-transform"
                    >
                      <Share2 className="h-4 w-4" />
                      {t("share")}
                    </button>
                    <button
                      onClick={handleMultiDelete}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive border-2 border-foreground text-destructive-foreground font-black text-sm card-shadow active:scale-95 transition-transform"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("delete")}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
      </AnimatePresence>

      {!showPDFViewer && !isMultiSelectMode && <TaskBar showBack />}
    </div>
  );
};

export default MyDownloads;
