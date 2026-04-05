import { motion, AnimatePresence } from "framer-motion";
import { Target, Zap, BookOpen, GraduationCap, User } from "lucide-react";
import { GradingSystem } from "@/types/exam";
import { CLASS_LEVELS, LYCEE_SERIES } from "@/lib/subjects-data";
import Mascot from "@/components/Mascot";

export type OnboardingStep = "system" | "profile" | "target";

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
  semester: string;
  onSemesterChange: (semester: string) => void;
  step: OnboardingStep;
  onStepChange: (step: OnboardingStep) => void;
}

const allLevels = [...CLASS_LEVELS.college, ...CLASS_LEVELS.lycee];
const isLycee = (level: string) => (CLASS_LEVELS.lycee as readonly string[]).includes(level);

const FixedNextButton = ({ onClick, disabled = false, label = "NEXT" }: { onClick: () => void; disabled?: boolean; label?: string }) => (
  <div className="fixed bottom-0 left-0 right-0 z-30 max-w-md mx-auto px-6 pb-10 pt-4 bg-background">
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl bg-secondary border-2 border-foreground py-4 text-base font-black text-foreground card-shadow active:translate-y-1 active:shadow-none transition-all disabled:opacity-40 disabled:pointer-events-none"
    >
      {label}
    </button>
  </div>
);

const OnboardingScreen = ({
  targetAverage, onTargetChange, onContinue,
  gradingSystem, onGradingSystemChange,
  studentName, onStudentNameChange,
  classLevel, onClassLevelChange,
  serie, onSerieChange,
  semester, onSemesterChange,
  step, onStepChange
}: OnboardingScreenProps) => {

  return (
    <AnimatePresence mode="wait">
      {step === "system" ? (
        <motion.div
          key="system"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="flex flex-col items-center gap-8 px-6 pt-28 pb-36"
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Mascot pose="thinking" size={110} animate />
          </motion.div>

          <div className="text-center">
            <h1 className="text-3xl font-black text-foreground">Welcome</h1>
            <p className="mt-2 text-muted-foreground font-semibold">
              Which grading system does your school use?
            </p>
          </div>

          <div className="w-full max-w-xs flex flex-col gap-3">
            <button
              onClick={() => onGradingSystemChange("apc")}
              className={`rounded-2xl p-5 text-left transition-all active:scale-[0.98] border-2 border-foreground card-shadow ${
                gradingSystem === "apc" ? "bg-secondary" : "bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-foreground bg-background">
                  <BookOpen className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="font-black text-foreground">APC System</p>
                  <p className="text-xs font-semibold text-muted-foreground">Togolese standard · Weighted competency</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => onGradingSystemChange("french")}
              className={`rounded-2xl p-5 text-left transition-all active:scale-[0.98] border-2 border-foreground card-shadow ${
                gradingSystem === "french" ? "bg-secondary" : "bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-foreground bg-background">
                  <Target className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="font-black text-foreground">French Traditional</p>
                  <p className="text-xs font-semibold text-muted-foreground">Comparative · Class ranking view</p>
                </div>
              </div>
            </button>
          </div>

          <FixedNextButton onClick={() => onStepChange("profile")} />
        </motion.div>
      ) : step === "profile" ? (
        <motion.div
          key="profile"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="flex flex-col items-center gap-8 px-6 pt-28 pb-36"
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Mascot pose="idle" size={110} animate />
          </motion.div>

          <div className="text-center">
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
                    className={`rounded-xl px-3 py-2.5 text-sm font-black transition-all active:scale-95 border-2 border-foreground ${
                      classLevel === level
                        ? "bg-secondary text-foreground card-shadow"
                        : "bg-card text-foreground"
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
                      className={`rounded-xl px-3 py-2.5 text-sm font-black transition-all active:scale-95 border-2 border-foreground ${
                        serie === s ? "bg-secondary text-foreground card-shadow" : "bg-card text-foreground"
                      }`}
                    >
                      Série {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <div>
              <label className="text-sm font-bold text-muted-foreground mb-1 block">Current semester</label>
              <div className="grid grid-cols-3 gap-2">
                {["1st Semester", "2nd Semester", "Annual"].map((s) => (
                  <button
                    key={s}
                    onClick={() => onSemesterChange(s)}
                    className={`rounded-xl px-3 py-2.5 text-xs font-black transition-all active:scale-95 border-2 border-foreground ${
                      semester === s ? "bg-secondary text-foreground card-shadow" : "bg-card text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <FixedNextButton
            onClick={() => onStepChange("target")}
            disabled={!studentName.trim() || !classLevel || (isLycee(classLevel) && !serie) || !semester}
          />
        </motion.div>
      ) : (
        <motion.div
          key="target"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="flex flex-col items-center gap-8 px-6 pt-28 pb-36"
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Mascot pose="pointing" size={110} animate />
          </motion.div>

          <div className="text-center">
            <h1 className="text-3xl font-black text-foreground">What's your target?</h1>
            <p className="mt-2 text-muted-foreground font-semibold">Set the yearly average you want to reach</p>
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-xs"
          >
            <div className="rounded-2xl bg-card p-8 border-2 border-border text-center">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Target range</p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-black text-primary">{(targetAverage ?? 16).toFixed(1)}</span>
                <span className="text-xl font-bold text-muted-foreground">– 20 / 20</span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground mt-1">Minimum target · Max stays at 20</p>
              <div className="mt-8">
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  value={targetAverage}
                  onChange={(e) => onTargetChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs font-bold text-muted-foreground mt-2 px-1">
                  <span>0</span>
                  <span>10</span>
                  <span>20</span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-card p-4 border-2 border-border">
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

          <FixedNextButton onClick={onContinue} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingScreen;
