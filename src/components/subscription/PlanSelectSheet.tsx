import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, ChevronRight, BookOpen, Layers } from "lucide-react";

interface PlanSelectSheetProps {
  open: boolean;
  onClose: () => void;
  subjectName?: string;
  onSelectPack: () => void;   // subject pack(s) — opens subject picker
  onSelectAll: () => void;    // all subjects pass
}

export function PlanSelectSheet({ open, onClose, subjectName, onSelectPack, onSelectAll }: PlanSelectSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[65] bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-[65] max-w-md mx-auto bg-background rounded-t-3xl border-t-2 border-x-2 border-foreground overflow-hidden"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-secondary" />
                <h2 className="text-lg font-black text-foreground">Choose a plan</h2>
              </div>
              <button onClick={onClose} className="text-muted-foreground active:scale-95 transition-transform">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Options */}
            <div className="p-5 flex flex-col gap-3 pb-8">
              {/* Subject Pack */}
              <button
                onClick={onSelectPack}
                className="w-full rounded-2xl bg-card border-2 border-foreground p-4 text-left card-shadow active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/15 border-2 border-foreground/10 shrink-0">
                  <BookOpen className="h-6 w-6 text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-foreground text-sm">Subject Pack</p>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                    Pick one or more subjects · 500 FCFA each
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
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-black text-foreground text-sm">All Subjects Pass</p>
                    <span className="text-[10px] font-black text-foreground bg-foreground/15 px-1.5 py-0.5 rounded-full">Best value</span>
                  </div>
                  <p className="text-[10px] font-semibold text-foreground/70">
                    Every subject in your class · 3 months · <span className="font-black">1,500 FCFA</span>
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-foreground/60 shrink-0" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
