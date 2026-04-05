import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, FileText, HardDrive, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [revealedDelete, setRevealedDelete] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentPDF, setCurrentPDF] = useState<{ data: string; title: string } | null>(null);

  // Ref to measure the fixed header height for padding
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    loadDownloads();
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
      const info = await getAvailableSpace();
      setStorageInfo(info);
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

  const totalCapacity = storageInfo?.total ?? 0;
  const usedPct = totalCapacity > 0 ? Math.min((storageInfo!.used / totalCapacity) * 100, 100) : 0;
  const storageWarning = usedPct > 80;

  const filteredPapers = downloadedPapers.filter((p) => {
    const q = search.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.subject.toLowerCase().includes(q) || p.classLevel.toLowerCase().includes(q);
  });

  const handleDeleteSingle = async (paperId: string) => {
    try {
      await downloadService.deletePaper(paperId);
      toast.success("Paper deleted");
      setShowDeleteConfirm(null);
      loadDownloads();
    } catch (error) {
      console.error("Failed to delete paper:", error);
      toast.error("Failed to delete paper");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-background">
        <div className="w-full max-w-md mx-auto px-4 py-4 safe-area-top">
          <div className="animate-pulse space-y-4">
            <div className="h-28 bg-muted rounded-2xl" />
            <div className="h-12 bg-muted rounded-2xl" />
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-2xl" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background min-h-screen">
      {/* ── Fixed header: storage card + search ── */}
      <div
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-20 max-w-md mx-auto bg-background/90 backdrop-blur-lg border-b border-border px-4 pb-3 safe-area-top"
      >
        {/* Storage card — compact, always visible */}
        <div className="mt-3 rounded-2xl bg-card border-2 border-border px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <HardDrive className="h-5 w-5 text-primary" />
            </div>

            {/* Used / Free */}
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
                    {storageInfo !== null ? formatBytes(storageInfo.available) : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Paper count */}
            <div className="text-center shrink-0 pl-3 border-l border-border">
              <p className="text-2xl font-black text-foreground leading-none">{downloadedPapers.length}</p>
              <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                {downloadedPapers.length === 1 ? t("paper") : t("papers")}
              </p>
            </div>
          </div>
        </div>

        {/* Search bar */}
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

      {/* ── Scrollable content — padded to clear fixed header ── */}
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
            <button
              onClick={() => navigate("/library")}
              className="bg-primary text-primary-foreground rounded-xl px-6 py-3 font-bold"
            >
              {t("browseLibrary")}
            </button>
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm font-bold text-muted-foreground">No results for "{search}"</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPapers.map((paper) => (
              <motion.div
                key={paper.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
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

                  <AnimatePresence>
                    {revealedDelete === paper.id && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 64, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 28 }}
                        className="flex items-center justify-center bg-destructive shrink-0 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="flex flex-col items-center justify-center gap-1 w-full h-full"
                          onClick={() => setShowDeleteConfirm(paper.id)}
                        >
                          <Trash2 className="h-5 w-5 text-destructive-foreground" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <AnimatePresence>
                  {showDeleteConfirm === paper.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 pb-4 border-t border-border"
                    >
                      <p className="text-xs text-center my-3">{t("deleteThisPaper")}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowDeleteConfirm(null); setRevealedDelete(null); }}
                          className="flex-1 bg-muted text-foreground rounded-lg py-2 text-sm font-semibold"
                        >
                          {t("cancel")}
                        </button>
                        <button
                          onClick={() => handleDeleteSingle(paper.id)}
                          className="flex-1 bg-destructive text-destructive-foreground rounded-lg py-2 text-sm font-semibold"
                        >
                          {t("delete")}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
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
