import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, AlertTriangle, XCircle, Pencil, ChevronDown, Lightbulb, Target, ShieldCheck } from "lucide-react";
import { Subject, FeedbackStatus } from "@/types/exam";
import {
  calcYearlyAverage,
  calcSubjectAverage,
  getAbsoluteBounds,
  calcMinimumMarkNeeded,
  fmtAvg,
} from "@/lib/exam-logic";
import { useLanguage } from "@/contexts/LanguageContext";

interface ResultsScreenProps {
  subjects: Subject[];
  targetAverage: number;
  onBack: () => void;
  onEditMarks: () => void;
}

function getSubjectStatus(needed: number | null, hasAnyMark: boolean, bestSubAvg: number, minTarget: number): "safe" | "recoverable" | "critical" | "complete" | "pending" {
  if (needed === null) return "complete";
  if (!hasAnyMark) return "pending";
  if (needed <= 0) return "safe";
  if (bestSubAvg < minTarget) return "critical";
  if (needed >= 20) return "critical";
  return "recoverable";
}

const subjectStatusConfig = {
  safe:        { dot: "bg-success",          labelKey: "subjectSafe" as const,        labelColor: "text-success" },
  recoverable: { dot: "bg-warning",          labelKey: "subjectRecoverable" as const, labelColor: "text-warning" },
  critical:    { dot: "bg-danger",           labelKey: "subjectCritical" as const,    labelColor: "text-danger" },
  complete:    { dot: "bg-primary",          labelKey: "subjectComplete" as const,    labelColor: "text-primary" },
  pending:     { dot: "bg-muted-foreground", labelKey: "subjectPending" as const,     labelColor: "text-muted-foreground" },
};

