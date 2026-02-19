import { motion } from "framer-motion";
import { ArrowUpDown, TrendingUp, TrendingDown, Minus, Star } from "lucide-react";
import { Subject } from "@/types/exam";
import { calcFrenchSummary, getAppreciationTrend } from "@/lib/grading-french";

interface FrenchClassViewProps {
  subjects: Subject[];
}

const sentimentLabels = ["", "Very poor", "Poor", "Average", "Good", "Excellent"];

const FrenchClassView = ({ subjects }: FrenchClassViewProps) => {
  const summary = calcFrenchSummary(subjects);
  const trend = getAppreciationTrend(subjects);

  return (
    <div className="flex flex-col gap-4">
      {/* Overall Summary */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl bg-card p-5 card-shadow"
      >
        <div className="flex items-center gap-2 mb-3">
          <ArrowUpDown className="h-5 w-5 text-secondary" />
          <h3 className="font-black text-foreground">Class Ranking View</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-xs font-bold text-muted-foreground">Your Average</p>
            <p className="text-2xl font-black text-foreground">
              {summary.studentAvg?.toFixed(1) ?? "—"}
            </p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-xs font-bold text-muted-foreground">Class Average</p>
            <p className="text-2xl font-black text-muted-foreground">
              {summary.classAvg?.toFixed(1) ?? "—"}
            </p>
          </div>
        </div>

        {summary.overallDelta !== null && (
          <div className={`mt-3 rounded-xl px-4 py-2 flex items-center gap-2 ${
            summary.overallDelta >= 0 ? "bg-success/15" : "bg-danger/15"
          }`}>
            {summary.overallDelta >= 0 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-danger" />
            )}
            <span className={`text-sm font-black ${
              summary.overallDelta >= 0 ? "text-success" : "text-danger"
            }`}>
              Δ {summary.overallDelta > 0 ? "+" : ""}{summary.overallDelta.toFixed(1)} vs class
            </span>
          </div>
        )}

        {summary.overallPercentile !== null && (
          <div className="mt-3">
            <div className="flex justify-between text-xs font-bold text-muted-foreground mb-1">
              <span>Class Min</span>
              <span>Percentile: {summary.overallPercentile}%</span>
              <span>Class Max</span>
            </div>
            <div className="h-3 rounded-full bg-muted relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-danger via-warning to-success rounded-full" />
              <motion.div
                className="absolute top-0 h-3 w-3 rounded-full bg-foreground border-2 border-card"
                initial={{ left: "0%" }}
                animate={{ left: `${summary.overallPercentile}%` }}
                transition={{ type: "spring", stiffness: 100 }}
                style={{ transform: "translateX(-50%)" }}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Appreciation Trend */}
      {trend.count > 0 && (
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card p-4 card-shadow"
        >
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-accent" />
            <h4 className="font-black text-foreground text-sm">Appreciation Trend</h4>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-2 w-6 rounded-sm ${
                    trend.average !== null && i <= Math.round(trend.average)
                      ? "bg-accent"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-muted-foreground">
              {trend.average !== null ? sentimentLabels[Math.round(trend.average)] : "No data"}
            </span>
            {trend.improving ? (
              <TrendingUp className="h-3.5 w-3.5 text-success ml-auto" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
            )}
          </div>
        </motion.div>
      )}

      {/* Per-subject details */}
      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl bg-card p-4 card-shadow"
      >
        <h4 className="font-black text-foreground text-sm mb-3">Subject Comparison</h4>
        <div className="flex flex-col gap-2">
          {summary.subjectDetails.map((d, i) => (
            <motion.div
              key={d.subject.id}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.03 }}
              className="rounded-xl bg-muted/50 p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-foreground">{d.subject.name}</span>
                <span className="text-xs font-bold text-muted-foreground">
                  {d.studentAvg?.toFixed(1) ?? "—"}/20
                </span>
              </div>

              {d.percentile !== null && (
                <div className="h-1.5 rounded-full bg-muted relative overflow-hidden mb-1">
                  <div className="absolute inset-0 bg-gradient-to-r from-danger via-warning to-success rounded-full" />
                  <div
                    className="absolute top-0 h-1.5 w-1.5 rounded-full bg-foreground"
                    style={{ left: `${d.percentile}%`, transform: "translateX(-50%)" }}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                {d.delta !== null ? (
                  <span className={`text-[10px] font-black ${
                    d.delta >= 0 ? "text-success" : "text-danger"
                  }`}>
                    Δ {d.delta > 0 ? "+" : ""}{d.delta.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-muted-foreground">No class data</span>
                )}
                {d.subject.french?.appreciation && (
                  <span className="text-[10px] font-bold text-accent">
                    {sentimentLabels[d.subject.french.appreciation]}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default FrenchClassView;
