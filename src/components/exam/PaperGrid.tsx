import { ExamPaper, CachedPaper } from "@/types/exam-library";
import { PaperCard } from "./PaperCard";
import { Loader2, FileX } from "lucide-react";

interface PaperGridProps {
  papers: (ExamPaper | CachedPaper)[];
  onPaperClick: (paperId: string) => void;
  loading?: boolean;
  downloadedPaperIds?: Set<string>;
}

export function PaperGrid({ papers, onPaperClick, loading, downloadedPaperIds = new Set() }: PaperGridProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground mt-3">
          Loading papers...
        </p>
      </div>
    );
  }

  if (papers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <FileX className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-black text-foreground mt-4">No papers found</h3>
        <p className="text-sm font-semibold text-muted-foreground text-center mt-2">
          No papers found in the database. Papers will appear here once they are uploaded via the Admin Portal.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {papers.map((paper) => (
        <PaperCard
          key={paper.id}
          paper={paper}
          isDownloaded={downloadedPaperIds.has(paper.id)}
          onClick={() => onPaperClick(paper.id)}
        />
      ))}
    </div>
  );
}
