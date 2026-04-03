import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { loadState } from "@/lib/storage";
import { simulateYearlyAverage, calcYearlyAverage, getFeedbackStatus, getAbsoluteBounds } from "@/lib/exam-logic";
import TaskBar from "@/components/TaskBar";
import { useLanguage } from "@/contexts/LanguageContext";

interface SliderOverride {
  subjectId: string;
  markType: "interro" | "dev" | "compo";
  value: number;
}

const markTypeLabels: Record<string, string> = {
  interro: "Interro",
  dev: "Devoir",
  compo: "Composition",
};

const Simulator = () => {
  const state = loadState();
  const subjects = state?.subjects ?? [];
  const targetAvg = state?.targetAverage ?? 16;
  const { t } = useLanguage();

  // Collect all empty marks as sliders
  const emptySlots = useMemo(() => {
    const slots: { subjectId: string; subjectName: string; markType: "interro" | "dev" | "compo"; coefficient: number }[] = [];
    for (const sub of subjects) {
      for (const mt of ["interro", "dev", "compo"] as const) {
        if (sub.marks[mt] === null) {
          slots.push({ subjectId: sub.id, subjectName: sub.name, markType: mt, coefficient: sub.coefficient });
        }
      }
    }
    return slots;
  }, [subjects]);

  const [overrides, setOverrides] = useState<SliderOverride[]>(
    emptySlots.map((s) => ({ subjectId: s.subjectId, markType: s.markType, value: 10 }))
  );

  const updateOverride = (index: number, value: number) => {
    setOverrides((prev) => prev.map((o, i) => (i === index ? { ...o, value } : o)));
  };

  const simulatedAvg = simulateYearlyAverage(subjects, overrides);
  const currentAvg = calcYearlyAverage(subjects);
  const bounds = getAbsoluteBounds(subjects);
  const status = simulatedAvg !== null ? getFeedbackStatus(
    simulatedAvg >= targetAvg ? 0 : targetAvg - simulatedAvg > 4 ? 21 : 18
  ) : "possible";

  const statusColor = simulatedAvg !== null
    ? simulatedAvg >= targetAvg ? "text-success" : simulatedAvg >= targetAvg - 2 ? "text-warning" : "text-danger"
    : "text-muted-foreground";

  const statusBg = simulatedAvg !== null
    ? simulatedAvg >= targetAvg ? "bg-success" : simulatedAvg >= targetAvg - 2 ? "bg-warning" : "bg-danger"
    : "bg-muted";

  if (subjects.length === 0) {
    return (
      <div className="min-h-screen bg-background max-w-md mx-auto flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-lg font-black text-foreground">{t("noSubjectsYet")}</p>
        <Link to="/planner" className="rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground">
          {t("startPlanningAction")}
        </Link>
      </div>
    );
  }

  let totalCoeff = 0;
  let currentKnownPoints = 0;
  let remainingWeightCoeff = 0;

  for (const sub of subjects) {
    totalCoeff += sub.coefficient;
    let knownSum = 0;
    let missingW = 0;
    if (sub.marks.interro !== null) knownSum += sub.marks.interro * 1; else missingW += 1;
    if (sub.marks.dev !== null) knownSum += sub.marks.dev * 1; else missingW += 1;
    if (sub.marks.compo !== null) knownSum += sub.marks.compo * 2; else missingW += 2;
    currentKnownPoints += sub.coefficient * (knownSum / 4);
    remainingWeightCoeff += sub.coefficient * (missingW / 4);
  }

  const requiredAvgRemaining = remainingWeightCoeff > 0 
    ? (targetAvg * totalCoeff - currentKnownPoints) / remainingWeightCoeff
    : null;

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-20">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-6 py-3 safe-area-top">
        <h1 className="text-lg font-black text-foreground">{t("whatIfSimulator")}</h1>
      </div>

      <div className="flex flex-col gap-5 px-6 py-6">
        {/* Live predicted average */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`rounded-2xl p-6 text-center ${statusBg} border-2 border-foreground/10`}
        >
          <TrendingUp className="h-6 w-6 text-primary-foreground mx-auto mb-1" />
          <p className="text-sm font-bold text-primary-foreground opacity-80">{t("simulatedAverage")}</p>
          <p className="text-5xl font-black text-primary-foreground">
            {simulatedAvg !== null ? simulatedAvg.toFixed(1) : "—"}<span className="text-xl opacity-75">/20</span>
          </p>
          
          <div className="mt-4 pt-4 border-t border-primary-foreground/20 flex flex-col gap-1.5">
            <p className="text-sm font-bold text-primary-foreground opacity-90">{t("target")}: {targetAvg}/20</p>
            {requiredAvgRemaining !== null && (
              <p className="text-xs font-black text-primary-foreground bg-primary-foreground/20 py-1.5 px-3 rounded-lg inline-block mx-auto">
                {t("requiredAvgRemaining")}: {Math.max(0, requiredAvgRemaining).toFixed(1)}/20
              </p>
            )}
            {bounds && (
              <p className="text-xs font-bold text-primary-foreground opacity-70 mt-1">
                {t("bestPossible")}: {bounds.max} · {t("worst")}: {bounds.min}
              </p>
            )}
          </div>
        </motion.div>

        {/* Sliders for each empty mark */}
        <div className="flex flex-col gap-3">
          <h3 className="font-black text-foreground text-sm">{t("adjustHypotheticalMarks")}</h3>
          {emptySlots.map((slot, i) => {
            const override = overrides[i];
            if (!override) return null;
            const weight = slot.markType === "compo" ? "×2" : "×1";

            return (
              <motion.div
                key={`${slot.subjectId}-${slot.markType}`}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl bg-card p-3 card-shadow"
              >
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-bold text-foreground">{slot.subjectName}</span>
                    <span className="text-xs font-semibold text-muted-foreground ml-2">
                      {markTypeLabels[slot.markType]} {weight}
                    </span>
                  </div>
                  <span className={`text-sm font-black ${
                    override.value >= 14 ? "text-success" : override.value >= 10 ? "text-warning" : "text-danger"
                  }`}>
                    {override.value.toFixed(1)}/20
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  value={override.value}
                  onChange={(e) => updateOverride(i, parseFloat(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none bg-muted accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                  <span>0</span>
                  <span>10</span>
                  <span>20</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {emptySlots.length === 0 && (
          <div className="rounded-2xl bg-card p-6 card-shadow text-center">
            <p className="font-black text-foreground">{t("allMarksEntered")}</p>
            <p className="text-sm text-muted-foreground font-semibold">{t("nothingToSimulate")}</p>
          </div>
        )}
      </div>
      <TaskBar showBack />
    </div>
  );
};

export default Simulator;
