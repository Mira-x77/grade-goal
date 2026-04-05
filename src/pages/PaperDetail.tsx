import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download, FileText, Trash2, AlertCircle, Eye, Crown, ChevronDown, Lock, BookOpen, Lightbulb, CheckCircle2, FileText as FileText2, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ExamPaper, DownloadProgress } from "@/types/exam-library";
import { examService } from "@/services/examService";
import { downloadService } from "@/services/downloadService";
import { subscriptionService } from "@/services/subscriptionService";
import { DownloadProgressBar } from "@/components/exam/DownloadProgressBar";
import { PremiumCodeDialog } from "@/components/subscription/PremiumCodeDialog";
import { SubscriptionDetailDialog } from "@/components/subscription/SubscriptionDetailDialog";
import { PaymentSheet } from "@/components/subscription/PaymentSheet";
import { PlanSelectSheet } from "@/components/subscription/PlanSelectSheet";
import { LockedPreview } from "@/components/ui/LockedPreview";
import { InAppPDFViewer } from "@/components/exam/InAppPDFViewer";
import { readFileAsBase64 } from "@/lib/filesystem";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import TaskBar from "@/components/TaskBar";

const PaperDetail = () => {
  const { paperId } = useParams<{ paperId: string }>();
  const navigate = useNavigate();
  
  const [paper, setPaper] = useState<ExamPaper | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [pdfData, setPdfData] = useState<string>('');
  
  // Subscription dialogs
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPlanSelect, setShowPlanSelect] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<"single" | "all">("single");
  const [prepOpen, setPrepOpen] = useState(false);

  const loadPaper = useCallback(async () => {
    if (!paperId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const paperData = await examService.getPaper(paperId);
      setPaper(paperData);
      
      const downloaded = await downloadService.isPaperDownloaded(paperId);
      setIsDownloaded(downloaded);
    } catch (err) {
      console.error("Failed to load paper:", err);
      setError("Failed to load paper details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [paperId]);

  useEffect(() => {
    loadPaper();
  }, [loadPaper]);

  const handleView = async () => {
    if (!paper) return;
    try {
      setError(null);

      const isWeb = (await import('@capacitor/core')).Capacitor.getPlatform() === 'web';

      if (isDownloaded && !isWeb) {
        // Mobile: open from local file
        const downloadInfo = await downloadService.getDownloadInfo(paper.id);
        if (!downloadInfo) {
          setError("File not found. Please download again.");
          setIsDownloaded(false);
          return;
        }
        setShowPDFViewer(true);
        setPdfData('loading');
        const fileName = downloadInfo.localPath.split('/').pop() || '';
        const base64Data = await readFileAsBase64(fileName);
        setPdfData(base64Data);
      } else {
        // Web (downloaded or not): fetch from URL
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
      setError("Failed to open PDF.");
      setShowPDFViewer(false);
      setPdfData('');
    }
  };

  const handleDownload = async () => {
    if (!paper) return;
    try {
      setError(null);

      const subStatus = await subscriptionService.canDownload();
      if (!subStatus.allowed) {
        if (subStatus.reason === 'limit_reached') {
          setShowCodeDialog(true);
          return;
        }
      }

      await downloadService.downloadPaper(paper, (progress) => {
        setDownloadProgress(progress);
        if (progress.status === 'completed') {
          setIsDownloaded(true);
          setDownloadProgress(null);
          subscriptionService.incrementDownload();
          toast.success("Saved to your library");
        }
      });
    } catch (err) {
      console.error("Download failed:", err);
      setError(err instanceof Error ? err.message : "Download failed. Please try again.");
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

  const handleDelete = async () => {
    if (!paper) return;
    
    try {
      setError(null);
      await downloadService.deletePaper(paper.id);
      setIsDownloaded(false);
      setShowDeleteConfirm(false);
      toast.success("Paper deleted from device");
    } catch (err) {
      console.error("Failed to delete paper:", err);
      setError("Failed to delete paper. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-background min-h-screen">
        <div className="max-w-md mx-auto p-4 safe-area-top">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-64 bg-muted rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="flex-1 bg-background min-h-screen">
        <div className="max-w-md mx-auto p-4 safe-area-top text-center py-20">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-6">Paper not found</p>
          <button onClick={() => navigate("/library")} className="text-primary font-bold">
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background min-h-screen pb-10">
      <div className="max-w-md mx-auto p-4 safe-area-top">
        {/* Paper Details Card */}
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border mb-6">
          {(paper as any).preview_url && (
            <div className="h-64 bg-muted flex items-center justify-center overflow-hidden">
              <img 
                src={(paper as any).preview_url} 
                className="w-full h-full object-cover" 
                alt="Preview"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            </div>
          )}
          
          <div className="p-6">
            <h1 className="text-2xl font-black mb-4 leading-tight">{paper.title}</h1>
            
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div className="text-muted-foreground">Subject</div>
              <div className="font-bold text-right">{paper.subject}</div>
              
              <div className="text-muted-foreground">Class</div>
              <div className="font-bold text-right">{paper.classLevel}</div>
              
              <div className="text-muted-foreground">Year</div>
              <div className="font-bold text-right">{paper.year}</div>
              
              <div className="text-muted-foreground">Type</div>
              <div className="font-bold text-right">{paper.examType}</div>
              
              <div className="text-muted-foreground">Size</div>
              <div className="font-bold text-right">{paper.fileSizeFormatted}</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-xl mb-6 flex gap-3 items-start">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* View + Download row */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleView}
              className="flex flex-col items-center justify-center gap-2 bg-card border-2 border-foreground py-4 rounded-2xl font-black text-sm text-foreground active:scale-[0.98] transition-all card-shadow"
            >
              <Eye className="h-5 w-5" />
              View
            </button>

            {isDownloaded ? (
              <button
                disabled
                className="flex flex-col items-center justify-center gap-2 bg-muted border-2 border-border py-4 rounded-2xl font-black text-sm text-muted-foreground opacity-60 cursor-default"
              >
                <Check className="h-5 w-5" />
                Downloaded
              </button>
            ) : downloadProgress ? (
              <button
                onClick={handleCancelDownload}
                className="flex flex-col items-center justify-center gap-2 bg-primary border-2 border-foreground py-4 rounded-2xl font-black text-sm text-primary-foreground active:scale-[0.98] transition-all card-shadow"
              >
                <div className="relative h-5 w-5">
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth="2.5" />
                    <circle
                      cx="10" cy="10" r="8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
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
                Download
              </button>
            )}
          </div>

          {/* Prep — opens overlay */}
          <button
            onClick={() => setPrepOpen(true)}
            className="w-full flex items-center gap-4 bg-secondary border-2 border-foreground py-4 px-5 rounded-2xl card-shadow active:translate-y-0.5 active:shadow-none transition-all"
          >
            <Crown className="h-6 w-6 text-foreground shrink-0" />
            <div className="text-left flex-1">
              <p className="font-black text-sm text-foreground">Prep for {paper.subject}</p>
              <p className="text-xs font-semibold text-foreground/60">6 premium study tools · Exam-specific</p>
            </div>
            <ChevronDown className="h-5 w-5 text-foreground rotate-[-90deg]" />
          </button>

          {isDownloaded && !downloadProgress && (
            <div className="mt-2">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-3 text-destructive text-sm font-bold opacity-70 hover:opacity-100 flex items-center justify-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove from device
                </button>
              ) : (
                <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-xl text-center">
                  <p className="text-sm font-bold text-destructive mb-3">Delete this paper?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 bg-muted py-2 rounded-lg text-sm font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex-1 bg-destructive text-destructive-foreground py-2 rounded-lg text-sm font-bold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      {showPDFViewer && (
        <InAppPDFViewer
          pdfData={pdfData}
          fileName={paper?.title || "Exam Paper"}
          onClose={() => {
            setShowPDFViewer(false);
            setPdfData('');
          }}
        />
      )}

      {/* Prep Overlay */}
      <AnimatePresence>
        {prepOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setPrepOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-background rounded-t-3xl border-t-2 border-x-2 border-foreground"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
              </div>

              {/* Header */}
              <div className="px-5 pt-2 pb-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h2 className="text-xl font-black text-foreground">Prep — {paper.subject}</h2>
                  </div>
                  <button onClick={() => setPrepOpen(false)} className="text-muted-foreground mt-1">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Unlock CTA */}
                <button
                  onClick={() => { setPrepOpen(false); setShowPlanSelect(true); }}
                  className="w-full mt-3 rounded-2xl bg-secondary border-2 border-foreground py-3 px-4 flex items-center justify-between card-shadow active:translate-y-0.5 active:shadow-none transition-all"
                >
                  <div className="text-left">
                    <p className="font-black text-sm text-foreground">Unlock Now</p>
                    <p className="text-[10px] font-semibold text-foreground/60">Get full access for {paper.subject}</p>
                  </div>
                  <Crown className="h-5 w-5 text-foreground shrink-0" />
                </button>
              </div>

              {/* Feature grid — no scroll, all tiles visible */}
              <div className="px-5 pb-6">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: "🎯", title: "Top Questions", desc: "30 most repeated questions across past papers" },
                    { icon: "🗺️", title: "Key Topics", desc: "Topics ranked by exam frequency" },
                    { icon: "📋", title: "Cheat Sheet", desc: "Formulas, definitions and rules that appear most" },
                    { icon: "✅", title: "Solutions", desc: "Step-by-step worked solutions with patterns" },
                    { icon: "📊", title: "Score Predictor", desc: "Predicts your likely final score range" },
                    { icon: "🔍", title: "Weak Spots", desc: "Your weakest areas vs what exams test most" },
                  ].map(({ icon, title, desc }) => (
                    <button
                      key={title}
                      onClick={() => { setPrepOpen(false); setShowPlanSelect(true); }}
                      className="rounded-2xl bg-card border-2 border-border p-3 text-left active:scale-[0.97] transition-transform flex flex-col gap-1.5"
                    >
                      <span className="text-xl">{icon}</span>
                      <p className="font-black text-xs text-foreground">{title}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground leading-relaxed">{desc}</p>
                      <div className="flex items-center gap-1 mt-auto pt-0.5">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-black text-muted-foreground">Premium</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Plan selection → then payment */}
      <PlanSelectSheet
        open={showPlanSelect}
        onClose={() => setShowPlanSelect(false)}
        subjectName={paper?.subject}
        onSelectPack={() => { setShowPlanSelect(false); setPaymentPlan("single"); setShowPaywall(true); }}
        onSelectAll={() => { setShowPlanSelect(false); setPaymentPlan("all"); setShowPaywall(true); }}
      />

      <PaymentSheet
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSuccess={() => { setShowPaywall(false); handleDownload(); }}
        subjectName={paymentPlan === "single" ? paper?.subject : undefined}
      />

      {!showPDFViewer && <TaskBar showBack />}
    </div>
  );
};

export default PaperDetail;

