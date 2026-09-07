import { motion } from "framer-motion";
import { Sparkles, CheckCircle2, AlertTriangle, TrendingUp, Target, ArrowUpRight } from "lucide-react";
import { Subject, GradingSystem } from "@/types/exam";
import { analyzeTargetProgress } from "@/lib/target-advisor";

interface TargetProgressCardProps {
  subjects: Subject[];
  targetMin: number;
  gradingSystem?: GradingSystem;
  weightedSplit?: boolean;
}

export default function TargetProgressCard({
  subjects,
  targetMin,
  gradingSystem = "apc",
  weightedSplit = false,
}: TargetProgressCardProps) {
  const analysis = analyzeTargetProgress(subjects, targetMin, gradingSystem, weightedSplit);

  if (analysis.status === "no_data") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card border-2 border-foreground p-4 card-shadow"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center border border-foreground/20">
            <Target className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-black text-foreground text-sm">{analysis.headline}</p>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">{analysis.summary}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  const isSurpassing = analysis.status === "surpassing";
  const isOnTrack = analysis.status === "on_track";
  const isBehind = analysis.status === "behind";

  const badgeBg = isSurpassing
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
    : isOnTrack
    ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
    : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";

  const HeaderIcon = isSurpassing ? Sparkles : isOnTrack ? CheckCircle2 : AlertTriangle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border-2 border-foreground p-4 card-shadow space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HeaderIcon className={`h-5 w-5 ${isSurpassing ? "text-emerald-600 dark:text-emerald-400" : isOnTrack ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`} />
          <h3 className="font-black text-foreground text-base">{analysis.headline}</h3>
        </div>

        <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${badgeBg}`}>
          {analysis.badgeText}
        </span>
      </div>

      {/* Summary Message */}
      <p className="text-xs font-semibold text-foreground/80 leading-relaxed">
        {analysis.summary}
      </p>

      {/* What Needs to be Improved Section */}
      {analysis.improvements.length > 0 && (
        <div className="pt-2 border-t border-border space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-muted-foreground uppercase tracking-wider">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span>What Needs Improvement</span>
          </div>

          <div className="space-y-1.5">
            {analysis.improvements.map((item) => (
              <div
                key={item.subjectId}
                className="flex items-center justify-between gap-2 bg-muted/50 rounded-xl p-2.5 border border-foreground/10"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-foreground">{item.subjectName}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-foreground/10 text-muted-foreground">
                      Coef {item.coefficient}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                    {item.reason}
                  </p>
                </div>

                {item.impactOnTotalAvg > 0 && (
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-black text-primary flex items-center gap-0.5 justify-end">
                      +{item.impactOnTotalAvg.toFixed(2)} pts
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                    <span className="text-[9px] font-semibold text-muted-foreground">Impact on Avg</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
