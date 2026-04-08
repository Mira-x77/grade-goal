import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PremiumIntroSheetProps {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  subjectName?: string;
}

export function PremiumIntroSheet({ open, onClose, onContinue, subjectName }: PremiumIntroSheetProps) {
  const { t } = useLanguage();

  const features = [
    { icon: "🎯", title: t("topQuestions"), desc: t("topQuestionsDesc") },
    { icon: "🗺️", title: t("keyTopics"), desc: t("keyTopicsDesc") },
    { icon: "📋", title: t("cheatSheet"), desc: t("cheatSheetDesc") },
    { icon: "✅", title: t("stepBySolutions"), desc: t("stepByStepSolutions") },
    { icon: "📝", title: t("practiceTests"), desc: t("practiceTestsDesc") },
    { icon: "🔍", title: t("weakSpots"), desc: t("weakSpotsDesc") },
  ];

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
            className="fixed bottom-0 left-0 right-0 z-[65] bg-background rounded-t-3xl border-t-2 border-x-2 border-foreground overflow-hidden"
            style={{ maxHeight: "95vh" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-2 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-premium" />
                <div>
                  <h2 className="text-lg font-black text-foreground">{t("passSmarter")}</h2>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {subjectName ? `${t("prepToolsFor")} ${subjectName}` : t("prepToolsEvery")}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="text-muted-foreground active:scale-95 transition-transform">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto px-5 pb-32" style={{ maxHeight: "calc(95vh - 80px)" }}>
              <div className="grid grid-cols-2 gap-3 mt-4 mb-6">
                {features.map(({ icon, title, desc }) => (
                  <div key={title} className="rounded-2xl bg-card border-2 border-border p-4 flex flex-col gap-2">
                    <span className="text-2xl">{icon}</span>
                    <p className="font-black text-sm text-foreground">{title}</p>
                    <p className="text-[10px] font-semibold text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sticky CTA */}
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-background border-t-2 border-border">
              <button
                onClick={onContinue}
                className="w-full rounded-2xl bg-secondary border-2 border-foreground py-4 font-black text-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2"
              >
                {t("seePlans")}
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
