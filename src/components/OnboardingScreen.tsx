import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Zap, BookOpen, GraduationCap } from "lucide-react";
import { GradingSystem } from "@/types/exam";

interface OnboardingScreenProps {
  targetAverage: number;
  onTargetChange: (value: number) => void;
  onContinue: () => void;
  gradingSystem: GradingSystem;
  onGradingSystemChange: (system: GradingSystem) => void;
}

const OnboardingScreen = ({ targetAverage, onTargetChange, onContinue, gradingSystem, onGradingSystemChange }: OnboardingScreenProps) => {
  const [step, setStep] = useState<"system" | "target">("system");

  return (
    <AnimatePresence mode="wait">
      {step === "system" ? (
        <motion.div
          key="system"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="flex flex-col items-center gap-8 px-6 py-10"
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary"
          >
            <GraduationCap className="h-12 w-12 text-secondary-foreground" />
          </motion.div>

          <div className="text-center">
            <h1 className="text-3xl font-black text-foreground">Welcome! 👋</h1>
            <p className="mt-2 text-muted-foreground font-semibold">
              Which grading system does your school use?
            </p>
          </div>

          <div className="w-full max-w-xs flex flex-col gap-3">
            <button
              onClick={() => { onGradingSystemChange("apc"); setStep("target"); }}
              className={`rounded-2xl p-5 text-left card-shadow transition-all active:scale-[0.98] ${
                gradingSystem === "apc" ? "bg-primary/10 border-2 border-primary" : "bg-card border-2 border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-black text-foreground">APC System</p>
                  <p className="text-xs font-semibold text-muted-foreground">Togolese standard · Weighted competency</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground font-semibold">
                Average = (Interro + Devoir + Compo) / 3 with coefficients
              </p>
            </button>

            <button
              onClick={() => { onGradingSystemChange("french"); setStep("target"); }}
              className={`rounded-2xl p-5 text-left card-shadow transition-all active:scale-[0.98] ${
                gradingSystem === "french" ? "bg-secondary/10 border-2 border-secondary" : "bg-card border-2 border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/20">
                  <Target className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="font-black text-foreground">French Traditional</p>
                  <p className="text-xs font-semibold text-muted-foreground">Comparative · Class ranking view</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground font-semibold">
                Delta from class average · Percentile positioning
              </p>
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="target"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="flex flex-col items-center gap-8 px-6 py-10"
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-primary"
          >
            <Target className="h-12 w-12 text-primary-foreground" />
          </motion.div>

          <div className="text-center">
            <button onClick={() => setStep("system")} className="text-sm font-bold text-muted-foreground mb-2">
              ← Change system
            </button>
            <h1 className="text-3xl font-black text-foreground">What's your target?</h1>
            <p className="mt-2 text-muted-foreground font-semibold">Set the yearly average you want to reach</p>
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-xs"
          >
            <div className="rounded-2xl bg-card p-8 card-shadow text-center">
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => onTargetChange(Math.max(0, targetAverage - 0.5))}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl font-bold text-foreground active:scale-95 transition-transform"
                >
                  −
                </button>
                <div className="mx-4">
                  <span className="text-5xl font-black text-primary">{targetAverage}</span>
                  <span className="text-2xl font-bold text-muted-foreground">/20</span>
                </div>
                <button
                  onClick={() => onTargetChange(Math.min(20, targetAverage + 0.5))}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl font-bold text-foreground active:scale-95 transition-transform"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-card p-4 card-shadow">
              <div className="flex items-center gap-3 text-sm">
                <Zap className="h-5 w-5 text-accent" />
                <div>
                  <p className="font-bold text-foreground">
                    {gradingSystem === "apc" ? "APC System" : "French Traditional"}
                  </p>
                  <p className="text-muted-foreground">
                    {gradingSystem === "apc" ? "Interro ×1 · Dev ×1 · Compo ×2" : "Comparative · Class ranking"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            onClick={onContinue}
            className="w-full max-w-xs rounded-2xl bg-primary py-4 text-lg font-extrabold text-primary-foreground card-shadow-primary active:translate-y-1 active:shadow-none transition-all"
          >
            LET'S GO 🚀
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingScreen;
