import { BookOpen, Download, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { LibraryBook, UnifiedDownloadProgress, DownloadStatus } from '@/types/exam-library';

interface BookCardProps {
  book: LibraryBook;
  isOpening: boolean;
  onClick: () => void;
  downloadStatus?: DownloadStatus;
  downloadProgress?: UnifiedDownloadProgress;
  onDownload?: () => void;
  onCancelDownload?: () => void;
}

export function BookCard({ 
  book, 
  isOpening, 
  onClick, 
  downloadStatus, 
  downloadProgress, 
  onDownload, 
  onCancelDownload, 
}: BookCardProps) {
  const isDownloaded = downloadStatus?.isDownloaded || false;
  const isDownloading = downloadStatus?.isDownloading || false;
  const progress = downloadProgress?.progress || 0;

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading && onCancelDownload) {
      onCancelDownload();
    } else if (!isDownloaded && onDownload) {
      onDownload();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card card-shadow overflow-hidden"
    >
      {/* Large PDF Cover - same as papers */}
      <div 
        className="relative h-48 bg-muted/50 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
        onClick={onClick}
      >
        {book.cover_url ? (
          <img src={book.cover_url} alt={`Preview of ${book.title}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
        
        {/* Download status indicator */}
        {isDownloaded && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-1 bg-secondary border border-foreground/30 text-foreground rounded text-[8px] font-black">
              Downloaded
            </span>
          </div>
        )}
        
        {isOpening && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      
      {/* Book Info */}
      <div className="p-3">
        <h3 className="font-black text-foreground text-sm line-clamp-2 mb-1">
          {book.title}
        </h3>
        {book.author && (
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            {book.author}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="text-[10px] font-black bg-secondary/15 text-secondary-foreground px-2 py-0.5 rounded-full">
            {book.category}
          </span>
          {book.subject && (
            <>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs font-bold text-muted-foreground">{book.subject}</span>
            </>
          )}
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs font-bold text-muted-foreground">{book.file_size_formatted}</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleDownloadClick}
            disabled={isDownloaded}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition-all active:scale-95 ${
              isDownloaded
                ? 'bg-muted border border-border text-muted-foreground cursor-default'
                : isDownloading
                ? 'bg-primary border border-foreground text-primary-foreground'
                : 'bg-primary border border-foreground text-primary-foreground'
            }`}
          >
            {isDownloaded ? (
              <>
                <Check className="h-3 w-3" />
                Downloaded
              </>
            ) : isDownloading ? (
              <>
                <div className="relative h-3 w-3">
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 12 12">
                    <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth="1.5" />
                    <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 5}`}
                      strokeDashoffset={`${2 * Math.PI * 5 * (1 - progress / 100)}`}
                      className="transition-all duration-300"
                    />
                  </svg>
                </div>
                {Math.round(progress)}%
              </>
            ) : (
              <>
                <Download className="h-3 w-3" />
                Download
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
