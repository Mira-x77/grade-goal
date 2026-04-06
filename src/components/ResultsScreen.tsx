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

const statusConfig: Record<FeedbackStatus, { bg: string; icon: React.ReactNode; text: string }> = {
  possible: { bg: "bg-success", icon: <TrendingUp className="h-8 w-8" />, text: "On track!" },
  risky: { bg: "bg-warning", icon: <AlertTriangle className="h-8 w-8" />, text: "Tight, but doable" },
  impossible: { bg: "bg-danger", icon: <XCircle className="h-8 w-8" />, text: "Target may need adjusting" },
};

// Per-subject status derived from needed score
function getSubjectStatus(needed: number | null, currentAvg: number | null): "safe" | "recoverable" | "critical" | "complete" {
  if (needed === null) return "complete";
  if (needed <= 0) return "safe";
  if (needed <= 14) return "recoverable";
  return "critical";
}

const subjectStatusConfig = {
  safe:        { dot: "bg-success",  label: "Safe",        labelColor: "text-success",  border: "border-l-success" },
  recoverable: { dot: "bg-warning",  label: "Recoverable", labelColor: "text-warning",  border: "border-l-warning" },
  critical:    { dot: "bg-danger",   label: "Critical",    labelColor: "text-danger",   border: "border-l-danger" },
  complete:    { dot: "bg-primary",  label: "Complete",    labelColor: "text-primary",  border: "border-l-primary" },
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

  // Build per-subject data — sorted alphabetically
  const subjectData = subjects
    .map((sub) => {
      const currentSubAvg = calcSubjectAverage(sub.marks);
      // Best case: fill all unknowns with 20
      const bestMarks = {
        interro: sub.marks.interro ?? 20,
        dev: sub.marks.dev ?? 20,
        compo: sub.marks.compo ?? 20,
      };
      const bestSubAvg = (bestMarks.interro + bestMarks.dev + bestMarks.compo * 2) / 4;

      // Needed: minimum score on the most impactful remaining mark
      // Use the first missing mark type for simplicity
      const missingTypes = (["compo", "dev", "interro"] as const).filter(mt => sub.marks[mt] === null);
      const primaryMissing = missingTypes[0] ?? null;
      const needed = primaryMissing
        ? calcMinimumMarkNeeded(subjects, sub.id, primaryMissing, targetAverage)
        : null;

      const status = getSubjectStatus(needed, currentSubAvg);

      return { sub, currentSubAvg, bestSubAvg, needed, primaryMissing, status };
    })
    .sort((a, b) => a.sub.name.localeCompare(b.sub.name));

  // Summary: focus subjects (critical/recoverable sorted by coeff) and safe subjects
  const focusSubjects = subjectData
    .filter(d => d.status === "critical" || d.status === "recoverable")
    .sort((a, b) => b.sub.coefficient - a.sub.coefficient)
    .slice(0, 2);
  const safeSubjects = subjectData.filter(d => d.status === "safe" || d.status === "complete");

  const hasMissingMarks = subjectData.some(d => d.primaryMissing !== null);

  return (
    <div className="flex flex-col" style={{ minHeight: "60vh" }}>
      <div className="flex flex-col gap-5 px-6 pt-4 pb-24 safe-area-top">

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

        {/* Edit Marks */}
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

        {/* Best possible */}
        {bounds && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl bg-card p-5 border-2 border-border"
          >
            <h3 className="font-black text-foreground text-sm mb-3">Best possible final</h3>
            <div className="rounded-xl bg-success/10 border border-success/20 p-3 text-center">
              <p className="text-3xl font-black text-success">{bounds.max.toFixed(1)}<span className="text-base opacity-60">/20</span></p>
              <p className="text-[10px] font-semibold text-success/70 mt-1">If you score 20/20 on every remaining test</p>
            </div>
          </motion.div>
        )}

        {/* Reality Check */}
        {targetUnreachable && bounds && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl bg-danger/10 border-2 border-danger/30 p-5"
          >
            <h3 className="font-black text-danger text-sm mb-2">Target out of reach</h3>
            <p className="text-xs font-semibold text-danger/80 mb-3">
              Even scoring 20/20 on everything remaining, the highest you can reach is <span className="font-black">{bounds.max.toFixed(1)}/20</span> — below your target of {targetAverage}–20.
            </p>
            <div className="rounded-xl bg-card border-2 border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground">
                Consider adjusting your target to <span className="font-black text-foreground">{Math.floor(bounds.max * 2) / 2}–20</span> to stay motivated with a realistic goal.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── What to do next — collapsible ── */}
        {!targetUnreachable && hasMissingMarks && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
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

                    {/* Summary card */}
                    {focusSubjects.length > 0 && (
                      <div className="mx-4 mt-4 mb-3 rounded-2xl bg-secondary/10 border border-secondary/20 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-secondary shrink-0" />
                          <p className="text-xs font-semibold text-muted-foreground">
                            Prioritize {focusSubjects.map(d => d.sub.name).join(" & ")} — {focusSubjects.length === 1 ? "this is your" : "these are your"} best lever{focusSubjects.length > 1 ? "s" : ""} to hit {targetAverage}.
                          </p>
                        </div>
                        <div className="flex flex-col gap-1.5 mt-2">
                          {focusSubjects.length > 0 && (
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
                                Safe: <span className="text-muted-foreground">{safeSubjects.map(d => d.sub.name).join(", ")} — don't let these slip</span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Per-subject breakdown */}
                    <div className="px-4 pb-4 flex flex-col gap-2">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Per-subject breakdown</p>
                      {subjectData.map(({ sub, currentSubAvg, bestSubAvg, needed, primaryMissing, status }) => {
                        const sc = subjectStatusConfig[status];
                        const neededClamped = needed !== null ? Math.min(20, Math.max(0, needed)) : null;

                        return (
                          <div
                            key={sub.id}
                            className={`rounded-2xl bg-card border-2 border-border overflow-hidden border-l-4 ${sc.border}`}
                          >
                            {/* Subject header */}
                            <div className="flex items-center justify-between px-4 pt-3 pb-2">
                              <div className="flex items-center gap-2">
                                <div className={`h-3 w-3 rounded-full ${sc.dot} shrink-0`} />
                                <span className="font-black text-sm text-foreground">{sub.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black ${sc.labelColor}`}>{sc.label}</span>
                                <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">Coeff {sub.coefficient}</span>
                              </div>
                            </div>

                            {/* Three columns */}
                            <div className="grid grid-cols-3 gap-0 px-4 pb-3">
                              <div className="text-center">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Current</p>
                                <p className={`text-lg font-black ${currentSubAvg !== null ? "text-foreground" : "text-muted-foreground/40"}`}>
                                  {currentSubAvg !== null ? currentSubAvg.toFixed(1) : "—"}
                                  <span className="text-[10px] font-bold text-muted-foreground">/20</span>
                                </p>
                              </div>
                              <div className="text-center border-x border-border">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Need</p>
                                <p className={`text-lg font-black ${
                                  neededClamped === null ? "text-muted-foreground/40"
                                  : neededClamped > 16 ? "text-danger"
                                  : neededClamped > 10 ? "text-warning"
                                  : "text-success"
                                }`}>
                                  {neededClamped !== null ? neededClamped.toFixed(1) : "—"}
                                  {neededClamped !== null && <span className="text-[10px] font-bold text-muted-foreground">/20</span>}
                                </p>
                                {primaryMissing && (
                                  <p className="text-[9px] font-semibold text-muted-foreground">{primaryMissing === "compo" ? "Compo" : primaryMissing === "dev" ? "Devoir" : "Interro"}</p>
                                )}
                              </div>
                              <div className="text-center">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Best case</p>
                                <p className="text-lg font-black text-success">
                                  {bestSubAvg.toFixed(1)}
                                  <span className="text-[10px] font-bold text-muted-foreground">/20</span>
                                </p>
                              </div>
                            </div>

                            {/* Impact line */}
                            {needed !== null && needed <= 20 && (
                              <div className="px-4 pb-3">
                                <p className="text-[10px] font-semibold text-muted-foreground">
                                  {needed <= 0
                                    ? "✓ Already contributing to your target"
                                    : needed > 20
                                    ? "⚠ Even 20/20 won't be enough here"
                                    : `↑ Score ${neededClamped?.toFixed(1)} on ${primaryMissing === "compo" ? "Compo" : primaryMissing === "dev" ? "Devoir" : "Interro"} to stay on track`}
                                </p>
                              </div>
                            )}
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
