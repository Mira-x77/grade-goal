import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ChevronRight, Zap } from "lucide-react";

interface SubjectPackSheetProps {
  open: boolean;
  onClose: () => void;
  subjects: string[];
  onConfirm: (selected: string[]) => void;
}

const PRICE_PER_SUBJECT = 500;
const ALL_SUBJECTS_PRICE = 1500;

export function SubjectPackSheet({ open, onClose, subjects, onConfirm }: SubjectPackSheetProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (s: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const count = selected.size;
  const total = count * PRICE_PER_SUBJECT;
  const switchToAll = total >= ALL_SUBJECTS_PRICE && count < subjects.length;

  const handleClose = () => {
    setSelected(new Set());
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-[70] max-w-md mx-auto bg-background rounded-t-3xl border-t-2 border-x-2 border-foreground overflow-hidden"
            style={{ maxHeight: "85vh" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-border">
              <div>
                <h2 className="text-lg font-black text-foreground">Select subjects</h2>
                <p className="text-xs font-semibold text-muted-foreground">500 FCFA per subject · 3 months</p>
              </div>
              <button onClick={handleClose} className="text-muted-foreground active:scale-95 transition-transform">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Subject list */}
            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-2" style={{ maxHeight: "calc(85vh - 180px)" }}>
              {subjects.map((sub) => {
                const isSelected = selected.has(sub);
                return (
                  <button
                    key={sub}
                    onClick={() => toggle(sub)}
                    className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 border-2 transition-all active:scale-[0.98] ${
                      isSelected
                        ? "bg-secondary border-foreground card-shadow"
                        : "bg-card border-border"
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
            <div className="px-5 pb-8 pt-3 border-t border-border bg-background">
              {/* Switch to all nudge */}
              <AnimatePresence>
                {switchToAll && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-3"
                  >
                    <button
                      onClick={() => onConfirm(subjects)}
                      className="w-full rounded-xl bg-primary/10 border-2 border-primary/30 px-4 py-2.5 flex items-center gap-2 active:scale-[0.98] transition-transform"
                    >
                      <Zap className="h-4 w-4 text-primary shrink-0" />
                      <div className="text-left flex-1">
                        <p className="text-xs font-black text-primary">Switch to All Subjects Pass</p>
                        <p className="text-[10px] font-semibold text-primary/70">Same price — get every subject instead</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={() => count > 0 && onConfirm(Array.from(selected))}
                disabled={count === 0}
                className="w-full rounded-2xl bg-secondary border-2 border-foreground py-4 font-black text-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-between px-5"
              >
                <span>{count === 0 ? "Select subjects" : `${count} subject${count > 1 ? "s" : ""} selected`}</span>
                <span className="font-black">{count > 0 ? `${total.toLocaleString()} FCFA →` : ""}</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
