import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Zap } from "lucide-react";
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

const MOTIVATIONAL: Record<string, { en: string; fr: string }> = {
  "0": { en: "Let's get you set up — 5 quick steps.", fr: "Configurons tout — 5 étapes rapides." },
  "1": { en: "Good start! Keep going.", fr: "Bon début ! Continuez." },
  "2": { en: "Halfway there. You're doing great.", fr: "À mi-chemin. Vous vous en sortez bien." },
  "3": { en: "Almost ready. Just a couple more.", fr: "Presque prêt. Encore deux étapes." },
  "4": { en: "One last step — you're so close!", fr: "Une dernière étape — vous y êtes presque !" },
};

export default function OnboardingChecklist({ steps }: OnboardingChecklistProps) {
  const { language } = useLanguage();
  const fr = language === "fr";
  const doneCount = steps.filter(s => s.done).length;
  const allDone = doneCount === steps.length;

  if (allDone) return null;

  const progress = doneCount / steps.length;
  const pct = Math.round(progress * 100);
  const motivational = MOTIVATIONAL[String(doneCount)] ?? MOTIVATIONAL["0"];

  // First incomplete step index — gets the highlight treatment
  const nextIdx = steps.findIndex(s => !s.done);

  // SVG ring params
  const R = 20;
  const CIRC = 2 * Math.PI * R;
  const dash = CIRC * progress;

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 22 }}
      className="rounded-2xl overflow-hidden border-2 border-foreground card-shadow relative"
      style={{ background: "hsl(var(--card))" }}
    >
      {/* Top accent stripe — animated gradient */}
      <div className="h-1 w-full bg-gradient-to-r from-secondary via-secondary/50 to-transparent" />

      {/* Header */}
      <div className="flex items-center gap-4 px-4 pt-4 pb-3">
        {/* Progress ring */}
        <div className="relative shrink-0">
          <svg width="52" height="52" viewBox="0 0 52 52">
            {/* Track */}
            <circle cx="26" cy="26" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
            {/* Progress arc */}
            <motion.circle
              cx="26" cy="26" r={R}
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              initial={{ strokeDashoffset: CIRC }}
              animate={{ strokeDashoffset: CIRC - dash }}
              transition={{ type: "spring", stiffness: 80, damping: 18 }}
              transform="rotate(-90 26 26)"
            />
          </svg>
          {/* Count inside ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-black text-foreground">{doneCount}/{steps.length}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Zap className="h-3.5 w-3.5 text-secondary shrink-0" />
            <p className="text-sm font-black text-foreground">
              {fr ? "Démarrage rapide" : "Quick Setup"}
            </p>
          </div>
          <p className="text-xs font-semibold text-muted-foreground leading-snug">
            {fr ? motivational.fr : motivational.en}
          </p>
        </div>

        {/* Percentage badge */}
        <div className="shrink-0 flex items-center justify-center h-9 w-9 rounded-xl bg-secondary/15 border border-secondary/30">
          <span className="text-xs font-black text-secondary">{pct}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mx-4 mb-3 h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-secondary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />
      </div>

      {/* Steps */}
      <div className="flex flex-col divide-y divide-border/60 border-t border-border/60">
        {steps.map((step, i) => {
          const isNext = i === nextIdx;

          const inner = (
            <div
              className={`flex items-center gap-3 px-4 py-3 transition-colors relative ${
                step.done
                  ? "opacity-40"
                  : isNext
                  ? "bg-secondary/8 active:bg-secondary/15"
                  : "active:bg-muted/40"
              }`}
            >
              {/* Pulse ring on next step */}
              {isNext && (
                <motion.div
                  className="absolute left-3 h-7 w-7 rounded-full border-2 border-secondary"
                  animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}

              {/* Check circle */}
              <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all z-10 ${
                step.done
                  ? "bg-secondary border-secondary"
                  : isNext
                  ? "border-secondary bg-secondary/10"
                  : "border-border"
              }`}>
                <AnimatePresence>
                  {step.done && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Check className="h-3.5 w-3.5 text-foreground" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-black ${
                  step.done
                    ? "line-through text-muted-foreground"
                    : isNext
                    ? "text-foreground"
                    : "text-foreground/80"
                }`}>
                  {step.label}
                </p>
                {!step.done && (
                  <p className={`text-xs font-semibold mt-0.5 ${isNext ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
                    {step.description}
                  </p>
                )}
              </div>

              {!step.done && (
                <ChevronRight className={`h-4 w-4 shrink-0 ${isNext ? "text-secondary" : "text-muted-foreground/50"}`} />
              )}
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
