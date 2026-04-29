import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, FileText, HardDrive, Search, X, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { downloadService } from "@/services/downloadService";
import { cacheService } from "@/services/cacheService";
import { examService } from "@/services/examService";
import { CachedPaper } from "@/types/exam-library";
import { formatBytes } from "@/lib/integrity";
import { InAppPDFViewer } from "@/components/exam/InAppPDFViewer";
import { readFileAsBase64, getAvailableSpace } from "@/lib/filesystem";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import TaskBar from "@/components/TaskBar";

const MyDownloads = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [downloadedPapers, setDownloadedPapers] = useState<CachedPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState<{ available: number; used: number; total: number } | null>(null);
  const [revealedDelete, setRevealedDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [examTypeFilter, setExamTypeFilter] = useState("");
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentPDF, setCurrentPDF] = useState<{ data: string; title: string } | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(80);
  
  // Check if we were redirected here due to offline status
  const urlParams = new URLSearchParams(window.location.search);
  const wasOffline = urlParams.get('offline') === 'true';
  const [isOffline, setIsOffline] = useState(wasOffline || !navigator.onLine);

  useEffect(() => { loadDownloads(); }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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
      const cachedPapers = await cacheService.getCachedPapers();
      const downloaded = cachedPapers.filter(p => p.isDownloaded);
      setDownloadedPapers(downloaded);

      // Calculate used storage from actual file sizes
      const usedBytes = await downloadService.getTotalStorageUsed();

      // Get device available space
      const deviceInfo = await getAvailableSpace();

      // On mobile, getAvailableSpace returns 0 used — use our calculated value instead
      const used = usedBytes > 0 ? usedBytes : deviceInfo.used;
      const available = deviceInfo.available > 0 ? deviceInfo.available : deviceInfo.total - used;
      const total = deviceInfo.total > 0 ? deviceInfo.total : used + available;

      setStorageInfo({ used, available, total });
    } catch (error) {
      console.error("Failed to load downloads:", error);
      toast.error(t("failedLoadDownloads"));
    } finally {
      setLoading(false);
    }
  };

  const handlePaperClick = async (paper: CachedPaper) => {
    if (revealedDelete === paper.id) { setRevealedDelete(null); return; }
    const isWeb = Capacitor.getPlatform() === "web";
    try {
      setShowPDFViewer(true);
      setCurrentPDF({ data: "loading", title: paper.title });
      if (!isWeb && paper.localPath) {
        const fileName = paper.localPath.split("/").pop() || "";
        const base64Data = await readFileAsBase64(fileName);
        setCurrentPDF({ data: base64Data, title: paper.title });
      } else {
        const fullPaper = await examService.getPaper(paper.id);
        if (!fullPaper) throw new Error("Paper not found");
        const response = await fetch(fullPaper.fileUrl);
        const blob = await response.blob();
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        setCurrentPDF({ data: base64Data, title: paper.title });
      }
    } catch (error) {
      console.error("Failed to open PDF:", error);
      toast.error(t("failedOpenPDF"));
      setShowPDFViewer(false);
      setCurrentPDF(null);
    }
  };

  const startLongPress = useCallback((paperId: string) => {
    longPressTimer.current = setTimeout(() => setRevealedDelete(paperId), 500);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  // Tap delete → animate out → delete
  const handleDelete = async (paperId: string) => {
    setDeletingId(paperId);
    // Wait for exit animation then delete
    setTimeout(async () => {
      try {
        await downloadService.deletePaper(paperId);
        toast.success(t("paperDeleted"));
        setRevealedDelete(null);
        setDeletingId(null);
        loadDownloads();
      } catch (error) {
        console.error("Failed to delete paper:", error);
        toast.error(t("failedDeletePaper"));
        setDeletingId(null);
      }
    }, 300);
  };

  // Animated paper count
  const countMotion = useMotionValue(downloadedPapers.length);
  const countSpring = useSpring(countMotion, { stiffness: 100, damping: 20 });
  const countRounded = useTransform(countSpring, v => Math.round(v));

  useEffect(() => {
    countMotion.set(downloadedPapers.length);
  }, [downloadedPapers.length]);

  const examTypes = Array.from(new Set(downloadedPapers.map(p => p.examType).filter(Boolean))).sort();

  const filteredPapers = downloadedPapers.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = p.title.toLowerCase().includes(q) || p.subject.toLowerCase().includes(q) || p.classLevel.toLowerCase().includes(q);
    const matchesType = !examTypeFilter || p.examType === examTypeFilter;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex-1 bg-background">
        <div className="w-full px-4 py-4 safe-area-top">
          <div className="animate-pulse space-y-4">
            <div className="h-28 bg-muted rounded-2xl" />
            <div className="h-12 bg-muted rounded-2xl" />
            {[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background min-h-screen">
      {/* Fixed header — bleeds edge-to-edge, inner content constrained */}
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-20 bg-background/90 backdrop-blur-lg border-b border-border pb-3 safe-area-top">
        <div className="header-inner">
        <div className="mt-3 rounded-2xl bg-card border-2 border-border overflow-hidden">
          {/* Top row: icon + used + free + papers count */}
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <HardDrive className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("usedStorage")}</p>
              <p className="text-base font-black text-foreground leading-tight">{formatBytes(storageInfo?.used ?? 0)}</p>
            </div>
            <div className="h-8 w-px bg-border mx-1" />
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("freeStorage")}</p>
              <p className="text-base font-black text-foreground leading-tight">
                {storageInfo && storageInfo.available > 0 ? formatBytes(storageInfo.available) : "—"}
              </p>
            </div>
            <div className="h-8 w-px bg-border mx-1" />
            <div className="text-center shrink-0 px-2">
              <motion.p className="text-2xl font-black text-foreground leading-none">{countRounded}</motion.p>
              <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                {downloadedPapers.length === 1 ? t("paper") : t("papers")}
              </p>
            </div>
          </div>

        </div>

        {downloadedPapers.length > 0 && (
          <div className="mt-2 space-y-2">
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
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {examTypes.length > 1 && (
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
                {examTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setExamTypeFilter(prev => prev === type ? "" : type)}
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
        </div>{/* /header-inner */}
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
                    <p className="text-sm font-black text-foreground leading-tight">{t("offlineTitle")}</p>
                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">{t("offlineHasDownloads")}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable list */}
      <div
        className="content-col pb-24"
        style={{ paddingTop: headerHeight + 12 + (isOffline ? 80 : 0) }}
        onClick={() => setRevealedDelete(null)}
      >
        {downloadedPapers.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-lg font-bold text-muted-foreground mb-2">{t("noDownloadsYet")}</p>
            <p className="text-sm text-muted-foreground mb-6">{t("papersDownloadAppear")}</p>
            <button onClick={() => navigate("/library")} className="bg-primary text-primary-foreground rounded-xl px-6 py-3 font-bold">
              {t("browseLibrary")}
            </button>
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm font-bold text-muted-foreground">{t("noResultsFor")} "{search}"</p>
          </div>
        ) : (
          <div className="tour-downloads-list space-y-3">
            <AnimatePresence>
              {filteredPapers.map((paper, idx) => (
                <motion.div
                  key={paper.id}
                  layout
                  initial={{ opacity: 1, x: 0 }}
                  animate={deletingId === paper.id
                    ? { x: "-110%", opacity: 0 }
                    : { x: 0, opacity: 1 }
                  }
                  exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                  transition={deletingId === paper.id
                    ? { type: "spring", stiffness: 400, damping: 35 }
                    : { duration: 0.22 }
                  }
                  className={`bg-card rounded-2xl overflow-hidden card-shadow select-none ${idx === 0 ? 'tour-downloads-swipe' : ''}`}
                  onContextMenu={(e) => { e.preventDefault(); setRevealedDelete(paper.id); }}
                  onTouchStart={() => startLongPress(paper.id)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                >
                  <div className="flex items-stretch">
                    <div
                      className="flex-1 flex items-center gap-4 p-4 cursor-pointer active:bg-muted/40 transition-colors"
                      onClick={(e) => { e.stopPropagation(); handlePaperClick(paper); }}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0 border border-primary/20 overflow-hidden">
                        {paper.localThumbnailPath || paper.preview_url ? (
                          <img src={paper.localThumbnailPath || paper.preview_url} className="w-full h-full object-cover object-top" alt="" />
                        ) : (
                          <FileText className="h-6 w-6 text-primary" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-foreground text-sm leading-snug">
                          {paper.title || `${paper.subject} ${paper.year}`}
                        </h3>
                        <p className="text-[10px] font-bold text-muted-foreground mt-2 text-primary">
                          {paper.fileSizeFormatted} · {t("downloadedOn")} {new Date(paper.downloadedAt!).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Delete panel — revealed on long press, tap to delete immediately */}
                    <AnimatePresence>
                      {revealedDelete === paper.id && (
                        <motion.button
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 64, opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 28 }}
                          className="flex items-center justify-center bg-destructive shrink-0 overflow-hidden active:brightness-90"
                          onClick={(e) => { e.stopPropagation(); handleDelete(paper.id); }}
                        >
                          <Trash2 className="h-5 w-5 text-destructive-foreground" />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {showPDFViewer && currentPDF && currentPDF.data !== "loading" && (
        <InAppPDFViewer
          pdfData={currentPDF.data}
          fileName={currentPDF.title}
          onClose={() => { setShowPDFViewer(false); setCurrentPDF(null); }}
        />
      )}

      {!showPDFViewer && <TaskBar showBack />}
    </div>
  );
};

export default MyDownloads;
