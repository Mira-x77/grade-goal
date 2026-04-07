import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChecklistStep {
  key: string;
  label: string;
  description: string;
  done: boolean;
  href?: string;
  onClick?: () => void;
}

interface OnboardingChecklistProps {
  steps: ChecklistStep[];
}

export default function OnboardingChecklist({ steps }: OnboardingChecklistProps) {
  const doneCount = steps.filter(s => s.done).length;
  const allDone = doneCount === steps.length;
  const { t } = useLanguage();

  // Hide once everything is complete
  if (allDone) return null;

  const progress = (doneCount / steps.length) * 100;

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl bg-card border-2 border-foreground card-shadow overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="font-black text-foreground text-sm">{t("getStarted")}</p>
          <span className="text-xs font-black text-muted-foreground">{doneCount}/{steps.length}</span>
        </div>
        {/* Progress bar */}
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-secondary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="flex flex-col divide-y divide-border">
        {steps.map((step) => {
          const inner = (
            <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${step.done ? "opacity-50" : "active:bg-muted/40"}`}>
              {/* Check circle */}
              <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${step.done ? "bg-secondary border-secondary" : "border-border"}`}>
                <AnimatePresence>
                  {step.done && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Check className="h-3.5 w-3.5 text-foreground" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-black ${step.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{step.label}</p>
                {!step.done && <p className="text-xs font-semibold text-muted-foreground mt-0.5">{step.description}</p>}
              </div>
              {!step.done && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </div>
          );

          if (step.done) return <div key={step.key}>{inner}</div>;
          if (step.href) return <Link key={step.key} to={step.href}>{inner}</Link>;
          return <button key={step.key} onClick={step.onClick} className="w-full text-left">{inner}</button>;
        })}
      </div>
    </motion.div>
  );
}
