import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, AlertTriangle, XCircle, Pencil, ChevronDown, Lightbulb, Target, ShieldCheck } from "lucide-react";
import { Subject, FeedbackStatus } from "@/types/exam";
import {
  calcYearlyAverage,
  calcSubjectAverage,
  getAbsoluteBounds,
  calcMinimumMarkNeeded,
} from "@/lib/exam-logic";

interface ResultsScreenProps {
  subjects: Subject[];
  targetAverage: number;
  onBack: () => void;
  onEditMarks: () => void;
}

const statusConfig: Record<FeedbackStatus, { bg: string; border: string; icon: React.ReactNode; text: string; sub: string }> = {
  possible: {
    bg: "bg-success/10", border: "border-success/30",
    icon: <TrendingUp className="h-5 w-5 text-success" />,
    text: "On track",
    sub: "Your average is within your target range.",
  },
  risky: {
    bg: "bg-warning/10", border: "border-warning/30",
    icon: <AlertTriangle className="h-5 w-5 text-warning" />,
    text: "Getting close",
    sub: "A few more good scores will get you there.",
  },
  impossible: {
    bg: "bg-danger/10", border: "border-danger/30",
    icon: <XCircle className="h-5 w-5 text-danger" />,
    text: "Below target",
    sub: "Focus on high-coefficient subjects to close the gap.",
  },
};

function getSubjectStatus(needed: number | null, hasAnyMark: boolean): "safe" | "recoverable" | "critical" | "complete" | "pending" {
  if (needed === null) return "complete";
  if (!hasAnyMark) return "pending";  // no marks yet — don't judge
  if (needed <= 0) return "safe";
  if (needed <= 14) return "recoverable";
  return "critical";
}

const subjectStatusConfig = {
  safe:        { dot: "bg-success",          label: "Safe",        labelColor: "text-success" },
  recoverable: { dot: "bg-warning",          label: "Recoverable", labelColor: "text-warning" },
  critical:    { dot: "bg-danger",           label: "Critical",    labelColor: "text-danger" },
  complete:    { dot: "bg-primary",          label: "Complete",    labelColor: "text-primary" },
  pending:     { dot: "bg-muted-foreground", label: "Pending",     labelColor: "text-muted-foreground" },
};

