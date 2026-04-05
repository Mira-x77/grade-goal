import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PremiumIntroSheetProps {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  subjectName?: string;
}

const FEATURES = [
  { icon: "🎯", titleKey: "topQuestions" as const, descKey: "topQuestionsDesc" as const },
  { icon: "🗺️", titleKey: "keyTopics" as const, descKey: "keyTopicsDesc" as const },
  { icon: "📋", titleKey: "cheatSheet" as const, descKey: "cheatSheetDesc" as const },
  { icon: "✅", titleKey: "solutions" as const, descKey: "solutionsDesc" as const },
  { icon: "📊", titleKey: "scorePredictor" as const, descKey: "scorePredictorDesc" as const },
  { icon: "🔍", titleKey: "weakSpots" as const, descKey: "weakSpotsDesc" as const },
];

export function PremiumIntroSheet({ open, onClose, onContinue, subjectName }: PremiumIntroSheetProps) {
  const { t } = useLanguage();

  const features = [
    { icon: "🎯", title: "Top Questions", desc: "The 30 most repeated questions across all past papers for your subject and class" },
    { icon: "🗺️", title: "Key Topics", desc: "Topics ranked by exam frequency so you know exactly what to focus on" },
    { icon: "📋", title: "Cheat Sheet", desc: "One-page summary of formulas, definitions and rules that appear most in exams" },
    { icon: "✅", title: "Solutions", desc: "Step-by-step worked solutions to past questions with pattern explanations" },
    { icon: "📊", title: "Score Predictor", desc: "Predicts your likely final score range based on your marks and exam patterns" },
    { icon: "🔍", title: "Weak Spots", desc: "Identifies your weakest areas by comparing your marks to what exams test most" },
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
            className="fixed bottom-0 left-0 right-0 z-[65] max-w-md mx-auto bg-background rounded-t-3xl border-t-2 border-x-2 border-foreground overflow-hidden"
            style={{ maxHeight: "95vh" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-2 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-secondary" />
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
