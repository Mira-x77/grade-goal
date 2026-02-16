import { motion } from "framer-motion";
import { Target, Zap } from "lucide-react";

interface OnboardingScreenProps {
  targetAverage: number;
  onTargetChange: (value: number) => void;
  onContinue: () => void;
}

const OnboardingScreen = ({ targetAverage, onTargetChange, onContinue }: OnboardingScreenProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
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
        <h1 className="text-3xl font-black text-foreground">
          What's your target?
        </h1>
        <p className="mt-2 text-muted-foreground font-semibold">
          Set the yearly average you want to reach
        </p>
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
              <p className="font-bold text-foreground">Grading system</p>
              <p className="text-muted-foreground">
                Interro ×1 · Dev ×1 · Compo ×2
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
  );
};

export default OnboardingScreen;