const ResultsScreen = ({ subjects, targetAverage, onBack, onEditMarks }: ResultsScreenProps) => {
  const [whatsNextOpen, setWhatsNextOpen] = useState(false);
  const { t } = useLanguage();
  const currentAvg = calcYearlyAverage(subjects);
  const bounds = getAbsoluteBounds(subjects);

  const overallStatus: FeedbackStatus = currentAvg !== null && currentAvg >= targetAverage ? "possible"
    : currentAvg !== null && currentAvg >= targetAverage - 2 ? "risky"
    : "impossible";

  const statusConfig = {
    possible: { bg: "bg-success/10", border: "border-success/30", icon: <TrendingUp className="h-5 w-5 text-success" />, sub: t("onTrackSub") },
    risky:    { bg: "bg-warning/10", border: "border-warning/30", icon: <AlertTriangle className="h-5 w-5 text-warning" />, sub: t("gettingCloseSub") },
    impossible: { bg: "bg-danger/10", border: "border-danger/30", icon: <XCircle className="h-5 w-5 text-danger" />, sub: t("belowTargetSub") },
  };

  const config = statusConfig[overallStatus];
  const progressPercent = currentAvg !== null ? Math.min(100, (currentAvg / targetAverage) * 100) : 0;
  const targetUnreachable = bounds !== null && bounds.max < targetAverage;
  const isOnTrack = overallStatus === "possible";

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
      const status = getSubjectStatus(needed, hasAnyMark, bestSubAvg, targetAverage);
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

  const markLabel = (type: string | null) =>
    type === "compo" ? t("composition") : type === "dev" ? t("devoir") : t("interro");

  return (
    <div className="flex flex-col" style={{ minHeight: "60vh" }}>
      <div className="flex flex-col gap-4 px-6 pt-2 pb-24">

        {/* Status card */}
        <motion.div
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`rounded-2xl border-2 ${config.bg} ${config.border} overflow-hidden`}
        >
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-border/30">
            {config.icon}
            <p className="text-xs font-semibold text-foreground">{config.sub}</p>
          </div>
          <div className="flex items-stretch px-4 py-3 gap-4">
            <div className="flex items-center justify-center shrink-0" style={{ width: "33%" }}>
              <span className={`text-5xl font-black leading-none ${
                isOnTrack ? "text-success" : overallStatus === "risky" ? "text-warning" : "text-danger"
              }`}>
                {currentAvg !== null ? fmtAvg(currentAvg) : "—"}
              </span>
            </div>
            <div className="flex flex-col justify-between flex-1 gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">{t("targetLabel")}</span>
                <span className="text-sm font-black text-foreground">{targetAverage}–20</span>
              </div>
              <div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${isOnTrack ? "bg-success" : overallStatus === "risky" ? "bg-warning" : "bg-danger"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 60 }}
                  />
                </div>
                <p className="text-[9px] font-bold text-muted-foreground text-right mt-0.5">{progressPercent.toFixed(0)}%</p>
              </div>
            </div>
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
          {t("editMarks")}
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
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{t("bestPossibleFinal")}</p>
              <p className="text-xs font-semibold text-muted-foreground mt-0.5">{t("bestPossibleFinalDesc")}</p>
            </div>
            <p className="text-3xl font-black text-success shrink-0">{bounds.max.toFixed(1)}<span className="text-sm opacity-60">/20</span></p>
          </motion.div>
        )}

        {/* Target out of reach */}
        {targetUnreachable && bounds && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-danger/10 border-2 border-danger/30 p-4"
          >
            <h3 className="font-black text-danger text-sm mb-1">{t("targetOutOfReach")}</h3>
            <p className="text-xs font-semibold text-danger/80 mb-3">
              {t("targetOutOfReachDesc")
                .replace("{max}", bounds.max.toFixed(1))
                .replace("{target}", String(targetAverage))}
            </p>
            <div className="rounded-xl bg-card border-2 border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground">
                {t("considerAdjusting").replace("{target}", String(Math.floor(bounds.max * 2) / 2))}
              </p>
            </div>
          </motion.div>
        )}

        {/* What to do next */}
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
              <h3 className="font-black text-foreground text-sm">{t("whatToDoNext")}</h3>
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
                    {/* Summary */}
                    <div className={`mx-4 mt-4 mb-3 rounded-2xl border p-4 ${
                      isOnTrack ? "bg-success/10 border-success/20" : "bg-secondary/10 border-secondary/20"
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className={`h-4 w-4 shrink-0 ${isOnTrack ? "text-success" : "text-secondary"}`} />
                        <p className="text-xs font-semibold text-muted-foreground">
                          {isOnTrack
                            ? t("youreOnTrackKeep").replace("{target}", String(targetAverage))
                            : focusSubjects.length > 0
                            ? t("prioritizeSubjects")
                                .replace("{subjects}", focusSubjects.map(d => d.sub.name).join(" & "))
                                .replace("{count}", focusSubjects.length === 1 ? t("focusOn") : t("focusOn"))
                                .replace("{target}", String(targetAverage))
                            : t("keepScoresUp")}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 mt-2">
                        {!isOnTrack && focusSubjects.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Target className="h-3.5 w-3.5 text-warning shrink-0" />
                            <p className="text-xs font-bold text-foreground">
                              {t("focusOn")} <span className="text-warning">{focusSubjects.map(d => d.sub.name).join(", ")}</span>
                            </p>
                          </div>
                        )}
                        {safeSubjects.length > 0 && (
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-3.5 w-3.5 text-success shrink-0" />
                            <p className="text-xs font-bold text-foreground">
                              {isOnTrack ? t("maintain") : t("safe")}
                              {" "}<span className="text-muted-foreground">{safeSubjects.map(d => d.sub.name).join(", ")} — {t("dontLetSlip")}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Per-subject breakdown */}
                    <div className="px-4 pb-4 flex flex-col gap-2">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{t("perSubjectBreakdown")}</p>
                      {subjectData.map((d) => (
                        <SubjectBreakdownItem key={d.sub.id} data={d} targetAverage={targetAverage} t={t} markLabel={markLabel} />
                      ))}
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
            <p className="font-black text-success text-sm">{t("allMarksEnteredFinal")}</p>
            <p className="text-[10px] font-semibold text-success/70 mt-1">{t("finalAverageCalculated")}</p>
          </motion.div>
        )}

      </div>
    </div>
  );
};

const SubjectBreakdownItem = ({ data, targetAverage, t, markLabel }: { data: any; targetAverage: number; t: any; markLabel: (m: any) => string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { sub, currentSubAvg, bestSubAvg, needed, primaryMissing, status } = data;
  const sc = subjectStatusConfig[status as keyof typeof subjectStatusConfig];
  const neededClamped = needed !== null ? Math.min(20, Math.max(0, needed)) : null;
  const ml = markLabel(primaryMissing);
  const actionText = (() => {
    if (status === "complete") return t("allMarksEnteredNothing");
    if (status === "pending") return t("noMarksYetAdd");
    if (status === "safe") return t("alreadyContributing");
    if (bestSubAvg < targetAverage) return t("evenPerfectNotEnough").replace("{mark}", ml);
    if (neededClamped !== null && needed !== null && needed >= 20) return t("evenPerfectNotEnough").replace("{mark}", ml);
    if (neededClamped !== null) return t("scoreToStayOnTrack").replace("{score}", neededClamped.toFixed(1)).replace("{mark}", ml);
    return t("keepItUp");
  })();
  const currentPct = currentSubAvg !== null ? (currentSubAvg / 20) * 100 : 0;
  const bestPct = (bestSubAvg / 20) * 100;

  return (
    <div className="rounded-2xl bg-card border-2 border-border overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full px-4 py-3 flex items-center justify-between active:bg-muted/40 transition-colors"
      >
        <div className="flex flex-col gap-1.5 items-start">
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${sc.dot} shrink-0`} />
            <span className="font-black text-sm text-foreground text-left">{sub.name}</span>
            <span className="text-[10px] font-bold text-muted-foreground shrink-0">×{sub.coefficient}</span>
          </div>
          <span className={`text-[10px] font-black ${sc.labelColor}`}>{t(sc.labelKey)}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs font-black text-foreground">
              {currentSubAvg !== null ? fmtAvg(currentSubAvg) : "—"} <span className="opacity-60 font-semibold text-[10px]">/20</span>
            </span>
            <span className={`text-[9px] font-bold ${bestSubAvg >= targetAverage ? "text-success/80" : "text-muted-foreground"}`}>{fmtAvg(bestSubAvg)} max</span>
          </div>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground mb-2 mt-2">{actionText}</p>
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
                  {currentSubAvg !== null ? `${fmtAvg(currentSubAvg)} ${t("nowLabel")}` : t("noMarksYet")}
                </span>
                <span className="text-[9px] font-bold text-success">{fmtAvg(bestSubAvg)} {t("bestCase")}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResultsScreen;
