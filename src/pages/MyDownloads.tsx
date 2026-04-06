import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, FileText, HardDrive, Search, X } from "lucide-react";
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
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentPDF, setCurrentPDF] = useState<{ data: string; title: string } | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => { loadDownloads(); }, []);

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
      toast.error("Failed to load downloads");
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
      toast.error("Failed to open PDF");
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
        toast.success("Paper deleted");
        setRevealedDelete(null);
        setDeletingId(null);
        loadDownloads();
      } catch (error) {
        console.error("Failed to delete paper:", error);
        toast.error("Failed to delete paper");
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

  const usedPct = storageInfo && storageInfo.total > 0
    ? Math.min((storageInfo.used / storageInfo.total) * 100, 100)
    : 0;
  const storageWarning = usedPct > 80;

  const filteredPapers = downloadedPapers.filter((p) => {
    const q = search.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.subject.toLowerCase().includes(q) || p.classLevel.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex-1 bg-background">
        <div className="w-full max-w-md mx-auto px-4 py-4 safe-area-top">
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
      {/* Fixed header */}
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-20 max-w-md mx-auto bg-background/90 backdrop-blur-lg border-b border-border px-4 pb-3 safe-area-top">
        <div className="mt-3 rounded-2xl bg-card border-2 border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <HardDrive className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="text-center">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Used</p>
                  <p className="text-base font-black text-foreground leading-tight">{formatBytes(storageInfo?.used ?? 0)}</p>
                </div>
                <div className="flex-1 mx-2">
                  <div className="h-2 rounded-full bg-muted overflow-hidden border border-border">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${storageWarning ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>
                  <p className="text-[9px] font-bold text-muted-foreground text-center mt-0.5">{usedPct.toFixed(0)}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Free</p>
                  <p className="text-base font-black text-foreground leading-tight">
                    {storageInfo !== null && storageInfo.available > 0 ? formatBytes(storageInfo.available) : "—"}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-center shrink-0 pl-3 border-l border-border">
              <motion.p className="text-2xl font-black text-foreground leading-none">{countRounded}</motion.p>
              <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                {downloadedPapers.length === 1 ? t("paper") : t("papers")}
              </p>
            </div>
          </div>
        </div>

        {downloadedPapers.length > 0 && (
          <div className="relative mt-2">
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
        )}
      </div>

      {/* Scrollable list */}
      <div
        className="w-full max-w-md mx-auto px-4 pb-24"
        style={{ paddingTop: headerHeight + 12 }}
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
            <p className="text-sm font-bold text-muted-foreground">No results for "{search}"</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredPapers.map((paper) => (
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
                  className="bg-card rounded-2xl overflow-hidden card-shadow select-none"
                  onContextMenu={(e) => { e.preventDefault(); setRevealedDelete(paper.id); }}
                  onTouchStart={() => startLongPress(paper.id)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                >
                  <div className="flex items-stretch">
                    <div
                      className="flex-1 p-4 cursor-pointer active:bg-muted/40 transition-colors"
                      onClick={(e) => { e.stopPropagation(); handlePaperClick(paper); }}
                    >
                      <h3 className="font-black text-sm line-clamp-2 mb-1">{paper.title}</h3>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        {paper.subject} · {paper.classLevel}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-muted-foreground">{paper.fileSizeFormatted}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="font-semibold text-muted-foreground">
                          {t("downloadedOn")} {new Date(paper.downloadedAt!).toLocaleDateString()}
                        </span>
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
