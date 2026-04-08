import { X, Crown, ChevronRight, BookOpen, Layers } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { useLanguage } from "@/contexts/LanguageContext";

interface PlanSelectSheetProps {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  subjectName?: string;
  onSelectPack: () => void;
  onSelectAll: () => void;
}

export function PlanSelectSheet({ open, onClose, onBack, subjectName, onSelectPack, onSelectAll }: PlanSelectSheetProps) {
  const { t } = useLanguage();

  return (
    <Sheet open={open} onBackdropClick={onClose} zIndex={65}>
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1 shrink-0 md:hidden">
        <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="text-muted-foreground active:scale-95 transition-transform">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-premium" />
            <h2 className="text-lg font-black text-foreground">{t("choosePlan")}</h2>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground active:scale-95 transition-transform">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Options */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3 pb-8 min-h-0">
        {/* Subject Pack */}
        <button
          onClick={onSelectPack}
          className="w-full rounded-2xl bg-card border-2 border-foreground p-4 text-left card-shadow active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-4"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/15 border-2 border-foreground/10 shrink-0">
            <BookOpen className="h-6 w-6 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-foreground text-sm">
              {subjectName ? `${subjectName} Pack` : t("subjectPack")}
            </p>
            <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
              {subjectName
                ? `Unlock all 6 study tools for ${subjectName} · 500 FCFA`
                : t("subjectPackDesc")}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>

        {/* All Subjects Pass */}
        <button
          onClick={onSelectAll}
          className="w-full rounded-2xl bg-secondary border-2 border-foreground p-4 text-left card-shadow active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-4 relative overflow-hidden"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/10 border-2 border-foreground/20 shrink-0">
            <Layers className="h-6 w-6 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-foreground text-sm">{t("allSubjectsPass")}</p>
            <p className="text-[10px] font-semibold text-foreground/70 mt-0.5">
              {t("allSubjectsPassDesc")} · <span className="font-black">1 500 FCFA</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-[10px] font-black text-foreground bg-foreground/20 px-2 py-0.5 rounded-full whitespace-nowrap">{t("bestValue")}</span>
            <ChevronRight className="h-4 w-4 text-foreground/60" />
          </div>
        </button>
      </div>
    </Sheet>
  );
}
