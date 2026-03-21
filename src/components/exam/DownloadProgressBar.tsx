import { DownloadProgress } from "@/types/exam-library";
import { X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { t } from "@/lib/i18n";

interface DownloadProgressBarProps {
  progress: DownloadProgress;
  onCancel: () => void;
}

export function DownloadProgressBar({ progress, onCancel }: DownloadProgressBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-primary/10 p-4 border-2 border-primary/30"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <span className="text-sm font-black text-primary">
            {t("downloading")} {Math.round(progress.progress)}%
          </span>
        </div>
        <button
          onClick={onCancel}
          className="flex h-6 w-6 items-center justify-center rounded-lg bg-danger/15 active:scale-95 transition-transform"
        >
          <X className="h-4 w-4 text-danger" />
        </button>
      </div>
      
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress.progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      
      <p className="text-xs font-semibold text-muted-foreground mt-2">
        {(progress.bytesDownloaded / 1024 / 1024).toFixed(2)} MB / {(progress.totalBytes / 1024 / 1024).toFixed(2)} MB
      </p>
    </motion.div>
  );
}
