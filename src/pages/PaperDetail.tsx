import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileText, Trash2, AlertCircle, Eye } from "lucide-react";
import { ExamPaper, DownloadProgress } from "@/types/exam-library";
import { examService } from "@/services/examService";
import { downloadService } from "@/services/downloadService";
import { subscriptionService } from "@/services/subscriptionService";
import { DownloadProgressBar } from "@/components/exam/DownloadProgressBar";
import { PremiumCodeDialog } from "@/components/subscription/PremiumCodeDialog";
import { InAppPDFViewer } from "@/components/exam/InAppPDFViewer";
import { readFileAsBase64 } from "@/lib/filesystem";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

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

  const handleDownload = async () => {
    if (!paper) return;
    
    try {
      setError(null);
      
      // On web platform, just open PDF in new tab
      if (Capacitor.getPlatform() === 'web') {
        window.open(paper.fileUrl, '_blank');
        // Still increment download count
        await subscriptionService.incrementDownload();
        return;
      }
      
      // On mobile, check subscription if needed
      const subStatus = await subscriptionService.canDownload();
      if (!subStatus.allowed) {
        if (subStatus.reason === 'limit_reached') {
          setShowCodeDialog(true);
          return;
        }
      }

      // Start download
      await downloadService.downloadPaper(paper, (progress) => {
        setDownloadProgress(progress);
        if (progress.status === 'completed') {
          setIsDownloaded(true);
          setDownloadProgress(null);
          subscriptionService.incrementDownload();
          toast.success("Download complete");
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

  const handleOpen = async () => {
    if (!paper) return;
    
    try {
      setError(null);
      const downloadInfo = await downloadService.getDownloadInfo(paper.id);
      
      if (!downloadInfo) {
        setError("File not found. Please download again.");
        setIsDownloaded(false);
        return;
      }
      
      // Show loading state immediately
      setShowPDFViewer(true);
      setPdfData('loading');
      
      // Load PDF data
      const fileName = downloadInfo.localPath.split('/').pop() || '';
      const base64Data = await readFileAsBase64(fileName);
      setPdfData(base64Data);
    } catch (err) {
      console.error("Failed to open PDF:", err);
      setError(err instanceof Error ? err.message : "Failed to open PDF.");
      toast.error("Failed to open PDF");
      setShowPDFViewer(false);
      setPdfData('');
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
        {/* Header */}
        <button
          onClick={() => navigate("/library")}
          className="flex items-center gap-2 text-muted-foreground mb-6 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Library</span>
        </button>

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
        <div className="space-y-4">
          {downloadProgress && (
            <DownloadProgressBar 
              progress={downloadProgress} 
              onCancel={handleCancelDownload} 
            />
          )}

          {!isDownloaded && !downloadProgress && (
            <button
              onClick={handleDownload}
              className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
            >
              {Capacitor.getPlatform() === 'web' ? (
                <>
                  <Eye className="h-5 w-5" />
                  View PDF
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Download PDF
                </>
              )}
            </button>
          )}

          {isDownloaded && !downloadProgress && (
            <div className="space-y-3">
              <button
                onClick={handleOpen}
                className="w-full bg-secondary text-secondary-foreground py-4 rounded-xl font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <FileText className="h-5 w-5" />
                Open PDF
              </button>
              
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

      {/* Subscription Dialog */}
      <PremiumCodeDialog
        open={showCodeDialog}
        onClose={() => setShowCodeDialog(false)}
        onSuccess={() => {
          setShowCodeDialog(false);
          handleDownload();
        }}
      />
    </div>
  );
};

export default PaperDetail;
