import { motion } from "framer-motion";
import { Target, TrendingUp, AlertTriangle, XCircle, Star, ArrowLeft } from "lucide-react";
import { Subject, FeedbackStatus } from "@/types/exam";
import {
  calcYearlyAverage,
  calcMinimumMarkNeeded,
  getFeedbackStatus,
  getPredictedRange,
  rankSubjectsByImpact,
} from "@/lib/exam-logic";

interface ResultsScreenProps {
  subjects: Subject[];
  targetAverage: number;
  onBack: () => void;
  onEditMarks: () => void;
}

const statusConfig: Record<FeedbackStatus, { bg: string; shadow: string; icon: React.ReactNode; text: string }> = {
  possible: {
    bg: "bg-success",
    shadow: "card-shadow-primary",
    icon: <TrendingUp className="h-8 w-8" />,
    text: "On track! 🎯",
  },
  risky: {
    bg: "bg-warning",
    shadow: "card-shadow-warning",
    icon: <AlertTriangle className="h-8 w-8" />,
    text: "Tight, but doable 😤",
  },
  impossible: {
    bg: "bg-danger",
    shadow: "card-shadow-danger",
    icon: <XCircle className="h-8 w-8" />,
    text: "Target no longer achievable",
  },
};

const ResultsScreen = ({ subjects, targetAverage, onBack, onEditMarks }: ResultsScreenProps) => {
  const currentAvg = calcYearlyAverage(subjects);
  const range = getPredictedRange(subjects);
  const ranked = rankSubjectsByImpact(subjects);

  // Find the best next mark opportunity
  let bestOpportunity: { subjectName: string; markType: string; needed: number; status: FeedbackStatus } | null = null;
  
  for (const { subject, emptyMarkType } of ranked) {
    if (!emptyMarkType) continue;
    const needed = calcMinimumMarkNeeded(subjects, subject.id, emptyMarkType as any, targetAverage);
    if (needed !== null) {
      bestOpportunity = {
        subjectName: subject.name,
        markType: emptyMarkType,
        needed: Math.round(needed * 10) / 10,
        status: getFeedbackStatus(needed),
      };
      break;
    }
  }

  const overallStatus: FeedbackStatus = bestOpportunity
    ? bestOpportunity.status
    : currentAvg !== null && currentAvg >= targetAverage
    ? "possible"
    : "risky";

  const config = statusConfig[overallStatus];

  // Calculate overall progress toward target
  const progressPercent = currentAvg !== null ? Math.min(100, (currentAvg / targetAverage) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-5 px-6 py-8"
    >
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Edit marks
      </button>

      {/* Status hero */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className={`${config.bg} ${config.shadow} rounded-2xl p-6 text-center text-primary-foreground`}
      >
        <div className="flex justify-center mb-2">{config.icon}</div>
        <h2 className="text-xl font-black">{config.text}</h2>
      </motion.div>

      {/* Current average */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-card p-5 card-shadow"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <span className="font-bold text-muted-foreground">Current average</span>
          </div>
          <span className="text-sm font-bold text-muted-foreground">Target: {targetAverage}/20</span>
        </div>
        <div className="text-4xl font-black text-foreground mb-2">
          {currentAvg !== null ? currentAvg.toFixed(1) : "—"}<span className="text-lg text-muted-foreground">/20</span>
        </div>
        {/* Progress bar */}
        <div className="rounded-full bg-muted h-3 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${overallStatus === "possible" ? "bg-success" : overallStatus === "risky" ? "bg-warning" : "bg-danger"}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ delay: 0.3, type: "spring", stiffness: 60 }}
          />
        </div>
      </motion.div>

      {/* Required next mark */}
      {bestOpportunity && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-card p-5 card-shadow"
        >
          <h3 className="font-black text-foreground mb-2">Next mark needed</h3>
          <div className="flex items-center gap-3">
            <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${
              bestOpportunity.status === "possible" ? "bg-success/15 text-success" :
              bestOpportunity.status === "risky" ? "bg-warning/15 text-warning" :
              "bg-danger/15 text-danger"
            }`}>
              <span className="text-xl font-black">
                {bestOpportunity.needed > 20 ? "X" : bestOpportunity.needed.toFixed(1)}
              </span>
            </div>
            <div>
              <p className="font-bold text-foreground">
                {bestOpportunity.needed > 20
                  ? "Not possible with a single test"
                  : `Get ${bestOpportunity.needed.toFixed(1)}/20 or higher`}
              </p>
              <p className="text-sm text-muted-foreground">
                {bestOpportunity.subjectName} · {bestOpportunity.markType}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Predicted range */}
      {range && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-card p-5 card-shadow"
        >
          <h3 className="font-black text-foreground mb-2">Predicted final range</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-danger">Pessimistic</span>
            <div className="flex-1 mx-3 h-2 rounded-full bg-muted relative overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-danger via-warning to-success rounded-full"
                style={{ width: "100%" }}
              />
            </div>
            <span className="text-sm font-bold text-success">Optimistic</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-lg font-black text-foreground">{range.min}</span>
            <span className="text-lg font-black text-foreground">{range.max}</span>
          </div>
        </motion.div>
      )}

      {/* Best subject to focus on */}
      {ranked.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl bg-card p-5 card-shadow"
        >
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-5 w-5 text-accent" />
            <h3 className="font-black text-foreground">Focus priority</h3>
          </div>
          <div className="flex flex-col gap-2">
            {ranked.slice(0, 3).map(({ subject, impact }, i) => (
              <div key={subject.id} className="flex items-center gap-3">
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-black ${
                  i === 0 ? "bg-primary text-primary-foreground" :
                  i === 1 ? "bg-secondary text-secondary-foreground" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </span>
                <span className="flex-1 font-bold text-foreground">{subject.name}</span>
                <span className="text-xs font-bold text-muted-foreground">
                  Impact: {impact}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <button
        onClick={onEditMarks}
        className="w-full rounded-2xl border-2 border-border bg-card py-4 text-lg font-extrabold text-foreground card-shadow active:translate-y-1 active:shadow-none transition-all"
      >
        EDIT MARKS ✏️
      </button>
    </motion.div>
  );
};

export default ResultsScreen;
