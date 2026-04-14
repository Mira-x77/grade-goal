import { motion, AnimatePresence } from "framer-motion";
import { Archive, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  language?: string;
}

export default function ArchiveWarningModal({ open, onConfirm, onCancel, language = "en" }: Props) {
  const fr = language === "fr";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60"
            onClick={onCancel}
          />
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[201] bg-card rounded-3xl p-6 card-shadow max-w-sm mx-auto"
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/15 border-2 border-warning/30">
                <Archive className="h-7 w-7 text-warning" />
              </div>

              <div>
                <h2 className="text-lg font-black text-foreground">
                  {fr ? "Archiver le semestre ?" : "Archive this semester?"}
                </h2>
                <p className="text-sm font-semibold text-muted-foreground mt-2 leading-relaxed">
                  {fr
                    ? "Votre semestre actuel sera archivé et ne pourra plus être modifié. Vous pourrez le consulter comme un bulletin de fin de semestre en lecture seule."
                    : "Your current semester will be archived and can no longer be edited. You can still view it as a read-only end-of-semester result."}
                </p>
              </div>

              <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-xl px-3 py-2 w-full">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                <p className="text-xs font-bold text-warning">
                  {fr ? "Cette action est irréversible." : "This action cannot be undone."}
                </p>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={onCancel}
                  className="flex-1 rounded-2xl border-2 border-border bg-muted py-3 text-sm font-black text-foreground active:scale-[0.98] transition-transform"
                >
                  {fr ? "Annuler" : "Cancel"}
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 rounded-2xl border-2 border-warning bg-warning/15 py-3 text-sm font-black text-warning active:scale-[0.98] transition-transform"
                >
                  {fr ? "Archiver" : "Archive"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
