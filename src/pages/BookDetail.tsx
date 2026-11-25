import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download, AlertCircle, Eye, FolderOpen, X, Check, BookOpen, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LibraryBook, UnifiedDownloadProgress } from "@/types/exam-library";
import { CollapsiblePageHeader } from "@/components/CollapsiblePageHeader";
import { bookService } from "@/services/bookService";
import { downloadService } from "@/services/downloadService";
import { subscriptionService } from "@/services/subscriptionService";
import { InAppPDFViewer } from "@/components/exam/InAppPDFViewer";
import { readBookFileAsBase64 } from "@/lib/filesystem";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePremium } from "@/contexts/AppConfigContext";
import { useDownloadQuota } from "@/hooks/useDownloadQuota";
import { useLibraryContentGate } from "@/hooks/useLibraryContentGate";

const BookDetail = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isPremium, openDownloadLimitGate } = usePremium();
  const { canDownload, refreshQuota } = useDownloadQuota();
  const { canView, requireViewAccess } = useLibraryContentGate();

  const [book, setBook] = useState<LibraryBook | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<UnifiedDownloadProgress | null>(null);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [pdfData, setPdfData] = useState<string>('');
  const [hasAnyDownload, setHasAnyDownload] = useState(false);

  const loadBook = useCallback(async () => {
    if (!bookId) return;
    try {
      setLoading(true);
      setError(null);
      const bookData = await bookService.getBook(bookId);
      setBook(bookData);
      const downloaded = await downloadService.isBookDownloaded(bookId);
      setIsDownloaded(downloaded);
      const allDownloaded = await downloadService.getDownloadedBooks();
      setHasAnyDownload(allDownloaded.length > 0);
    } catch (err) {
      console.error("Failed to load book:", err);
      setError(t("failedLoadBook") || "Failed to load book");
    } finally {
      setLoading(false);
    }
  }, [bookId, t]);

  useEffect(() => { loadBook(); }, [loadBook]);

  // Monitor download status changes in real-time
  useEffect(() => {
    if (!bookId) return;

    const checkDownloadStatus = async () => {
      try {
        const downloaded = await downloadService.isBookDownloaded(bookId);
        setIsDownloaded(downloaded);
      } catch (error) {
        console.error('Failed to check download status:', error);
      }
    };

    checkDownloadStatus();

    let intervalId: NodeJS.Timeout | null = null;
    if (downloadProgress && downloadProgress.status === 'downloading') {
      intervalId = setInterval(checkDownloadStatus, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [bookId, downloadProgress]);

  const handleOpen = async () => {
    if (!book) return;
    if (!requireViewAccess({
      alreadyOnDevice: isDownloaded,
      onSuccess: () => {
        void handleOpen();
      },
    })) return;
    try {
      setError(null);
      const { Capacitor } = await import('@capacitor/core');
      const isWeb = Capacitor.getPlatform() === 'web';

      if (isDownloaded && !isWeb) {
        const downloadInfo = await downloadService.getBookDownloadInfo(book.id);
        if (!downloadInfo) {
          setError(t("fileNotFoundRedownload") || "File not found. Please re-download the book.");
          setIsDownloaded(false);
          return;
        }
        setShowPDFViewer(true);
        setPdfData('loading');
        const fileName = downloadInfo.localPath.split('/').pop() || '';
        const base64Data = await readBookFileAsBase64(fileName);
        // Sanitize whitespace that can corrupt base64 decoding
        const sanitized = base64Data.replace(/\s/g, '');
        if (!sanitized || sanitized.length === 0) {
          throw new Error('File appears to be empty or corrupted. Please re-download.');
        }
        setPdfData(sanitized);
      } else {
        setShowPDFViewer(true);
        setPdfData('loading');
        const response = await fetch(book.file_url);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            try {
              const result = reader.result as string;
              if (!result || !result.includes(',')) {
                reject(new Error('Failed to read PDF data'));
                return;
              }
              resolve(result.split(',')[1].replace(/\s/g, ''));
            } catch (e) {
              reject(e);
            }
          };
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(blob);
        });
        setPdfData(base64);
      }
    } catch (err) {
      console.error('Failed to open book:', err);
      const msg = err instanceof Error ? err.message : (t("failedOpenPDFDesc") || "Failed to open book");
      setError(msg);
      setShowPDFViewer(false);
      setPdfData('');
    }
  };

  const handleDownload = async () => {
    if (!book) return;
    const paidNow = isPremium || (await subscriptionService.getStatus()).hasPremiumAccess;
    if (!paidNow && !canDownload) {
      openDownloadLimitGate(() => {
        void handleDownload();
      });
      return;
    }
    try {
      setError(null);
      await downloadService.downloadBook(book, (progress) => {
        setDownloadProgress(progress);
        if (progress.status === 'completed') {
          setIsDownloaded(true);
          setHasAnyDownload(true);
          setDownloadProgress(null);
          void refreshQuota();
          toast.success(t("savedToDownloads") || "Book saved to downloads!");
        }
      });
      
      // Increment download count
      await bookService.incrementDownloadCount(book.id);
    } catch (err) {
      console.error("Download failed:", err);
      const errorMessage = err instanceof Error ? err.message : (t("downloadFailedRetry") || "Download failed. Please try again.");
      
      // Check if it's a quota error
      if (errorMessage.includes('Download limit reached') || errorMessage.includes('limit reached')) {
        openDownloadLimitGate(() => {
          void handleDownload();
        });
      } else {
        setError(errorMessage);
        toast.error(t("downloadFailedRetry") || "Download failed");
      }
      setDownloadProgress(null);
    }
  };

  const handleCancelDownload = async () => {
    if (!bookId) return;
    try {
      await downloadService.cancelDownload(bookId);
      setDownloadProgress(null);
    } catch (err) {
      console.error("Failed to cancel download:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-background min-h-screen">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error && !book) {
    return (
      <div className="flex-1 bg-background min-h-screen">
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t("errorLoadingBook") || "Error Loading Book"}
          </h2>
          <p className="text-muted-foreground text-center mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            {t("goBack") || "Go Back"}
          </button>
        </div>
      </div>
    );
  }

  if (!book) return null;

  const isDownloading = downloadProgress?.status === 'downloading';
  const progressPercent = downloadProgress?.progress || 0;

  // Downloads shortcut button — morphs out of tab bar when first book is saved
  const downloadAction = hasAnyDownload ? (
    <motion.button
      initial={{ opacity: 0, scale: 0.5, x: 16 }}
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
    <div className="flex-1 bg-background min-h-screen overflow-x-hidden w-full max-w-[100vw] pb-24">
      <CollapsiblePageHeader
        title={book.title}
        onBack={() => navigate(-1)}
        backLabel={t("goBack")}
        expandLabel={t("showDetails")}
        collapseLabel={t("hideDetails")}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-x-3 gap-y-2 text-sm min-w-0">
          <div className="text-muted-foreground shrink-0">{t("subject") || "Subject"}</div>
          <div className="font-bold text-right break-words min-w-0">{book.subject}</div>

          {book.author && (
            <>
              <div className="text-muted-foreground">{t("author") || "Author"}</div>
              <div className="font-bold text-right break-words min-w-0">{book.author}</div>
            </>
          )}

          <div className="text-muted-foreground">{t("category") || "Category"}</div>
          <div className="font-bold text-right break-words min-w-0">{book.category}</div>

          {book.published_year && (
            <>
              <div className="text-muted-foreground">{t("publishedYear") || "Year"}</div>
              <div className="font-bold text-right break-words min-w-0">{book.published_year}</div>
            </>
          )}

          <div className="text-muted-foreground">{t("fileSize") || "File Size"}</div>
          <div className="font-bold text-right break-words min-w-0">{book.file_size_formatted}</div>

          <div className="text-muted-foreground">{t("downloads") || "Downloads"}</div>
          <div className="font-bold text-right break-words min-w-0">{book.downloads ?? 0}</div>
        </div>
      </CollapsiblePageHeader>

      <div className="content-col p-4 min-w-0">
        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-xl mb-6 flex gap-3 items-start">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 min-w-0">
          {/* View / Download */}
          <div className="grid grid-cols-2 gap-2 min-w-0 w-full">
            {!canView ? (
              <button
                onClick={() => openDownloadLimitGate()}
                className="flex flex-col items-center justify-center gap-1.5 min-w-0 bg-muted border-2 border-border py-3 px-1 rounded-2xl font-black text-[11px] sm:text-xs text-muted-foreground text-center leading-tight active:scale-[0.98] transition-all"
              >
                <Lock className="h-5 w-5 shrink-0" />
                <span className="w-full truncate px-0.5">{isDownloaded ? t("open") || "Open" : t("view") || "View"}</span>
              </button>
            ) : (
              <button
                onClick={handleOpen}
                className="flex flex-col items-center justify-center gap-1.5 min-w-0 bg-card border-2 border-foreground py-3 px-1 rounded-2xl font-black text-[11px] sm:text-xs text-foreground text-center leading-tight active:scale-[0.98] transition-all card-shadow"
              >
                {isDownloaded ? <FolderOpen className="h-5 w-5 shrink-0" /> : <Eye className="h-5 w-5 shrink-0" />}
                <span className="w-full truncate px-0.5">{isDownloaded ? t("open") || "Open" : t("view") || "View"}</span>
              </button>
            )}

            {isDownloaded ? (
              <button disabled className="flex flex-col items-center justify-center gap-1.5 min-w-0 bg-muted border-2 border-border py-3 px-1 rounded-2xl font-black text-[11px] sm:text-xs text-muted-foreground text-center leading-tight opacity-60 cursor-default">
                <Check className="h-5 w-5 shrink-0" />
                <span className="w-full truncate px-0.5">{t("downloaded") || "Downloaded"}</span>
              </button>
            ) : !canView ? (
              <button
                onClick={() => openDownloadLimitGate()}
                className="flex flex-col items-center justify-center gap-1.5 min-w-0 bg-muted border-2 border-border py-3 px-1 rounded-2xl font-black text-[11px] sm:text-xs text-muted-foreground text-center leading-tight active:scale-[0.98] transition-all"
              >
                <Lock className="h-5 w-5 shrink-0" />
                <span className="w-full line-clamp-2 px-0.5">{t("downloadBook") || "Download"}</span>
              </button>
            ) : (
              <button
                onClick={isDownloading ? handleCancelDownload : () => void handleDownload()}
                disabled={!navigator.onLine && !isDownloading}
                className="flex flex-col items-center justify-center gap-1.5 min-w-0 bg-primary border-2 border-foreground py-3 px-1 rounded-2xl font-black text-[11px] sm:text-xs text-primary-foreground text-center leading-tight active:scale-[0.98] transition-all card-shadow disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
              >
                {isDownloading ? (
                  <>
                    <X className="h-5 w-5 shrink-0" />
                    <span className="relative z-10 w-full truncate px-0.5">{t("cancel") || "Cancel"} ({Math.round(progressPercent)}%)</span>
                    <div 
                      className="absolute inset-0 bg-primary/30 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 shrink-0" />
                    <span className="w-full line-clamp-2 px-0.5 relative z-10">{t("downloadBook") || "Download"}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        {book.description && (
          <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border mt-6">
            <div className="p-6">
              <h3 className="text-lg font-black mb-3">
                {t("description") || "Description"}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {book.description}
              </p>
            </div>
          </div>
        )}

        {/* Tags */}
        {book.tags && book.tags.length > 0 && (
          <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border mt-6">
            <div className="p-6">
              <h3 className="text-lg font-black mb-3">
                {t("tags") || "Tags"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {book.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-full font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Downloads Button */}
      <AnimatePresence>
        {downloadAction}
      </AnimatePresence>

      {/* PDF Viewer */}
      <AnimatePresence>
        {showPDFViewer && pdfData === 'loading' && (
          <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground font-medium">{t("loadingPDF") || "Loading PDF..."}</p>
            </div>
          </div>
        )}
        
        {showPDFViewer && pdfData && pdfData !== 'loading' && (
          <InAppPDFViewer
            pdfData={pdfData}
            fileName={book.title}
            onClose={() => {
              setShowPDFViewer(false);
              setPdfData('');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookDetail;
