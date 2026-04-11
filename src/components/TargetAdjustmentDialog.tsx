import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Target, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface TargetAdjustmentDialogProps {
  open: boolean;
  currentTarget: number;
  maxPossible: number;
  onClose: () => void;
  onUpdateAndContinue: (newTarget: number) => void;
}

export const TargetAdjustmentDialog = ({
  open,
  currentTarget,
  maxPossible,
  onClose,
  onUpdateAndContinue,
}: TargetAdjustmentDialogProps) => {
  const { t } = useLanguage();
  
  // Suggest a realistic target (round down to nearest 0.5)
  const suggestedTarget = Math.floor(maxPossible * 2) / 2;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-full max-w-md rounded-3xl bg-card border-2 border-foreground card-shadow pointer-events-auto overflow-hidden"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full bg-muted/80 flex items-center justify-center active:scale-95 transition-transform"
              >
                <X className="h-4 w-4 text-foreground" />
              </button>

              {/* Header */}
              <div className="bg-danger/10 border-b-2 border-danger/20 px-6 pt-6 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-full bg-danger/20 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-danger" />
                  </div>
                  <h2 className="text-lg font-black text-danger">{t("targetOutOfReach")}</h2>
                </div>
                <p className="text-sm font-semibold text-danger/80 leading-relaxed">
                  {t("targetOutOfReachSimulatorDesc")
                    .replace("{max}", maxPossible.toFixed(1))
                    .replace("{target}", String(currentTarget))}
                </p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Current vs Suggested */}
                <div className="rounded-2xl bg-muted/30 border-2 border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                      {t("currentTarget")}
                    </span>
                    <span className="text-2xl font-black text-foreground">
                      {currentTarget}<span className="text-sm opacity-60">/20</span>
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-success" />
                      <span className="text-xs font-black text-success uppercase tracking-widest">
                        {t("suggestedTarget")}
                      </span>
                    </div>
                    <span className="text-2xl font-black text-success">
                      {suggestedTarget}<span className="text-sm opacity-60">/20</span>
                    </span>
                  </div>
                </div>

                {/* Explanation */}
                <div className="rounded-xl bg-secondary/10 border border-secondary/20 p-3">
                  <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                    {t("targetAdjustmentExplanation")}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => onUpdateAndContinue(suggestedTarget)}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary border-2 border-foreground py-3.5 font-black text-primary-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all"
                  >
                    <Target className="h-4 w-4" />
                    {t("updateAndContinue")}
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full rounded-2xl bg-muted border-2 border-border py-3 font-bold text-foreground active:scale-[0.98] transition-transform"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
