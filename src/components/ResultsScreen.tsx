import { motion } from "framer-motion";
import { Target, TrendingUp, AlertTriangle, XCircle, ArrowLeft, Pencil, Home } from "lucide-react";
import { Subject, FeedbackStatus } from "@/types/exam";
import { useNavigate } from "react-router-dom";
import {
  calcYearlyAverage,
  getPredictedRange,
} from "@/lib/exam-logic";
import SubjectBreakdown from "./SubjectBreakdown";

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
    text: "On track!",
  },
  risky: {
    bg: "bg-warning",
    shadow: "card-shadow-warning",
    icon: <AlertTriangle className="h-8 w-8" />,
    text: "Tight, but doable",
  },
  impossible: {
    bg: "bg-danger",
    shadow: "card-shadow-danger",
    icon: <XCircle className="h-8 w-8" />,
    text: "Target may need adjusting",
  },
};

const ResultsScreen = ({ subjects, targetAverage, onBack, onEditMarks }: ResultsScreenProps) => {
  const navigate = useNavigate();
  const currentAvg = calcYearlyAverage(subjects);
  const range = getPredictedRange(subjects);

  const overallStatus: FeedbackStatus = currentAvg !== null && currentAvg >= targetAverage ? "possible"
    : currentAvg !== null && currentAvg >= targetAverage - 2 ? "risky"
    : "impossible";

  const config = statusConfig[overallStatus];
  const progressPercent = currentAvg !== null ? Math.min(100, (currentAvg / targetAverage) * 100) : 0;
  const realisticTarget = overallStatus === "impossible" && range
    ? Math.min(range.max, Math.floor(range.max * 2) / 2)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-5 px-6 py-8"
    >
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Edit marks
      </button>

      {/* 1. Status hero + current average merged */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className={`${config.bg} ${config.shadow} rounded-2xl p-6 text-primary-foreground`}
      >
        <div className="flex items-center gap-3 mb-4">
          {config.icon}
          <div>
            <h2 className="text-xl font-black">{config.text}</h2>
            {realisticTarget && (
              <p className="text-sm font-bold opacity-90">Realistic target: {realisticTarget}/20</p>
            )}
          </div>
        </div>
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-xs font-bold opacity-70 uppercase tracking-wider">Current average</p>
            <div className="text-5xl font-black">
              {currentAvg !== null ? currentAvg.toFixed(1) : "—"}
              <span className="text-xl font-bold opacity-70">/20</span>
            </div>
          </div>
          <p className="text-sm font-bold opacity-70">Target: {targetAverage}/20</p>
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

      {/* 2. Predicted range */}
      {range && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl bg-card p-5 border-2 border-border"
        >
          <h3 className="font-black text-foreground mb-3">
            {overallStatus === "impossible" ? "What you can still reach" : "Predicted final range"}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-danger">Pessimistic</span>
            <div className="flex-1 mx-3 h-2 rounded-full bg-muted relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-danger via-warning to-success rounded-full w-full" />
            </div>
            <span className="text-sm font-bold text-success">Optimistic</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-lg font-black text-foreground">{range.min}</span>
            <span className="text-lg font-black text-foreground">{range.max}</span>
          </div>
        </motion.div>
      )}

      <SubjectBreakdown subjects={subjects} targetAverage={targetAverage} />

      <button
        onClick={onEditMarks}
        className="w-full rounded-2xl border-2 border-border bg-card py-4 text-lg font-extrabold text-foreground card-shadow active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
      >
        <Pencil className="h-5 w-5" /> EDIT MARKS
      </button>

      <button
        onClick={() => navigate("/")}
        className="w-full rounded-2xl bg-primary py-4 text-lg font-extrabold text-primary-foreground card-shadow-primary active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
      >
        <Home className="h-5 w-5" /> GO TO DASHBOARD
      </button>
    </motion.div>
  );
};

export default ResultsScreen;
