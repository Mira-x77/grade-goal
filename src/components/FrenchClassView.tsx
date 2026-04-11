import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpDown, TrendingUp, TrendingDown, Minus, Star, ChevronDown } from "lucide-react";
import { Subject } from "@/types/exam";
import { calcFrenchSummary, getAppreciationTrend } from "@/lib/grading-french";
import { useLanguage } from "@/contexts/LanguageContext";

interface FrenchClassViewProps {
  subjects: Subject[];
}

const sentimentLabels = ["", "Very poor", "Poor", "Average", "Good", "Excellent"];

const FrenchClassView = ({ subjects }: FrenchClassViewProps) => {
  const summary = calcFrenchSummary(subjects);
  const trend = getAppreciationTrend(subjects);
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="rounded-2xl bg-card border-2 border-border overflow-hidden flex-shrink-0" style={{ width: "calc(100vw - 4rem)" }}>
      {/* Single collapsible header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 active:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-secondary" />
          <h3 className="font-black text-foreground text-sm">{t("classRanking")}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {summary.studentAvg !== null && (
            <span className="text-xs font-black text-foreground">
              {summary.studentAvg.toFixed(1)}<span className="text-muted-foreground font-bold">/20</span>
            </span>
          )}
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 flex flex-col gap-3 border-t border-border pt-3">

              {/* Avg comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <p className="text-xs font-bold text-muted-foreground">{t("currentAverage")}</p>
                  <p className="text-2xl font-black text-foreground">
                    {summary.studentAvg?.toFixed(1) ?? "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <p className="text-xs font-bold text-muted-foreground">{t("classAvg")}</p>
                  <p className="text-2xl font-black text-muted-foreground">
                    {summary.classAvg?.toFixed(1) ?? "—"}
                  </p>
                </div>
              </div>

              {summary.overallDelta !== null && (
                <div className={`rounded-xl px-4 py-2 flex items-center gap-2 ${
                  summary.overallDelta >= 0 ? "bg-success/15" : "bg-danger/15"
                }`}>
                  {summary.overallDelta >= 0
                    ? <TrendingUp className="h-4 w-4 text-success" />
                    : <TrendingDown className="h-4 w-4 text-danger" />}
                  <span className={`text-sm font-black ${summary.overallDelta >= 0 ? "text-success" : "text-danger"}`}>
                    Δ {summary.overallDelta > 0 ? "+" : ""}{summary.overallDelta.toFixed(1)} vs class
                  </span>
                </div>
              )}

              {summary.overallPercentile !== null && (
                <div>
                  <div className="flex justify-between text-xs font-bold text-muted-foreground mb-1">
                    <span>{t("min")}</span>
                    <span>Percentile: {summary.overallPercentile}%</span>
                    <span>{t("max")}</span>
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

              {/* Appreciation Trend */}
              {trend.count > 0 && (
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-3.5 w-3.5 text-accent" />
                    <span className="font-black text-foreground text-xs">{t("appreciation")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={`h-2 w-5 rounded-sm ${
                          trend.average !== null && i <= Math.round(trend.average) ? "bg-accent" : "bg-muted"
                        }`} />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">
                      {trend.average !== null ? sentimentLabels[Math.round(trend.average)] : t("noActivityYet")}
                    </span>
                    {trend.improving
                      ? <TrendingUp className="h-3.5 w-3.5 text-success ml-auto" />
                      : <Minus className="h-3.5 w-3.5 text-muted-foreground ml-auto" />}
                  </div>
                </div>
              )}

              {/* Per-subject comparison */}
              {summary.subjectDetails.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">{t("perSubjectBreakdown")}</p>
                  {[...summary.subjectDetails].sort((a, b) => a.subject.name.localeCompare(b.subject.name)).map((d) => (
                    <div key={d.subject.id} className="rounded-xl bg-muted/50 p-3">
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
                          <span className={`text-[10px] font-black ${d.delta >= 0 ? "text-success" : "text-danger"}`}>
                            Δ {d.delta > 0 ? "+" : ""}{d.delta.toFixed(1)}
                          </span>
                        ) : (
                        <span className="text-[10px] font-bold text-muted-foreground">{t("noClassData")}</span>
                        )}
                        {d.subject.french?.appreciation && (
                          <span className="text-[10px] font-bold text-accent">
                            {sentimentLabels[d.subject.french.appreciation]}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FrenchClassView;