const ResultsScreen = ({ subjects, targetAverage, onBack, onEditMarks }: ResultsScreenProps) => {
  const [whatsNextOpen, setWhatsNextOpen] = useState(false);
  const currentAvg = calcYearlyAverage(subjects);
  const bounds = getAbsoluteBounds(subjects);

  const overallStatus: FeedbackStatus = currentAvg !== null && currentAvg >= targetAverage ? "possible"
    : currentAvg !== null && currentAvg >= targetAverage - 2 ? "risky"
    : "impossible";

  const config = statusConfig[overallStatus];
  const progressPercent = currentAvg !== null ? Math.min(100, (currentAvg / targetAverage) * 100) : 0;
  const targetUnreachable = bounds !== null && bounds.max < targetAverage;
  const isOnTrack = overallStatus === "possible";

  // Build per-subject data — sorted alphabetically
  const subjectData = subjects
    .map((sub) => {
      const currentSubAvg = calcSubjectAverage(sub.marks);
      const bestMarks = {
        interro: sub.marks.interro ?? 20,
        dev: sub.marks.dev ?? 20,
        compo: sub.marks.compo ?? 20,
      };
      const bestSubAvg = (bestMarks.interro + bestMarks.dev + bestMarks.compo * 2) / 4;
      const missingTypes = (["compo", "dev", "interro"] as const).filter(mt => sub.marks[mt] === null);
      const primaryMissing = missingTypes[0] ?? null;
      const needed = primaryMissing
        ? calcMinimumMarkNeeded(subjects, sub.id, primaryMissing, targetAverage)
        : null;
      const hasAnyMark = sub.marks.interro !== null || sub.marks.dev !== null || sub.marks.compo !== null;
      const status = getSubjectStatus(needed, hasAnyMark);
      return { sub, currentSubAvg, bestSubAvg, needed, primaryMissing, status };
    })
    .sort((a, b) => a.sub.name.localeCompare(b.sub.name));

  const focusSubjects = !isOnTrack
    ? subjectData
        .filter(d => d.status === "critical" || d.status === "recoverable")
        .sort((a, b) => b.sub.coefficient - a.sub.coefficient)
        .slice(0, 2)
    : [];
  const safeSubjects = subjectData.filter(d => d.status === "safe" || d.status === "complete");
  const hasMissingMarks = subjectData.some(d => d.primaryMissing !== null);

  return (
    <div className="flex flex-col" style={{ minHeight: "60vh" }}>
      <div className="flex flex-col gap-4 px-6 pt-4 pb-24 safe-area-top">

        {/* Compact status bar — not the main event, just context */}
        <motion.div
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`rounded-2xl px-4 py-3 border-2 ${config.bg} ${config.border} flex items-center gap-3`}
        >
          {config.icon}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-foreground">
                {currentAvg !== null ? currentAvg.toFixed(1) : "—"}
                <span className="text-sm font-bold text-muted-foreground">/20</span>
              </span>
              <span className="text-xs font-bold text-muted-foreground">→ target {targetAverage}–20</span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground truncate">{config.sub}</p>
          </div>
          {/* Progress bar */}
          <div className="w-16 shrink-0">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${isOnTrack ? "bg-success" : overallStatus === "risky" ? "bg-warning" : "bg-danger"}`}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ delay: 0.2, type: "spring", stiffness: 60 }}
              />
            </div>
            <p className="text-[9px] font-bold text-muted-foreground text-right mt-0.5">{progressPercent.toFixed(0)}%</p>
          </div>
        </motion.div>

        {/* Edit Marks */}
        <motion.button
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          onClick={onEditMarks}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-card border-2 border-foreground py-3 font-black text-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all"
        >
          <Pencil className="h-4 w-4" />
          Edit Marks
        </motion.button>

        {/* Best possible */}
        {bounds && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-card p-4 border-2 border-border flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Best possible final</p>
              <p className="text-xs font-semibold text-muted-foreground mt-0.5">If you score 20/20 on everything remaining</p>
            </div>
            <p className="text-3xl font-black text-success shrink-0">{bounds.max.toFixed(1)}<span className="text-sm opacity-60">/20</span></p>
          </motion.div>
        )}

        {/* Reality Check */}
        {targetUnreachable && bounds && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-danger/10 border-2 border-danger/30 p-4"
          >
            <h3 className="font-black text-danger text-sm mb-1">Target out of reach</h3>
            <p className="text-xs font-semibold text-danger/80 mb-3">
              Even scoring 20/20 on everything remaining, the highest you can reach is <span className="font-black">{bounds.max.toFixed(1)}/20</span> — below your target of {targetAverage}–20.
            </p>
            <div className="rounded-xl bg-card border-2 border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground">
                Consider adjusting your target to <span className="font-black text-foreground">{Math.floor(bounds.max * 2) / 2}–20</span>.
              </p>
            </div>
          </motion.div>
        )}

        {/* What to do next — collapsible */}
        {!targetUnreachable && hasMissingMarks && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-card border-2 border-border overflow-hidden"
          >
            <button
              onClick={() => setWhatsNextOpen(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 active:bg-muted/40 transition-colors"
            >
              <h3 className="font-black text-foreground text-sm">What to do next</h3>
              <motion.div animate={{ rotate: whatsNextOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {whatsNextOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border">

                    {/* Summary card — context-aware */}
                    <div className={`mx-4 mt-4 mb-3 rounded-2xl border p-4 ${
                      isOnTrack ? "bg-success/10 border-success/20" : "bg-secondary/10 border-secondary/20"
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className={`h-4 w-4 shrink-0 ${isOnTrack ? "text-success" : "text-secondary"}`} />
                        <p className="text-xs font-semibold text-muted-foreground">
                          {isOnTrack
                            ? `You're already on track for ${targetAverage}–20. Keep your scores consistent.`
                            : focusSubjects.length > 0
                            ? `Prioritize ${focusSubjects.map(d => d.sub.name).join(" & ")} — ${focusSubjects.length === 1 ? "this is your" : "these are your"} best lever${focusSubjects.length > 1 ? "s" : ""} to hit ${targetAverage}.`
                            : `Keep your scores up across all subjects to stay on track.`}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 mt-2">
                        {!isOnTrack && focusSubjects.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Target className="h-3.5 w-3.5 text-warning shrink-0" />
                            <p className="text-xs font-bold text-foreground">
                              Focus on: <span className="text-warning">{focusSubjects.map(d => d.sub.name).join(", ")}</span>
                            </p>
                          </div>
                        )}
                        {safeSubjects.length > 0 && (
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-3.5 w-3.5 text-success shrink-0" />
                            <p className="text-xs font-bold text-foreground">
                              {isOnTrack ? "Maintain: " : "Safe: "}
                              <span className="text-muted-foreground">{safeSubjects.map(d => d.sub.name).join(", ")} — don't let these slip</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Per-subject breakdown */}
                    <div className="px-4 pb-4 flex flex-col gap-2">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Per-subject breakdown</p>
                      {subjectData.map(({ sub, currentSubAvg, bestSubAvg, needed, primaryMissing, status }) => {
                        const sc = subjectStatusConfig[status];
                        const neededClamped = needed !== null ? Math.min(20, Math.max(0, needed)) : null;
                        const markLabel = primaryMissing === "compo" ? "Compo" : primaryMissing === "dev" ? "Devoir" : "Interro";
                        const actionText = (() => {
                          if (status === "complete") return "All marks entered — nothing left to do here.";
                          if (status === "pending") return "No marks entered yet — add your scores to see what you need.";
                          if (status === "safe") return "Already contributing to your target — don't let it slip.";
                          if (neededClamped !== null && needed !== null && needed > 20) return `Even 20/20 on ${markLabel} won't be enough — adjust your target.`;
                          if (neededClamped !== null) return `Score ≥ ${neededClamped.toFixed(1)} on ${markLabel} to stay on track.`;
                          return "Keep it up.";
                        })();
                        const currentPct = currentSubAvg !== null ? (currentSubAvg / 20) * 100 : 0;
                        const bestPct = (bestSubAvg / 20) * 100;

                        return (
                          <div key={sub.id} className="rounded-2xl bg-card border-2 border-border px-4 py-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <div className={`h-2.5 w-2.5 rounded-full ${sc.dot} shrink-0`} />
                                <span className="font-black text-sm text-foreground">{sub.name}</span>
                                <span className="text-[10px] font-bold text-muted-foreground">×{sub.coefficient}</span>
                              </div>
                              <span className={`text-[10px] font-black ${sc.labelColor}`}>{sc.label}</span>
                            </div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">{actionText}</p>
                            <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                              <div className="absolute left-0 top-0 h-full rounded-full bg-success/30 transition-all duration-500" style={{ width: `${bestPct}%` }} />
                              <div
                                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                                  status === "critical" ? "bg-danger"
                                  : status === "recoverable" ? "bg-warning"
                                  : status === "pending" ? "bg-muted-foreground/30"
                                  : "bg-success"
                                }`}
                                style={{ width: `${currentPct}%` }}
                              />
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-[9px] font-bold text-muted-foreground">
                                {currentSubAvg !== null ? `${currentSubAvg.toFixed(1)} now` : "No marks yet"}
                              </span>
                              <span className="text-[9px] font-bold text-success">{bestSubAvg.toFixed(1)} best case</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {!targetUnreachable && !hasMissingMarks && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
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
