import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { loadState, saveState } from "@/lib/storage";
import { simulateYearlyAverage, fmtFinalAvg, getRounding } from "@/lib/exam-logic";
import { SavedStrategy, StrategyMark } from "@/types/exam";
import TaskBar from "@/components/TaskBar";
import ScreenIntro from "@/components/ScreenIntro";
import ScreenTour from "@/components/ScreenTour";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { usePremiumNudge } from "@/hooks/usePremiumNudge";
import { PremiumIntroSheet } from "@/components/subscription/PremiumIntroSheet";
import { PlanSelectSheet } from "@/components/subscription/PlanSelectSheet";
import { PaymentSheet } from "@/components/subscription/PaymentSheet";
import { SubjectPackSheet } from "@/components/subscription/SubjectPackSheet";
import { nudgeSubtext } from "@/hooks/usePremiumNudge";
import { useAppConfig } from "@/contexts/AppConfigContext";

interface SliderOverride {
  subjectId: string;
  markType: "interro" | "dev" | "compo";
  value: number;
}

const markTypeLabels: Record<string, string> = {
  interro: "Interro",
  dev: "Devoir",
  compo: "Compo",
};

const markWeights: Record<string, string> = {
  interro: "×1",
  dev: "×1",
  compo: "×2",
};

