import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Zap, BookOpen, GraduationCap, User } from "lucide-react";
import { GradingSystem } from "@/types/exam";
import { CLASS_LEVELS, LYCEE_SERIES } from "@/lib/subjects-data";

interface OnboardingScreenProps {
  targetAverage: number;
  onTargetChange: (value: number) => void;
  onContinue: () => void;
  gradingSystem: GradingSystem;
  onGradingSystemChange: (system: GradingSystem) => void;
  studentName: string;
  onStudentNameChange: (name: string) => void;
  classLevel: string;
  onClassLevelChange: (level: string) => void;
  serie: string;
  onSerieChange: (serie: string) => void;
}

type Step = "system" | "profile" | "target";

const allLevels = [...CLASS_LEVELS.college, ...CLASS_LEVELS.lycee];
const isLycee = (level: string) => (CLASS_LEVELS.lycee as readonly string[]).includes(level);

const OnboardingScreen = ({
  targetAverage, onTargetChange, onContinue,
  gradingSystem, onGradingSystemChange,
  studentName, onStudentNameChange,
  classLevel, onClassLevelChange,
  serie, onSerieChange,
}: OnboardingScreenProps) => {
  const [step, setStep] = useState<Step>("system");

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
              onClick={() => { onGradingSystemChange("apc"); setStep("profile"); }}
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
            </button>

            <button
              onClick={() => { onGradingSystemChange("french"); setStep("profile"); }}
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
            </button>
          </div>
        </motion.div>
      ) : step === "profile" ? (
        <motion.div
          key="profile"
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
            <User className="h-12 w-12 text-primary-foreground" />
          </motion.div>

          <div className="text-center">
            <button onClick={() => setStep("system")} className="text-sm font-bold text-muted-foreground mb-2">
              ← Change system
            </button>
            <h1 className="text-3xl font-black text-foreground">About you</h1>
            <p className="mt-2 text-muted-foreground font-semibold">Tell us your name and class</p>
          </div>

          <div className="w-full max-w-xs flex flex-col gap-4">
            <div>
              <label className="text-sm font-bold text-muted-foreground mb-1 block">Your name</label>
              <input
                type="text"
                placeholder="e.g. Kofi, Ama..."
                value={studentName}
                onChange={(e) => onStudentNameChange(e.target.value)}
                className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-muted-foreground mb-1 block">Your class</label>
              <div className="grid grid-cols-2 gap-2">
                {allLevels.map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      onClassLevelChange(level);
                      if (!isLycee(level)) onSerieChange("");
                    }}
                    className={`rounded-xl px-3 py-2.5 text-sm font-bold transition-all active:scale-95 ${
                      classLevel === level
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border-2 border-border text-foreground"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {isLycee(classLevel) && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <label className="text-sm font-bold text-muted-foreground mb-1 block">Your série</label>
                <div className="grid grid-cols-3 gap-2">
                  {LYCEE_SERIES.map((s) => (
                    <button
                      key={s}
                      onClick={() => onSerieChange(s)}
                      className={`rounded-xl px-3 py-2.5 text-sm font-bold transition-all active:scale-95 ${
                        serie === s
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-card border-2 border-border text-foreground"
                      }`}
                    >
                      Série {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {studentName.trim() && classLevel && (!isLycee(classLevel) || serie) && (
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                onClick={() => setStep("target")}
                className="w-full rounded-2xl bg-primary py-4 text-lg font-extrabold text-primary-foreground card-shadow-primary active:translate-y-1 active:shadow-none transition-all"
              >
                NEXT →
              </motion.button>
            )}
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
            <button onClick={() => setStep("profile")} className="text-sm font-bold text-muted-foreground mb-2">
              ← Back
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
                    {classLevel}{serie ? ` · Série ${serie}` : ""}
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
