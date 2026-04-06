import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Check, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { loadState, saveState } from "@/lib/storage";
import { simulateYearlyAverage } from "@/lib/exam-logic";
import { SavedStrategy, StrategyMark } from "@/types/exam";
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
  const targetAvg = state?.targetMin ?? state?.targetAverage ?? 16;
  const { t } = useLanguage();
  const [showSaved, setShowSaved] = useState(false);
  const [activeSlider, setActiveSlider] = useState<number | null>(null);

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

  // Pre-fill sliders from saved strategy if available
  const [overrides, setOverrides] = useState<SliderOverride[]>(() => {
    const saved = state?.savedStrategy;
    return emptySlots.map((s) => {
      const savedMark = saved?.marks.find(
        (m) => m.subjectId === s.subjectId && m.markType === s.markType
      );
      return {
        subjectId: s.subjectId,
        markType: s.markType,
        value: savedMark?.targetValue ?? 10,
      };
    });
  });

  // Track whether user has made any changes since last save
  const [isDirty, setIsDirty] = useState(false);

  const updateOverride = (index: number, value: number) => {
    setOverrides((prev) => prev.map((o, i) => (i === index ? { ...o, value } : o)));
    setIsDirty(true);
  };

  const handleSaveStrategy = () => {
    if (!state || subjects.length === 0) return;
    const strategyMarks: StrategyMark[] = emptySlots.map((slot, i) => ({
      subjectId: slot.subjectId,
      subjectName: slot.subjectName,
      markType: slot.markType,
      targetValue: overrides[i]?.value ?? 10,
    }));
    if (strategyMarks.length === 0) return;
    const simulatedAvgVal = simulateYearlyAverage(subjects, overrides);
    if (simulatedAvgVal === null) return;
    const strategy: SavedStrategy = {
      savedAt: new Date().toISOString(),
      simulatedAverage: simulatedAvgVal,
      marks: strategyMarks,
    };
    saveState({ ...state, savedStrategy: strategy });
    setIsDirty(false);
  };

  const simulatedAvg = simulateYearlyAverage(subjects, overrides);
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

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-20">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-6 py-3 safe-area-top">
        <h1 className="text-lg font-black text-foreground">{t("whatIfSimulator")}</h1>
      </div>

      <div className="flex flex-col gap-5 px-6 py-6">
        {/* Live predicted average — clean hero */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`rounded-2xl p-5 ${statusBg} border-2 border-foreground/10`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-primary-foreground/70 uppercase tracking-wider mb-0.5">{t("simulatedAverage")}</p>
              <p className="text-5xl font-black text-primary-foreground">
                {simulatedAvg !== null ? simulatedAvg.toFixed(1) : "—"}<span className="text-xl opacity-75">/20</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-primary-foreground/70 uppercase tracking-wider mb-0.5">{t("target")}</p>
              <p className="text-2xl font-black text-primary-foreground">{targetAvg}–20</p>
            </div>
          </div>
        </motion.div>

        {/* Sliders grouped by subject */}
        <div className="flex flex-col gap-3">
          <h3 className="font-black text-foreground text-sm">{t("adjustHypotheticalMarks")}</h3>
          {subjects.map((sub) => {
            const subSlots = emptySlots
              .map((slot, i) => ({ slot, i }))
              .filter(({ slot }) => slot.subjectId === sub.id);
            if (subSlots.length === 0) return null;

            return (
              <motion.div
                key={sub.id}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="rounded-xl bg-card border-2 border-border overflow-hidden"
              >
                <div className="px-3 pt-3 pb-1 flex items-center justify-between">
                  <span className="text-sm font-black text-foreground">{sub.name}</span>
                  <span className="text-xs font-bold text-muted-foreground">×{sub.coefficient}</span>
                </div>
                <div className="flex flex-col">
                  {subSlots.map(({ slot, i }) => {
                    const override = overrides[i];
                    if (!override) return null;
                    const weight = slot.markType === "compo" ? "×2" : "×1";
                    return (
                      <div key={slot.markType}>
                        <button
                          onClick={() => setActiveSlider(activeSlider === i ? null : i)}
                          className="w-full flex items-center justify-between px-3 py-2.5 active:bg-muted/40 transition-colors"
                        >
                          <span className="text-xs font-semibold text-muted-foreground">
                            {markTypeLabels[slot.markType]} {weight}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-sm font-black ${
                              override.value >= 14 ? "text-success" : override.value >= 10 ? "text-warning" : "text-danger"
                            }`}>
                              {override.value.toFixed(1)}/20
                            </span>
                            <motion.div animate={{ rotate: activeSlider === i ? 180 : 0 }} transition={{ duration: 0.15 }}>
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            </motion.div>
                          </div>
                        </button>
                        <AnimatePresence>
                          {activeSlider === i && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.18 }}
                              className="overflow-hidden px-3 pb-3"
                            >
                              <input
                                type="range" min="0" max="20" step="0.5"
                                value={override.value}
                                onChange={(e) => updateOverride(i, parseFloat(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none bg-muted accent-primary cursor-pointer"
                              />
                              <div className="flex justify-between text-[10px] font-bold text-muted-foreground mt-1">
                                <span>0</span><span>10</span><span>20</span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>

        {emptySlots.length === 0 && (
          <div className="rounded-2xl bg-card p-6 border-2 border-border text-center">
            <p className="font-black text-foreground">{t("allMarksEntered")}</p>
            <p className="text-sm text-muted-foreground font-semibold">{t("nothingToSimulate")}</p>
          </div>
        )}
      </div>
      <TaskBar showBack action={
        isDirty ? (
          <button
            onClick={handleSaveStrategy}
            className="h-12 px-5 rounded-full bg-secondary border-2 border-foreground card-shadow flex items-center gap-2 font-black text-sm text-foreground active:scale-95 transition-transform"
          >
            <Check className="h-4 w-4" />
            Save
          </button>
        ) : undefined
      } />
    </div>
  );
};

export default Simulator;
