import { ExamPaper, CachedPaper } from "@/types/exam-library";
import { Download, CheckCircle, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { t } from "@/lib/i18n";

interface PaperCardProps {
  paper: ExamPaper | CachedPaper;
  isDownloaded: boolean;
  onClick: () => void;
}

export function PaperCard({ paper, isDownloaded, onClick }: PaperCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card p-4 card-shadow active:translate-y-0.5 transition-transform cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
          isDownloaded ? 'bg-success/15' : 'bg-primary/15'
        }`}>
          {isDownloaded ? (
            <CheckCircle className="h-6 w-6 text-success" />
          ) : (
            <FileText className="h-6 w-6 text-primary" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-foreground text-sm line-clamp-2">
            {paper.title}
          </h3>
          <p className="text-xs font-semibold text-muted-foreground mt-1">
            {paper.subject} • {paper.classLevel}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-bold text-muted-foreground">
              {paper.year}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs font-bold text-muted-foreground">
              {paper.fileSizeFormatted}
            </span>
            {isDownloaded && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs font-bold text-success">
                  {t("downloaded")}
                </span>
              </>
            )}
          </div>
        </div>

        {!isDownloaded && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Download className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
