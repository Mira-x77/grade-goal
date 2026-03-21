import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, FileText, HardDrive } from "lucide-react";
import { motion } from "framer-motion";
import { downloadService } from "@/services/downloadService";
import { cacheService } from "@/services/cacheService";
import { CachedPaper } from "@/types/exam-library";
import { formatBytes } from "@/lib/integrity";
import { InAppPDFViewer } from "@/components/exam/InAppPDFViewer";
import { readFileAsBase64 } from "@/lib/filesystem";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

const MyDownloads = () => {
  const navigate = useNavigate();
  const [downloadedPapers, setDownloadedPapers] = useState<CachedPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStorage, setTotalStorage] = useState(0);
  const [selectedPapers, setSelectedPapers] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentPDF, setCurrentPDF] = useState<{ data: string; title: string } | null>(null);

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    try {
      setLoading(true);
      console.log('📥 MyDownloads: Loading downloads...');
      const cachedPapers = await cacheService.getCachedPapers();
      console.log('📦 MyDownloads: Total cached papers:', cachedPapers.length);
      const downloaded = cachedPapers.filter(p => p.isDownloaded);
      console.log('✅ MyDownloads: Downloaded papers:', downloaded.length, downloaded);
      setDownloadedPapers(downloaded);

      const storage = await downloadService.getTotalStorageUsed();
      setTotalStorage(storage);
    } catch (error) {
      console.error("Failed to load downloads:", error);
      toast.error("Failed to load downloads");
    } finally {
      setLoading(false);
    }
  };

  const handlePaperClick = async (paper: CachedPaper) => {
    if (showBulkDelete) return;
    
    if (paper.localPath) {
      try {
        // Show viewer immediately with loading state
        setShowPDFViewer(true);
        setCurrentPDF({ data: 'loading', title: paper.title });
        
        // Load PDF in background
        const fileName = paper.localPath.split('/').pop() || '';
        const base64Data = await readFileAsBase64(fileName);
        setCurrentPDF({ data: base64Data, title: paper.title });
      } catch (error) {
        console.error('Failed to read PDF:', error);
        toast.error("Failed to open PDF file");
        setShowPDFViewer(false);
        setCurrentPDF(null);
      }
    } else {
      toast.error("PDF file not found");
    }
  };

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

  const handleBulkDelete = async () => {
    if (selectedPapers.size === 0) return;

    try {
      await downloadService.deleteMultiplePapers(Array.from(selectedPapers));
      toast.success(`${selectedPapers.size} papers deleted`);
      setSelectedPapers(new Set());
      setShowBulkDelete(false);
      loadDownloads();
    } catch (error) {
      console.error("Failed to delete papers:", error);
      toast.error("Failed to delete some papers");
    }
  };

  const togglePaperSelection = (paperId: string) => {
    const newSelection = new Set(selectedPapers);
    if (newSelection.has(paperId)) {
      newSelection.delete(paperId);
    } else {
      newSelection.add(paperId);
    }
    setSelectedPapers(newSelection);
  };

  const selectAll = () => {
    setSelectedPapers(new Set(downloadedPapers.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedPapers(new Set());
  };

  if (loading) {
    return (
      <div className="flex-1 bg-background">
        <div className="w-full max-w-md mx-auto px-4 py-4 safe-area-top">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/2 mb-4"></div>
            <div className="h-20 bg-muted rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-24 bg-muted rounded"></div>
              <div className="h-24 bg-muted rounded"></div>
              <div className="h-24 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="w-full max-w-md mx-auto px-4 py-4 safe-area-top">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/library")}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
            {t("backToLibrary")}
          </button>
          
          {downloadedPapers.length > 0 && (
            <button
              onClick={() => setShowBulkDelete(!showBulkDelete)}
              className="text-sm font-bold text-primary"
            >
              {showBulkDelete ? t("cancel") : t("select")}
            </button>
          )}
        </div>

        <h1 className="text-2xl font-black mb-2">{t("myDownloads")}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {t("papersSavedDevice")}
        </p>

        {/* Storage Info */}
        <div className="bg-card rounded-2xl p-4 card-shadow mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
              <HardDrive className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-muted-foreground">
                {t("totalStorageUsed")}
              </p>
              <p className="text-xl font-black">{formatBytes(totalStorage)}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black">{downloadedPapers.length}</p>
              <p className="text-xs font-semibold text-muted-foreground">
                {downloadedPapers.length === 1 ? t("paper") : t("papers")}
              </p>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {showBulkDelete && downloadedPapers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-4 card-shadow mb-4"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold">
                {selectedPapers.size} {t("selected")}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs font-bold text-primary"
                >
                  {t("selectAll")}
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  onClick={deselectAll}
                  className="text-xs font-bold text-muted-foreground"
                >
                  {t("deselectAll")}
                </button>
              </div>
            </div>
            
            {selectedPapers.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="w-full bg-destructive text-destructive-foreground rounded-xl py-3 font-bold flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t("delete")} {selectedPapers.size} {selectedPapers.size === 1 ? t("paper") : t("papers")}
              </button>
            )}
          </motion.div>
        )}

        {/* Papers List */}
        {downloadedPapers.length === 0 ? (
          <div className="text-center py-12">
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
        ) : (
          <div className="space-y-3">
            {downloadedPapers.map((paper) => (
              <motion.div
                key={paper.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-card rounded-2xl p-4 card-shadow transition-all ${
                  showBulkDelete ? "cursor-pointer" : ""
                } ${
                  selectedPapers.has(paper.id) ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => {
                  if (showBulkDelete) {
                    togglePaperSelection(paper.id);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  {showBulkDelete && (
                    <div className="flex items-center pt-1">
                      <div
                        className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                          selectedPapers.has(paper.id)
                            ? "bg-primary border-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {selectedPapers.has(paper.id) && (
                          <svg
                            className="h-3 w-3 text-primary-foreground"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  )}

                  <div
                    className="flex-1 min-w-0"
                    onClick={(e) => {
                      if (!showBulkDelete) {
                        e.stopPropagation();
                        handlePaperClick(paper);
                      }
                    }}
                  >
                    <h3 className="font-black text-sm line-clamp-2 mb-1">
                      {paper.title}
                    </h3>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      {paper.subject} • {paper.classLevel}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-muted-foreground">
                        {paper.fileSizeFormatted}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="font-semibold text-muted-foreground">
                        {t("downloadedOn")} {new Date(paper.downloadedAt!).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {!showBulkDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(paper.id);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 active:scale-95 transition-transform"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  )}
                </div>

                {/* Delete Confirmation */}
                {showDeleteConfirm === paper.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 pt-3 border-t border-border"
                  >
                    <p className="text-xs text-center mb-2">
                      {t("deleteThisPaper")}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(null);
                        }}
                        className="flex-1 bg-muted text-foreground rounded-lg py-2 text-sm font-semibold"
                      >
                        {t("cancel")}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSingle(paper.id);
                        }}
                        className="flex-1 bg-destructive text-destructive-foreground rounded-lg py-2 text-sm font-semibold"
                      >
                        {t("delete")}
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* PDF Viewer */}
      {showPDFViewer && currentPDF && currentPDF.data !== 'loading' && (
        <InAppPDFViewer
          pdfData={currentPDF.data}
          fileName={currentPDF.title}
          onClose={() => {
            setShowPDFViewer(false);
            setCurrentPDF(null);
          }}
        />
      )}

    </div>
  );
};

export default MyDownloads;