const Simulator = () => {
  const state = loadState();
  const subjects = state?.subjects ?? [];
  const targetAvg = state?.targetMin ?? state?.targetAverage ?? 16;
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { premiumEnabled: PREMIUM_ENABLED } = useAppConfig();
  const [activeSlider, setActiveSlider] = useState<number | null>(null);

  // Premium nudge
  const [activeNudge, setActiveNudge] = useState(false);
  const [showPlanSelect, setShowPlanSelect] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [showSubjectPack, setShowSubjectPack] = useState(false);
  const { fire: fireNudge } = usePremiumNudge(() => setActiveNudge(true));

  // Refs for fixed header + dynamic padding (same fix as LibraryDirect)
  const heroRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(80);

  useEffect(() => {
    if (!headerRef.current) return;
    const ro = new ResizeObserver(() => {
      setHeaderHeight(headerRef.current?.getBoundingClientRect().height ?? 0);
    });
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

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

  const [overrides, setOverrides] = useState<SliderOverride[]>(() => {
    const saved = state?.savedStrategy;
    return emptySlots.map((s) => {
      const savedMark = saved?.marks.find(
        (m) => m.subjectId === s.subjectId && m.markType === s.markType
      );
      return { subjectId: s.subjectId, markType: s.markType, value: savedMark?.targetValue ?? targetAvg };
    });
  });

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
      targetValue: overrides[i]?.value ?? targetAvg,
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
    toast.success(t("strategySavedNavigating"));
    // Fire strategy_saved nudge after a short delay (let toast show first)
    setTimeout(() => fireNudge("strategy_saved"), 1200);
    setTimeout(() => navigate("/", { replace: true }), 800);
  };

  const simulatedAvg = simulateYearlyAverage(subjects, overrides);
  const isBelow = simulatedAvg !== null && simulatedAvg < targetAvg - 2;
  const isRisky = simulatedAvg !== null && simulatedAvg >= targetAvg - 2 && simulatedAvg < targetAvg;
  const isOnTrack = simulatedAvg !== null && simulatedAvg >= targetAvg;

  const statusBg = isOnTrack ? "bg-success" : isRisky ? "bg-warning" : "bg-danger";
  const statusHint = !isDirty
    ? null
    : isBelow
    ? t("raiseScoresHint")
    : isRisky
    ? t("almostThereHint")
    : t("onTrackHint");

  // IntersectionObserver — re-runs whenever header height changes (compact bar toggling)
  useEffect(() => {
    if (!heroRef.current) return;
    let observer: IntersectionObserver | null = null;
    const setup = () => {
      if (observer) observer.disconnect();
      observer = new IntersectionObserver(
        ([entry]) => setHeroVisible(entry.isIntersecting),
        { root: null, rootMargin: `-${headerHeight}px 0px 0px 0px`, threshold: 0 }
      );
      if (heroRef.current) observer.observe(heroRef.current);
    };
    const raf = requestAnimationFrame(setup);
    return () => { cancelAnimationFrame(raf); observer?.disconnect(); };
  }, [headerHeight]);

  if (subjects.length === 0) {
    return (
      <div className="min-h-screen bg-background w-full flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-lg font-black text-foreground">{t("noSubjectsYet")}</p>
        <Link to="/planner" className="rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground">
          {t("startPlanningAction")}
        </Link>
      </div>
    );
  }

  const compactBarColor = isOnTrack ? "bg-success" : isRisky ? "bg-warning" : "bg-danger";

  return (
    <motion.div
      className="min-h-screen bg-background w-full pb-20"
      initial={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Fixed header */}
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border pb-3 safe-area-top">
        <div className="header-inner pt-3">
          <h1 className="text-lg font-black text-foreground">{t("whatIfSimulator")}</h1>

        {/* Compact avg bar — appears when hero scrolls out */}
        <AnimatePresence>
          {!heroVisible && simulatedAvg !== null && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={`mt-2 w-full flex flex-col gap-1 rounded-xl ${compactBarColor} px-4 py-2`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-primary-foreground/80 uppercase tracking-widest">{t("simulatedAverage")}</span>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-1.5 rounded-full bg-black/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white/70 transition-all"
                      style={{ width: `${Math.min((simulatedAvg / targetAvg) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-black text-primary-foreground">{fmtFinalAvg(simulatedAvg, getRounding())}/20</span>
                </div>
              </div>
              {!isOnTrack && isDirty && (
                <p className="text-[10px] font-bold text-primary-foreground/80 leading-tight">
                  {isRisky ? t("almostThereHint") : t("raiseScoresHint")}
                </p>
              )}
              {isOnTrack && isDirty && (
                <p className="text-[10px] font-bold text-primary-foreground/80 leading-tight">
                  {t("onTrackHint")}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </div>{/* /header-inner */}
      </div>

      <div className="content-col flex flex-col gap-5 py-6" style={{ paddingTop: headerHeight + 24 }}>
        {/* Hero card */}
        <div ref={heroRef} className="tour-simulator-hero">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`rounded-2xl p-5 ${statusBg} border-2 border-foreground/10`}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold text-primary-foreground/70 uppercase tracking-wider mb-0.5">{t("simulatedAverage")}</p>
                <p className="text-5xl font-black text-primary-foreground">
                  {simulatedAvg !== null ? fmtFinalAvg(simulatedAvg, getRounding()) : "—"}<span className="text-xl opacity-75">/20</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-primary-foreground/70 uppercase tracking-wider mb-0.5">{t("target")}</p>
                <p className="text-2xl font-black text-primary-foreground">{targetAvg}–20</p>
              </div>
            </div>
            {statusHint && (
              <div className="rounded-xl bg-black/15 px-3 py-2 mt-3">
                <p className="text-xs font-semibold text-primary-foreground/90">{statusHint}</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Sliders grouped by subject */}
        <div className="tour-simulator-sliders flex flex-col gap-3">
          <h3 className="font-black text-foreground text-sm">{t("planYourScores")}</h3>
          {[...subjects].sort((a, b) => a.name.localeCompare(b.name)).map((sub) => {
            const subSlots = emptySlots
              .map((slot, i) => ({ slot, i }))
              .filter(({ slot }) => slot.subjectId === sub.id);
            if (subSlots.length === 0) return null;

            return (
              <motion.div
                key={sub.id}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="rounded-2xl bg-card border-2 border-foreground overflow-hidden card-shadow"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b-2 border-foreground/10 bg-muted/30">
                  <span className="text-sm font-black text-foreground">{sub.name}</span>
                  <span className="text-xs font-black text-foreground bg-secondary/30 px-2 py-0.5 rounded-full">×{sub.coefficient}</span>
                </div>

                <div className="flex flex-col divide-y divide-border">
                  {subSlots.map(({ slot, i }) => {
                    const override = overrides[i];
                    if (!override) return null;
                    const isActive = activeSlider === i;
                    const scoreColor = override.value >= targetAvg ? "text-success" : override.value >= 10 ? "text-warning" : "text-danger";

                    return (
                      <div key={slot.markType}>
                        <button
                          onClick={() => setActiveSlider(isActive ? null : i)}
                          className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${isActive ? "bg-secondary/10" : "active:bg-muted/40"}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-foreground">{markTypeLabels[slot.markType]}</span>
                            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{markWeights[slot.markType]}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-base font-black ${scoreColor}`}>
                              {override.value.toFixed(1)}<span className="text-xs text-muted-foreground">/20</span>
                            </span>
                            <motion.div animate={{ rotate: isActive ? 180 : 0 }} transition={{ duration: 0.15 }}>
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </motion.div>
                          </div>
                        </button>
                        <AnimatePresence>
                          {isActive && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.18 }}
                              className="overflow-hidden px-4 pb-4 bg-secondary/5"
                            >
                              <input
                                type="range" min="0" max="20" step="0.5"
                                value={override.value}
                                onChange={(e) => updateOverride(i, parseFloat(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none bg-muted accent-primary cursor-pointer mt-2"
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

      <ScreenIntro
        screenKey="simulator"
        title={t("simIntroTitle")}
        description={t("simIntroDesc")}
        mascotPose="thinking"
        ctaLabel={t("simIntroCta")}
      />

      <ScreenTour
        storageKey="scoretarget_tour_simulator"
        introKey="simulator"
        delay={1000}
        steps={[
          { target: ".tour-simulator-hero", titleKey: "tourSimulatorHeroTitle", contentKey: "tourSimulatorHeroContent", duration: 4500 },
          { target: ".tour-simulator-sliders", titleKey: "tourSimulatorSlidersTitle", contentKey: "tourSimulatorSlidersContent", duration: 4500, actionKey: "tourSimulatorSlidersAction" },
        ]}
      />

      <TaskBar showBack action={
        isDirty ? (
          isOnTrack ? (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, x: -16 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, x: -16 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              onClick={handleSaveStrategy}
              className="h-12 w-12 rounded-full bg-secondary border-2 border-foreground card-shadow flex items-center justify-center active:scale-95 transition-transform"
            >
              <Save className="h-5 w-5 text-foreground" />
            </motion.button>
          ) : (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, x: -16 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, x: -16 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              onClick={() => toast(t("reachTargetFirst"))}
              className="h-12 w-12 rounded-full bg-muted border-2 border-border flex items-center justify-center opacity-50 active:scale-95 transition-transform"
            >
              <Save className="h-5 w-5 text-muted-foreground" />
            </motion.button>
          )
        ) : undefined
      } />

      {/* Contextual premium nudge sheets */}
      <>
          <PremiumIntroSheet
            open={activeNudge}
            nudgeSubtext={nudgeSubtext("strategy_saved", language as "en" | "fr")}
            onClose={() => setActiveNudge(false)}
            onContinue={() => { setActiveNudge(false); setShowPlanSelect(true); }}
          />
          <PlanSelectSheet
            open={showPlanSelect}
            onClose={() => setShowPlanSelect(false)}
            onBack={() => { setShowPlanSelect(false); setActiveNudge(true); }}
            onSelectPack={() => { setShowPlanSelect(false); setShowSubjectPack(true); }}
            onSelectAll={() => { setShowPlanSelect(false); setShowPaymentSheet(true); }}
          />
          <SubjectPackSheet
            open={showSubjectPack}
            onClose={() => setShowSubjectPack(false)}
            onBack={() => { setShowSubjectPack(false); setShowPlanSelect(true); }}
            subjects={subjects.map(s => s.name)}
            onConfirm={() => { setShowSubjectPack(false); setShowPaymentSheet(true); }}
          />
          <PaymentSheet
            open={showPaymentSheet}
            onClose={() => setShowPaymentSheet(false)}
            onBack={() => { setShowPaymentSheet(false); setShowPlanSelect(true); }}
            onSuccess={() => setShowPaymentSheet(false)}
          />
        </>
    </motion.div>
  );
};

export default Simulator;
