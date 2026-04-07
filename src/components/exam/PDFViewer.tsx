import { useState, useEffect } from 'react';
import { X, Download, AlertCircle, Smartphone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  onClose?: () => void;
  onDownload?: () => void;
}

export function PDFViewer({ fileUrl, fileName, onClose, onDownload }: PDFViewerProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Prevent default download behavior
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError('Failed to load PDF. Please try downloading instead.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
        <div className="flex-1 min-w-0 mr-4">
          <h3 className="font-bold text-sm truncate">{fileName}</h3>
          <p className="text-xs text-muted-foreground">
            {t("previewMode")}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Download Button */}
          {onDownload && (
            <button
              onClick={onDownload}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          )}

          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-hidden bg-muted/30 relative">
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/95 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground font-medium">{t("loadingPDF")}</p>
              <p className="text-xs text-muted-foreground mt-2">{t("loadingMoment")}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10 p-6">
            <div className="text-center max-w-md">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-sm text-foreground font-semibold mb-2">{error}</p>
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 transition-opacity"
                >
                  {t("downloadPDFInstead")}
                </button>
              )}
            </div>
          </div>
        )}
        
        {!error && (
          <object
            data={fileUrl}
            type="application/pdf"
            className="w-full h-full"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          >
            <iframe
              src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-full border-0"
              title={fileName}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{
                backgroundColor: '#525659'
              }}
            />
          </object>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-t border-primary/20 px-4 py-3 text-center flex-shrink-0">
        <p className="text-xs font-bold text-primary flex items-center justify-center gap-1.5">
          <Smartphone className="h-3.5 w-3.5" /> Viewing in preview mode • Tap "Download" to save to your device for offline access
        </p>
      </div>
    </div>
  );
}
