import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download, AlertCircle, Eye, FolderOpen, Crown, ChevronDown, Lock, X, Check, Share2, Sparkles, ArrowLeft } from "lucide-react";import { motion, AnimatePresence } from "framer-motion";
import { ExamPaper, DownloadProgress } from "@/types/exam-library";
import { examService } from "@/services/examService";
import { downloadService } from "@/services/downloadService";
import { subscriptionService } from "@/services/subscriptionService";
import { PaymentSheet } from "@/components/subscription/PaymentSheet";
import { PlanSelectSheet } from "@/components/subscription/PlanSelectSheet";
import { InAppPDFViewer } from "@/components/exam/InAppPDFViewer";
import { readFileAsBase64 } from "@/lib/filesystem";
import { toast } from "sonner";
import TaskBar from "@/components/TaskBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppConfig } from "@/contexts/AppConfigContext";
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
  const { premiumEnabled: PREMIUM_ENABLED } = useAppConfig();

  const [paper, setPaper] = useState<ExamPaper | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [pdfData, setPdfData] = useState<string>('');
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

  const handleOpen = async () => {
    if (!paper) return;
    try {
      setError(null);
      const { Capacitor } = await import('@capacitor/core');
      const isWeb = Capacitor.getPlatform() === 'web';
      if (isDownloaded && !isWeb) {
        const downloadInfo = await downloadService.getDownloadInfo(paper.id);
        if (!downloadInfo) {
          setError(t("fileNotFoundRedownload"));
          setIsDownloaded(false);
          return;
        }
        setShowPDFViewer(true);
        setPdfData('loading');
        const fileName = downloadInfo.localPath.split('/').pop() || '';
        const base64Data = await readFileAsBase64(fileName);
        setPdfData(base64Data);
      } else {
        setShowPDFViewer(true);
        setPdfData('loading');
        const response = await fetch(paper.fileUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          setPdfData(base64);
        };
        reader.readAsDataURL(blob);
      }
    } catch (err) {
      console.error("Failed to open PDF:", err);
      setError(t("failedOpenPDFDesc"));
      setShowPDFViewer(false);
      setPdfData('');
    }
  };

  const handleDownload = async () => {
    if (!paper) return;
    try {
      setError(null);
      await downloadService.downloadPaper(paper, (progress) => {
        setDownloadProgress(progress);
        if (progress.status === 'completed') {
          setIsDownloaded(true);
          setHasAnyDownload(true);
          setDownloadProgress(null);
          toast.success(t("savedToDownloads"));
        }
      });
    } catch (err) {
      console.error("Download failed:", err);
      setError(err instanceof Error ? err.message : t("downloadFailedRetry"));
      setDownloadProgress(null);
    }
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
    if (!paper) return;
    try {
      const appUrl = import.meta.env.VITE_APP_URL ?? 'https://gostudy.app';
      const deepLink = `${appUrl}/paper/${paper.id}`;
      const shareText = `${paper.title} - ${paper.subject} (${paper.classLevel}, ${paper.year})`;

      const { Share } = await import('@capacitor/share');

      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({
          title: paper.title,
          text: shareText,
          url: deepLink,
          dialogTitle: t("share"),
        });
      } else if (navigator.share) {
        await navigator.share({
          title: paper.title,
          text: shareText,
          url: deepLink,
        });
      } else {
        await navigator.clipboard.writeText(deepLink);
        toast.success(t("linkCopied"));
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
    <div className="flex-1 bg-background min-h-screen pb-24">
      <div className="content-col p-4 safe-area-top">
        {/* Back button — fixed top left */}
        <button
          onClick={() => navigate(-1)}
          className="fixed top-[max(1rem,env(safe-area-inset-top))] left-4 z-50 h-10 w-10 flex items-center justify-center rounded-full bg-card border-2 border-foreground card-shadow active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border mb-6">
          <div className="p-6">
            <h1 className="text-2xl font-black mb-4 leading-tight">{paper.title}</h1>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div className="text-muted-foreground">{t("subject")}</div>
              <div className="font-bold text-right">{paper.subject}</div>
              <div className="text-muted-foreground">{t("classLevel")}</div>
              <div className="font-bold text-right">{paper.classLevel}</div>
              <div className="text-muted-foreground">{t("year")}</div>
              <div className="font-bold text-right">{paper.year}</div>
              <div className="text-muted-foreground">{t("examType")}</div>
              <div className="font-bold text-right">{paper.examType}</div>
              <div className="text-muted-foreground">{t("fileSize")}</div>
              <div className="font-bold text-right">{paper.fileSizeFormatted}</div>
              <div className="text-muted-foreground">{t("downloads")}</div>
              <div className="font-bold text-right">{paper.downloads ?? 0}</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-xl mb-6 flex gap-3 items-start">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-3">
          {/* View / Download / Share — single row */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleOpen}
              className="flex flex-col items-center justify-center gap-2 bg-card border-2 border-foreground py-4 rounded-2xl font-black text-sm text-foreground active:scale-[0.98] transition-all card-shadow"
            >
              {isDownloaded ? <FolderOpen className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              {isDownloaded ? t("open") : t("view")}
            </button>

            {isDownloaded ? (
              <button disabled className="flex flex-col items-center justify-center gap-2 bg-muted border-2 border-border py-4 rounded-2xl font-black text-sm text-muted-foreground opacity-60 cursor-default">
                <Check className="h-5 w-5" />
                {t("downloaded")}
              </button>
            ) : downloadProgress ? (
              <button
                onClick={handleCancelDownload}
                className="flex flex-col items-center justify-center gap-2 bg-primary border-2 border-foreground py-4 rounded-2xl font-black text-sm text-primary-foreground active:scale-[0.98] transition-all card-shadow"
              >
                <div className="relative h-5 w-5">
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth="2.5" />
                    <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 8}`}
                      strokeDashoffset={`${2 * Math.PI * 8 * (1 - (downloadProgress.progress ?? 0) / 100)}`}
                      className="transition-all duration-300"
                    />
                  </svg>
                </div>
                {Math.round(downloadProgress.progress ?? 0)}%
              </button>
            ) : (
              <button
                onClick={handleDownload}
                className="flex flex-col items-center justify-center gap-2 bg-primary border-2 border-foreground py-4 rounded-2xl font-black text-sm text-primary-foreground active:scale-[0.98] transition-all card-shadow"
              >
                <Download className="h-5 w-5" />
                {t("downloadPDF")}
              </button>
            )}

            <button
              onClick={handleShare}
              className="flex flex-col items-center justify-center gap-2 bg-card border-2 border-foreground py-4 rounded-2xl font-black text-sm text-foreground active:scale-[0.98] transition-all card-shadow"
            >
              <Share2 className="h-5 w-5" />
              {t("share")}
            </button>
          </div>

          {/* Premium card — always visible, buttons fixed at bottom */}
          <div className="rounded-2xl bg-card border-2 border-border overflow-hidden mb-32">
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

          {/* Plan buttons — fixed to bottom, above safe area */}
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-background border-t border-border px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col gap-2">
            {PREMIUM_ENABLED ? (
              <>
                <button
                  onClick={() => { setPaymentPlan("single"); (window as any).__packAmount = 500; setShowPaywall(true); }}
                  className="w-full rounded-2xl bg-card border-2 border-foreground p-4 text-left card-shadow active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-3"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/15 border-2 border-foreground/10 shrink-0">
                    <Crown className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-foreground text-sm">{t("unlockSubjectPack").replace("{subject}", paper.subject)}</p>
                    <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">{t("packLifetime")}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 -rotate-90" />
                </button>
                <button
                  onClick={() => { setPaymentPlan("all"); (window as any).__packAmount = undefined; setShowPaywall(true); }}
                  className="w-full rounded-2xl bg-premium border-2 border-premium p-4 text-left card-shadow active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-3"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 border-2 border-white/20 shrink-0">
                    <Sparkles className="h-5 w-5 text-premium-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-premium-foreground text-sm">{t("allSubjectsPass")}</p>
                    <p className="text-[10px] font-semibold text-premium-foreground/70 mt-0.5">{t("passOneMonth")}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-[10px] font-black text-premium-foreground bg-white/15 px-2 py-0.5 rounded-full border border-white/20 whitespace-nowrap">{t("bestValue")}</span>
                    <ChevronDown className="h-4 w-4 text-premium-foreground/60 -rotate-90" />
                  </div>
                </button>
              </>
            ) : (
              <div className="w-full rounded-2xl bg-muted border-2 border-border py-4 font-black text-muted-foreground flex items-center justify-center gap-2 opacity-60 cursor-not-allowed">
                <Crown className="h-4 w-4" />
                {t("comingSoon")}
              </div>
            )}
          </div>
        </div>
      </div>

      {showPDFViewer && (
        <InAppPDFViewer
          pdfData={pdfData}
          fileName={paper?.title || t("examPaper")}
          subjectName={paper?.subject}
          onClose={() => { setShowPDFViewer(false); setPdfData(''); }}
          onPremiumNudge={() => { setShowPDFViewer(false); setPdfData(''); setPrepOpen(true); }}
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
              <div className="px-5 pt-2 pb-4">
                <div className="flex items-start justify-between mb-1">
                  <h2 className="text-xl font-black text-foreground">{t("prepFor")} — {paper.subject}</h2>
                  <button onClick={() => setPrepOpen(false)} className="text-muted-foreground mt-1">
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
