import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download, AlertCircle, Eye, Crown, Lock, X, Check, Share2, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ExamPaper, DownloadProgress } from "@/types/exam-library";
import { examService } from "@/services/examService";
import { downloadService } from "@/services/downloadService";
import { fileShareService } from "@/services/fileShareService";
import { subscriptionService } from "@/services/subscriptionService";
import { PaymentSheet } from "@/components/subscription/PaymentSheet";
import { PlanSelectSheet } from "@/components/subscription/PlanSelectSheet";
import { InAppPDFViewer } from "@/components/exam/InAppPDFViewer";
import { useDownloadQuota } from "@/hooks/useDownloadQuota";
import { DownloadQuotaDisplay } from "@/components/DownloadQuotaDisplay";
import { toast } from "sonner";
import TaskBar from "@/components/TaskBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePremium } from "@/contexts/AppConfigContext";
import { useIsTablet } from "@/hooks/useIsTablet";

const PaperDetail = () => {
  const { paperId } = useParams<{ paperId: string }>();
  const navigate = useNavigate();
  const isTablet = useIsTablet();
  const sheetVariants = {
    hidden:  isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: "100%" },
    visible: isTablet ? { x: "-50%", y: "-50%", scale: 1,    opacity: 1 } : { y: 0 },
    exit:    isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: "100%" },
  };
  const { t, language } = useLanguage();
  const { isPremium, openPremiumGate, openDownloadLimitGate } = usePremium();
  const { canDownload, refreshQuota } = useDownloadQuota();

  const [paper, setPaper] = useState<ExamPaper | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [streamPdfUrl, setStreamPdfUrl] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPlanSelect, setShowPlanSelect] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<"single" | "all">("single");
  const [prepOpen, setPrepOpen] = useState(false);
  const [hasAnyDownload, setHasAnyDownload] = useState(false);

  const loadPaper = useCallback(async () => {
    if (!paperId) return;
    try {
      setLoading(true);
      setError(null);
      const paperData = await examService.getPaper(paperId);
      setPaper(paperData);
      const downloaded = await downloadService.isPaperDownloaded(paperId);
      setIsDownloaded(downloaded);
      const allDownloaded = await downloadService.getDownloadedPapers();
      setHasAnyDownload(allDownloaded.length > 0);
    } catch (err) {
      console.error("Failed to load paper:", err);
      setError(t("failedLoadPaper"));
    } finally {
      setLoading(false);
    }
  }, [paperId]);

  useEffect(() => { loadPaper(); }, [loadPaper]);

  // Monitor download status changes in real-time
  useEffect(() => {
    if (!paperId) return;

    const checkDownloadStatus = async () => {
      try {
        const downloaded = await downloadService.isPaperDownloaded(paperId);
        setIsDownloaded(downloaded);
      } catch (error) {
        console.error('Failed to check download status:', error);
      }
    };

    // Check status immediately
    checkDownloadStatus();

    // Set up periodic checking during active downloads
    let intervalId: NodeJS.Timeout | null = null;
    
    if (downloadProgress && downloadProgress.status === 'downloading') {
      intervalId = setInterval(checkDownloadStatus, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [paperId, downloadProgress]);

  const handleOpen = () => {
    if (!paper?.fileUrl) {
      toast.error(t("failedOpenPDFDesc"));
      return;
    }
    
    // Check if user has reached download limit and is not premium
    if (!isPremium && !canDownload) {
      openDownloadLimitGate();
      return;
    }
    
    setError(null);
    setStreamPdfUrl(paper.fileUrl);
    setShowPDFViewer(true);
  };

  const handleDownload = async () => {
    if (!paper) return;
    if (!isPremium && !canDownload) {
      openDownloadLimitGate();
      return;
    }
    try {
      setError(null);
      await downloadService.downloadPaper(paper, (progress) => {
        setDownloadProgress(progress);
        if (progress.status === 'completed') {
          setIsDownloaded(true);
          setHasAnyDownload(true);
          setDownloadProgress(null);
          void refreshQuota();
          toast.success(t("savedToDownloads"));
        }
      });
    } catch (err) {
      console.error("Download failed:", err);
      const errorMessage = err instanceof Error ? err.message : t("downloadFailedRetry");
      if (errorMessage.includes('Download limit reached') || errorMessage.includes('limit reached')) {
        openDownloadLimitGate();
      } else {
        setError(errorMessage);
        toast.error(t("downloadFailedRetry"));
      }
      setDownloadProgress(null);
    }
  };

  const handleDownloadClick = () => {
    if (!isPremium && !canDownload) {
      openDownloadLimitGate();
      return;
    }
    void handleDownload();
  };

  const handleCancelDownload = async () => {
    if (!paperId) return;
    try {
      await downloadService.cancelDownload(paperId);
      setDownloadProgress(null);
    } catch (err) {
      console.error("Failed to cancel download:", err);
    }
  };

  const handleShare = async () => {
    if (!paper || !isPremium) {
      openPremiumGate();
      return;
    }
    if (!isDownloaded) {
      toast.error(t("downloadPDF"));
      return;
    }
    try {
      const downloadInfo = await downloadService.getDownloadInfo(paper.id);
      if (downloadInfo?.localPath) {
        await fileShareService.sharePaper(downloadInfo.localPath, paper.title);
      }
    } catch (err) {
      if (err instanceof Error && !err.message.toLowerCase().includes('cancel')) {
        console.error("Share failed:", err);
        toast.error(t("shareFailed"));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-background min-h-screen">
        <div className="content-col p-4 safe-area-top">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-64 bg-muted rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="flex-1 bg-background min-h-screen">
        <div className="w-full p-4 safe-area-top text-center py-20">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-6">{t("paperNotFoundDesc")}</p>
          <button onClick={() => navigate("/library")} className="text-primary font-bold">{t("backToLibrary")}</button>
        </div>
      </div>
    );
  }

  // Downloads shortcut button — morphs out of tab bar when first paper is saved
  const downloadAction = hasAnyDownload ? (
    <motion.button
      initial={{ opacity: 0, scale: 0.5, x: -16 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.5, x: -16 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      onClick={() => navigate("/my-downloads")}
      className="h-12 w-12 rounded-full bg-primary border-2 border-foreground card-shadow flex flex-col items-center justify-center active:scale-95 transition-transform"
    >
      <Download className="h-4 w-4 text-primary-foreground" />
    </motion.button>
  ) : undefined;

  return (
    <div className="flex-1 bg-background min-h-screen overflow-x-hidden w-full max-w-[100vw] pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <div className="content-col p-4 safe-area-top min-w-0">
        {/* Back button — fixed top left */}
        <button
          onClick={() => navigate(-1)}
          className="fixed top-[max(1rem,env(safe-area-inset-top))] left-[max(1rem,env(safe-area-inset-left))] z-50 h-10 w-10 flex items-center justify-center rounded-full bg-card border-2 border-foreground card-shadow active:scale-95 transition-transform"
          aria-label={t("goBack")}
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border mb-6 mt-12 min-w-0">
          <div className="p-4 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-black mb-4 leading-tight break-words pr-2">{paper.title}</h1>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-x-3 gap-y-3 text-sm min-w-0">
              <div className="text-muted-foreground shrink-0">{t("subject")}</div>
              <div className="font-bold text-right break-words min-w-0">{paper.subject}</div>
              <div className="text-muted-foreground shrink-0">{t("classLevel")}</div>
              <div className="font-bold text-right break-words min-w-0">{paper.classLevel}</div>
              <div className="text-muted-foreground shrink-0">{t("year")}</div>
              <div className="font-bold text-right break-words min-w-0">{paper.year}</div>
              <div className="text-muted-foreground shrink-0">{t("examType")}</div>
              <div className="font-bold text-right break-words min-w-0">{paper.examType}</div>
              <div className="text-muted-foreground shrink-0">{t("fileSize")}</div>
              <div className="font-bold text-right break-words min-w-0">{paper.fileSizeFormatted}</div>
              <div className="text-muted-foreground shrink-0">{t("downloads")}</div>
              <div className="font-bold text-right break-words min-w-0">{paper.downloads ?? 0}</div>
            </div>
          </div>
        </div>

        {/* Download Quota Display */}
        <div className="mb-4">
          <DownloadQuotaDisplay
            showUpgradeButton={true}
            onUpgradeClick={() => openPremiumGate()}
          />
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-xl mb-6 flex gap-3 items-start">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-3 min-w-0">
          {/* View / Download / Share — single row */}
          <div className="grid grid-cols-3 gap-2 min-w-0 w-full">
            {/* View Button - Locked when download limit reached for free users */}
            {!isPremium && !canDownload ? (
              <button
                onClick={() => openDownloadLimitGate()}
                className="flex flex-col items-center justify-center gap-1.5 min-w-0 bg-muted border-2 border-border py-3 px-1 rounded-2xl font-black text-[11px] sm:text-xs text-muted-foreground text-center leading-tight active:scale-[0.98] transition-all"
              >
                <Lock className="h-5 w-5 shrink-0" />
                <span className="w-full truncate px-0.5">{t("view")}</span>
              </button>
            ) : (
              <button
                onClick={handleOpen}
                className="flex flex-col items-center justify-center gap-1.5 min-w-0 bg-card border-2 border-foreground py-3 px-1 rounded-2xl font-black text-[11px] sm:text-xs text-foreground text-center leading-tight active:scale-[0.98] transition-all card-shadow"
              >
                <Eye className="h-5 w-5 shrink-0" />
                <span className="w-full truncate px-0.5">{t("view")}</span>
              </button>
            )}

            {/* Download Button - Locked when download limit reached for free users */}
            {isDownloaded ? (
              <button disabled className="flex flex-col items-center justify-center gap-1.5 min-w-0 bg-muted border-2 border-border py-3 px-1 rounded-2xl font-black text-[11px] sm:text-xs text-muted-foreground text-center leading-tight opacity-60 cursor-default">
                <Check className="h-5 w-5 shrink-0" />
                <span className="w-full truncate px-0.5">{t("downloaded")}</span>
              </button>
            ) : downloadProgress ? (
              <button
                onClick={handleCancelDownload}
                className="flex flex-col items-center justify-center gap-1.5 min-w-0 bg-primary border-2 border-foreground py-3 px-1 rounded-2xl font-black text-[11px] sm:text-xs text-primary-foreground text-center leading-tight active:scale-[0.98] transition-all card-shadow"
              >
                <div className="relative h-5 w-5 shrink-0">
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth="2.5" />
                    <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 8}`}
                      strokeDashoffset={`${2 * Math.PI * 8 * (1 - (downloadProgress.progress ?? 0) / 100)}`}
                      className="transition-all duration-300"
                    />
                  </svg>
                </div>
                <span>{Math.round(downloadProgress.progress ?? 0)}%</span>
              </button>
            ) : !isPremium && !canDownload ? (
              <button
                onClick={() => openDownloadLimitGate()}
                className="flex flex-col items-center justify-center gap-1.5 min-w-0 bg-muted border-2 border-border py-3 px-1 rounded-2xl font-black text-[11px] sm:text-xs text-muted-foreground text-center leading-tight active:scale-[0.98] transition-all"
              >
                <Lock className="h-5 w-5 shrink-0" />
                <span className="w-full line-clamp-2 px-0.5">{t("downloadPDF")}</span>
              </button>
            ) : (
              <button
                onClick={handleDownloadClick}
                className="flex flex-col items-center justify-center gap-1.5 min-w-0 bg-primary border-2 border-foreground py-3 px-1 rounded-2xl font-black text-[11px] sm:text-xs text-primary-foreground text-center leading-tight active:scale-[0.98] transition-all card-shadow"
              >
                <Download className="h-5 w-5 shrink-0" />
                <span className="w-full line-clamp-2 px-0.5">{t("downloadPDF")}</span>
              </button>
            )}

            <button
              onClick={handleShare}
              disabled={!isPremium || !isDownloaded}
              className={`flex flex-col items-center justify-center gap-1.5 min-w-0 py-3 px-1 rounded-2xl font-black text-[11px] sm:text-xs text-center leading-tight active:scale-[0.98] transition-all card-shadow ${
                isPremium && isDownloaded
                  ? 'bg-card border-2 border-foreground text-foreground'
                  : 'bg-muted border-2 border-border text-muted-foreground opacity-60 cursor-default'
              }`}
            >
              <Share2 className="h-5 w-5 shrink-0" />
              <span className="w-full truncate px-0.5">{t("share")}</span>
            </button>
          </div>

          {/* Premium card — scrollable; bottom bar is fixed separately */}
          <div className="rounded-2xl bg-card border-2 border-border overflow-hidden min-w-0">
            {/* Features grid */}
            <div className="p-4 grid grid-cols-2 gap-2">
              {[
                { icon: "🎯", title: t("topQuestions"),   desc: t("topQuestionsDesc") },
                { icon: "🗺️", title: t("keyTopics"),      desc: t("keyTopicsDesc") },
                { icon: "📋", title: t("cheatSheet"),     desc: t("cheatSheetDesc") },
                { icon: "✅", title: t("stepBySolutions"),  desc: t("stepByStepSolutionsDesc") },
                { icon: "📝", title: t("practiceTests"),  desc: t("practiceTestsDesc") },
                { icon: "🔍", title: t("weakSpots"),      desc: t("weakSpotsDesc") },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="rounded-xl bg-muted/50 p-3 flex flex-col gap-1.5">
                  <span className="text-xl">{icon}</span>
                  <p className="font-black text-xs text-foreground">{title}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Plan buttons — fixed to bottom, constrained to content column */}
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-background/95 backdrop-blur-sm border-t border-border">
            <div className="content-col min-w-0 px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col gap-2 max-w-full box-border">
            {isPremium ? (
              <button
                type="button"
                onClick={() => {
                  setPrepOpen(false);
                  openPremiumGate(paper.subject);
                }}
                className="w-full rounded-2xl bg-premium border-2 border-premium py-4 font-black text-premium-foreground flex items-center justify-center gap-2 card-shadow active:translate-y-0.5 transition-all"
              >
                <Crown className="h-5 w-5" />
                {t("unlockNowBtn")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openPremiumGate(paper.subject)}
                className="w-full rounded-2xl bg-premium border-2 border-premium py-4 font-black text-premium-foreground flex items-center justify-center gap-2 card-shadow active:translate-y-0.5 transition-all"
              >
                <Crown className="h-5 w-5" />
                {t("unlockNowBtn")}
              </button>
            )}
            </div>
          </div>
        </div>
      </div>

      {showPDFViewer && streamPdfUrl && (
        <InAppPDFViewer
          pdfUrl={streamPdfUrl}
          fileName={paper?.title || t("examPaper")}
          subjectName={paper?.subject}
          onClose={() => { setShowPDFViewer(false); setStreamPdfUrl(null); }}
          onPremiumNudge={() => { setShowPDFViewer(false); setStreamPdfUrl(null); setPrepOpen(true); }}
          showShare={isPremium && isDownloaded}
          onShare={handleShare}
        />
      )}

      {/* Prep Overlay — kept for PDF viewer nudge */}
      <AnimatePresence>
        {prepOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50" onClick={() => setPrepOpen(false)} />
            <motion.div variants={sheetVariants}
              initial="hidden" animate="visible" exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="sheet z-50"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
              </div>
              <div className="px-5 pt-2 pb-4 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-black text-foreground break-words min-w-0 flex-1">{t("prepFor")} — {paper.subject}</h2>
                  <button onClick={() => setPrepOpen(false)} className="text-muted-foreground mt-1 shrink-0">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={() => { setPrepOpen(false); setPaymentPlan("single"); (window as any).__packAmount = 500; setShowPaywall(true); }}
                  className="w-full mt-3 rounded-2xl bg-premium border-2 border-premium py-3 px-4 flex items-center justify-between card-shadow active:translate-y-0.5 active:shadow-none transition-all"
                >
                  <div className="text-left">
                    <p className="font-black text-sm text-premium-foreground">{t("unlockNowBtn")}</p>
                    <p className="text-[10px] font-semibold text-premium-foreground/70">{t("getFullAccessFor")} {paper.subject}</p>
                  </div>
                  <Crown className="h-5 w-5 text-premium-foreground shrink-0" />
                </button>
              </div>
              <div className="px-5 pb-6">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: "🎯", title: t("topQuestions"), desc: t("topQuestionsDesc") },
                    { icon: "🗺️", title: t("keyTopics"), desc: t("keyTopicsDesc") },
                    { icon: "📋", title: t("cheatSheet"), desc: t("cheatSheetDesc") },
                    { icon: "✅", title: t("stepBySolutions"), desc: t("stepByStepSolutionsDesc") },
                    { icon: "📝", title: t("practiceTests"), desc: t("practiceTestsDesc") },
                    { icon: "🔍", title: t("weakSpots"), desc: t("weakSpotsDesc") },
                  ].map(({ icon, title, desc }) => (
                    <button key={title}
                      onClick={() => { setPrepOpen(false); setPaymentPlan("single"); (window as any).__packAmount = 500; setShowPaywall(true); }}
                      className="rounded-2xl bg-card border-2 border-border p-3 text-left active:scale-[0.97] transition-transform flex flex-col gap-1.5"
                    >
                      <span className="text-xl">{icon}</span>
                      <p className="font-black text-xs text-foreground">{title}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground leading-relaxed">{desc}</p>
                      <div className="flex items-center gap-1 mt-auto pt-0.5">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-black text-muted-foreground">{t("unlockPremium")}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <>
          <PlanSelectSheet
            open={showPlanSelect}
            onClose={() => setShowPlanSelect(false)}
            subjectName={paper?.subject}
            onSelectPack={() => {
              setShowPlanSelect(false);
              setPaymentPlan("single");
              (window as any).__packAmount = 500;
              setShowPaywall(true);
            }}
            onSelectAll={() => { setShowPlanSelect(false); setPaymentPlan("all"); (window as any).__packAmount = undefined; setShowPaywall(true); }}
          />
          <PaymentSheet
            open={showPaywall}
            onClose={() => setShowPaywall(false)}
            onBack={() => setShowPaywall(false)}
            onSuccess={() => { setShowPaywall(false); handleDownload(); }}
            subjectName={paymentPlan === "single" ? paper?.subject : undefined}
          />
        </>

    </div>
  );
};

export default PaperDetail;
