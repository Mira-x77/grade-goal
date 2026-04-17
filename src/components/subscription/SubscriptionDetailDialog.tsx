import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, BookOpen, Layers, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { subscriptionService } from '@/services/subscriptionService';
import { useLanguage } from '@/contexts/LanguageContext';
interface SubscriptionDetailDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectPack: () => void;
  onSelectAll: () => void;
  subjectName?: string;
}

export function SubscriptionDetailDialog({ open, onClose, onSelectPack, onSelectAll, subjectName }: SubscriptionDetailDialogProps) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<{
    tier: string;
    hasPremiumAccess: boolean;
    unlockedSubjects: string[];
    ownedPacks?: string[];
  } | null>(null);

  useEffect(() => {
    if (open) loadStatus();
  }, [open]);

  const loadStatus = async () => {
    try {
      const statusData = await subscriptionService.getStatus();
      setStatus({
        ...statusData,
        ownedPacks: statusData.unlockedSubjects.includes('all') ? ['all'] : statusData.unlockedSubjects
      });
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    }
  };

  const currentSubject = subjectName || "This Subject";

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60"
          />

          {/* Modal — full-screen flex container handles centering */}
          <div className="fixed inset-0 z-[61] flex items-center justify-center pointer-events-none px-4">
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="w-full max-w-sm pointer-events-auto"
            >
            <div className="rounded-2xl bg-card border-2 border-border overflow-hidden card-shadow">

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
                <p className="text-sm font-black text-foreground">{t("choosePlanTitle")}</p>
                <button
                  onClick={onClose}
                  className="text-muted-foreground active:scale-90 transition-transform"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Already owned state */}
              {status?.ownedPacks?.includes(currentSubject) ? (
                <div className="px-5 py-8 flex flex-col items-center gap-4 text-center">
                  <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="font-black text-foreground">{t("youAlreadyOwn")}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t("fullAccessTo").replace("{subject}", currentSubject)}</p>
                  </div>
                  <Button onClick={onClose} className="w-full font-bold">{t("close")}</Button>
                </div>
              ) : (
                <div className="px-4 py-4 flex flex-col gap-3">
                  {/* Subject Pack */}
                  <button
                    onClick={onSelectPack}
                    className="w-full rounded-2xl bg-card border-2 border-foreground p-4 text-left card-shadow active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-3"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/15 border-2 border-foreground/10 shrink-0">
                      <BookOpen className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-foreground text-sm">{currentSubject} Pack</p>
                      <p className="text-[10px] font-semibold text-muted-foreground mt-0.5 leading-snug">
                        {t("packLifetime")}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>

                  {/* All Subjects Pass */}
                  <button
                    onClick={onSelectAll}
                    className="w-full rounded-2xl bg-premium border-2 border-premium p-4 text-left card-shadow active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-3"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 border-2 border-white/20 shrink-0">
                      <Layers className="h-5 w-5 text-premium-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-premium-foreground text-sm">{t("allSubjectsPass")}</p>
                      <p className="text-[10px] font-semibold text-premium-foreground/70 mt-0.5 leading-snug">
                        {t("passOneMonth")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[10px] font-black text-premium-foreground bg-white/15 px-2 py-0.5 rounded-full border border-white/20 whitespace-nowrap">
                        {t("bestValue")}
                      </span>
                      <ChevronRight className="h-4 w-4 text-premium-foreground/60" />
                    </div>
                  </button>
                </div>
              )}
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  , document.body);
}
