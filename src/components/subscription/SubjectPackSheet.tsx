import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ChevronRight, Zap } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { useLanguage } from "@/contexts/LanguageContext";

interface SubjectPackSheetProps {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  subjects: string[];
  onConfirm: (selected: string[], amount: number) => void;
}

const PRICE_PER_SUBJECT = 500;
const ALL_SUBJECTS_PRICE = 1500;

export function SubjectPackSheet({ open, onClose, onBack, subjects, onConfirm }: SubjectPackSheetProps) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (s: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const count      = selected.size;
  const total      = count * PRICE_PER_SUBJECT;
  const switchToAll = total >= ALL_SUBJECTS_PRICE;

  const handleClose = () => { setSelected(new Set()); onClose(); };
  const handleBack  = () => { setSelected(new Set()); onBack?.(); };

  return (
    <Sheet open={open} onBackdropClick={handleClose} zIndex={70}>
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1 shrink-0 md:hidden">
        <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={handleBack} className="text-muted-foreground active:scale-95 transition-transform">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          <div>
            <h2 className="text-lg font-black text-foreground">{t("selectSubjects")}</h2>
            <p className="text-xs font-semibold text-muted-foreground">{t("pricePerSubject")}</p>
          </div>
        </div>
        <button onClick={handleClose} className="text-muted-foreground active:scale-95 transition-transform">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Subject list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2 min-h-0">
        {subjects.map((sub) => {
          const isSelected = selected.has(sub);
          return (
            <button
              key={sub}
              onClick={() => toggle(sub)}
              className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 border-2 transition-all active:scale-[0.98] ${
                isSelected ? "bg-secondary border-foreground card-shadow" : "bg-card border-border"
              }`}
            >
              <span className="font-black text-sm text-foreground">{sub}</span>
              <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                isSelected ? "bg-foreground border-foreground" : "border-muted-foreground/40"
              }`}>
                {isSelected && <Check className="h-3.5 w-3.5 text-background" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Sticky footer */}
      <div className="px-5 pb-8 pt-3 border-t border-border bg-background shrink-0">
        <AnimatePresence mode="wait">
          {switchToAll ? (
            <motion.button
              key="switch-all"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              onClick={() => onConfirm(subjects, ALL_SUBJECTS_PRICE)}
              className="w-full rounded-2xl bg-primary border-2 border-foreground py-4 font-black text-primary-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-between px-5"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-black">{t("switchToAllPass")}</p>
                  <p className="text-[10px] font-semibold opacity-80">{t("switchToAllDesc")}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0" />
            </motion.button>
          ) : (
            <motion.button
              key="continue"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              onClick={() => count > 0 && onConfirm(Array.from(selected), total)}
              disabled={count === 0}
              className="w-full rounded-2xl bg-secondary border-2 border-foreground py-4 font-black text-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-between px-5"
            >
              <span>
                {count === 0
                  ? t("selectSubjectsPrompt")
                  : `${count} ${count > 1 ? t("subjectsSelectedPlural") : t("subjectsSelected")}`}
              </span>
              <span className="font-black">{count > 0 ? `${total.toLocaleString()} FCFA →` : ""}</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </Sheet>
  );
}
