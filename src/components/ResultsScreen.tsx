import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, XCircle, Pencil, ChevronRight } from "lucide-react";
import { Subject, FeedbackStatus } from "@/types/exam";
import {
  calcYearlyAverage,
  getAbsoluteBounds,
  calcMinimumMarkNeeded,
} from "@/lib/exam-logic";

interface ResultsScreenProps {
  subjects: Subject[];
  targetAverage: number;
  onBack: () => void;
  onEditMarks: () => void;
}

const statusConfig: Record<FeedbackStatus, { bg: string; icon: React.ReactNode; text: string }> = {
  possible: {
    bg: "bg-success",
    icon: <TrendingUp className="h-8 w-8" />,
    text: "On track!",
  },
  risky: {
    bg: "bg-warning",
    icon: <AlertTriangle className="h-8 w-8" />,
    text: "Tight, but doable",
  },
  impossible: {
    bg: "bg-danger",
    icon: <XCircle className="h-8 w-8" />,
    text: "Target may need adjusting",
  },
};

const markLabels: Record<string, string> = { interro: "Interro", dev: "Devoir", compo: "Compo" };

const ResultsScreen = ({ subjects, targetAverage, onBack, onEditMarks }: ResultsScreenProps) => {
  const currentAvg = calcYearlyAverage(subjects);
  const bounds = getAbsoluteBounds(subjects);

  const overallStatus: FeedbackStatus = currentAvg !== null && currentAvg >= targetAverage ? "possible"
    : currentAvg !== null && currentAvg >= targetAverage - 2 ? "risky"
    : "impossible";

  const config = statusConfig[overallStatus];
  const progressPercent = currentAvg !== null ? Math.min(100, (currentAvg / targetAverage) * 100) : 0;

  // Is the target range still reachable?
  const targetUnreachable = bounds !== null && bounds.max < targetAverage;

  // What's next — subjects with missing marks, sorted by coefficient desc
  const missingItems = subjects
    .flatMap((sub) =>
      (["interro", "dev", "compo"] as const)
        .filter((mt) => sub.marks[mt] === null)
        .map((mt) => {
          const needed = calcMinimumMarkNeeded(subjects, sub.id, mt, targetAverage);
          return { sub, mt, needed };
        })
    )
    .sort((a, b) => b.sub.coefficient - a.sub.coefficient);

  return (
    <div className="flex flex-col" style={{ minHeight: "60vh" }}>
      <div className="flex flex-col gap-5 px-6 pt-4 pb-24">

        {/* Status hero */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className={`${config.bg} rounded-2xl p-6 text-primary-foreground`}
        >
          <div className="flex items-center gap-3 mb-4">
            {config.icon}
            <h2 className="text-xl font-black">{config.text}</h2>
          </div>
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-xs font-bold opacity-70 uppercase tracking-wider">Current average</p>
              <div className="text-5xl font-black">
                {currentAvg !== null ? currentAvg.toFixed(1) : "—"}
                <span className="text-xl font-bold opacity-70">/20</span>
              </div>
            </div>
            <p className="text-sm font-bold opacity-70">Target: {targetAverage}–20</p>
          </div>
          <div className="rounded-full bg-white/20 h-2.5 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-white/80"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ delay: 0.3, type: "spring", stiffness: 60 }}
            />
          </div>
        </motion.div>

        {/* Edit Marks button */}
        <motion.button
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          onClick={onEditMarks}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-card border-2 border-foreground py-3 font-black text-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all"
        >
          <Pencil className="h-4 w-4" />
          Edit Marks
        </motion.button>

        {/* Best possible card */}
        {bounds && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl bg-card p-5 border-2 border-border"
          >
            <h3 className="font-black text-foreground text-sm mb-3">Best possible final</h3>
            <div className="rounded-xl bg-success/10 border border-success/20 p-3 text-center">
              <p className="text-3xl font-black text-success">{bounds.max}<span className="text-base opacity-60">/20</span></p>
              <p className="text-[10px] font-semibold text-success/70 mt-1">If you score 20/20 on every remaining test</p>
            </div>
          </motion.div>
        )}

        {/* Reality Check — when target is unreachable */}
        {targetUnreachable && bounds && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl bg-danger/10 border-2 border-danger/30 p-5"
          >
            <h3 className="font-black text-danger text-sm mb-2">Target out of reach</h3>
            <p className="text-xs font-semibold text-danger/80 mb-3">
              Even if you score 20/20 on every remaining test, the highest you can reach is <span className="font-black">{bounds.max}/20</span> — below your target of {targetAverage}–20.
            </p>
            <div className="rounded-xl bg-card border-2 border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground">
                Consider adjusting your target to <span className="font-black text-foreground">{Math.floor(bounds.max * 2) / 2}–20</span> to stay motivated with a realistic goal.
              </p>
            </div>
          </motion.div>
        )}

        {/* What's next — only when target is still reachable */}
        {!targetUnreachable && missingItems.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl bg-card p-5 border-2 border-border"
          >
            <h3 className="font-black text-foreground text-sm mb-3">What's next</h3>
            <div className="flex flex-col gap-2">
              {missingItems.map(({ sub, mt, needed }) => {
                const isEasy = needed !== null && needed <= 10;
                const isHard = needed !== null && needed > 16;
                const isSafe = needed !== null && needed <= 0;
                return (
                  <div
                    key={`${sub.id}-${mt}`}
                    className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{sub.name}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">
                        {markLabels[mt]} · Coeff ×{sub.coefficient}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      {isSafe ? (
                        <span className="text-xs font-black text-success">Already safe</span>
                      ) : needed === null ? (
                        <span className="text-xs font-black text-muted-foreground">—</span>
                      ) : (
                        <>
                          <p className={`text-sm font-black ${isHard ? "text-danger" : isEasy ? "text-success" : "text-warning"}`}>
                            {Math.min(20, Math.max(0, needed)).toFixed(1)}/20
                          </p>
                          <p className="text-[10px] font-semibold text-muted-foreground">needed</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] font-semibold text-muted-foreground mt-3 text-center">
              Scores needed to stay within your target range ({targetAverage}–20)
            </p>
          </motion.div>
        )}

        {!targetUnreachable && missingItems.length === 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl bg-success/10 border-2 border-success/20 p-5 text-center"
          >
            <p className="font-black text-success text-sm">All marks entered</p>
            <p className="text-[10px] font-semibold text-success/70 mt-1">Your final average is calculated above</p>
          </motion.div>
        )}

      </div>
    </div>
  );
};

export default ResultsScreen;
