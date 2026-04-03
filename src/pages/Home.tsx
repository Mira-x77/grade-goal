import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Flame, AlertTriangle, ChevronRight, BookOpen, BarChart3, TrendingUp, Settings as SettingsIcon, User, Trophy, FileDown, PenLine, Zap, Plus, X, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { loadState, saveState, getStreak, getHistory } from "@/lib/storage";
import { downloadService } from "@/services/downloadService";
import { calcYearlyAverage, getPredictedRange, getAbsoluteBounds } from "@/lib/exam-logic";
import { calcAPCYearlyAverage, getPerformanceAlerts } from "@/lib/grading-apc";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import FrenchClassView from "@/components/FrenchClassView";
import TaskBar from "@/components/TaskBar";
import Mascot from "@/components/Mascot";
import ProductTour from "@/components/ProductTour";
import { Subject } from "@/types/exam";
import { useLanguage } from "@/contexts/LanguageContext";

const Home = () => {
  const state = loadState();
  const streak = getStreak();
  const history = getHistory();
  const { t } = useLanguage();

  const [downloadedCount, setDownloadedCount] = useState(0);
  const [appState, setAppState] = useState(state);

  const hasData = appState && appState.subjects.length > 0;
  const gradingSystem = appState?.settings?.gradingSystem ?? "apc";
  const weightedSplit = appState?.settings?.apcWeightedSplit ?? false;

  // Mark entry flow
  const [showMarkSheet, setShowMarkSheet] = useState(false);
  const [markStep, setMarkStep] = useState<"subject" | "score">("subject");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [markType, setMarkType] = useState<"interro" | "dev" | "compo">("interro");
  const [markValue, setMarkValue] = useState("");

  const openMarkSheet = () => {
    setMarkStep("subject");
    setSelectedSubject(null);
    setMarkValue("");
    setMarkType("interro");
    setShowMarkSheet(true);
  };

  const handleSelectSubject = (sub: Subject) => {
    setSelectedSubject(sub);
    setMarkStep("score");
  };

  const handleSaveMark = () => {
    const val = parseFloat(markValue);
    if (isNaN(val) || val < 0 || val > 20 || !selectedSubject || !appState) return;
    const updated = {
      ...appState,
      subjects: appState.subjects.map((s) =>
        s.id === selectedSubject.id
          ? { ...s, marks: { ...s.marks, [markType]: val } }
          : s
      ),
    };
    saveState(updated);
    setAppState(updated);
    setShowMarkSheet(false);
  };

  useEffect(() => {
    downloadService.getDownloadedPapers().then((papers) => setDownloadedCount(papers.length));
  }, []);

  const currentAvg = hasData
    ? gradingSystem === "apc"
      ? calcAPCYearlyAverage(appState!.subjects, weightedSplit)
      : calcYearlyAverage(appState!.subjects)
    : null;
  const range = hasData ? getPredictedRange(appState!.subjects) : null;
  const bounds = hasData ? getAbsoluteBounds(appState!.subjects) : null;
  const targetAvg = appState?.targetAverage ?? 16;

  const alerts = hasData ? getPerformanceAlerts(appState!.subjects, weightedSplit) : [];

  const filledMarks = hasData
    ? appState!.subjects.reduce((acc, s) => {
        return acc + (s.marks.interro !== null ? 1 : 0) + (s.marks.dev !== null ? 1 : 0) + (s.marks.compo !== null ? 1 : 0);
      }, 0)
    : 0;
  const totalMarks = hasData ? appState!.subjects.length * 3 : 0;

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-20">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-30 max-w-md mx-auto bg-background px-6 pb-4 safe-area-top">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-black text-foreground">
              {state?.studentName ? `${t("hey")} ${appState?.studentName}!` : t("scoreTarget")}
            </h1>
            {(appState?.classLevel || appState?.semester) && (
              <p className="text-xs font-bold text-muted-foreground mt-0.5">
                {[appState?.classLevel, appState?.serie ? `Série ${appState.serie}` : null, appState?.semester].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/profile" className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-foreground bg-card text-foreground active:scale-95 transition-all card-shadow">
              <User className="h-5 w-5" />
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="flex flex-col gap-4 px-6 pb-8 pt-28">
        {/* Performance Alerts */}
        {alerts.length > 0 && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-2xl bg-danger/15 p-4 border-2 border-danger/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-danger" />
              <span className="text-sm font-black text-danger">{t("performanceAlert")}</span>
            </div>
            {alerts.map((a) => (
              <p key={a.subject.id} className="text-xs font-bold text-danger/80 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" /> {a.subject.name} (Coeff {a.subject.coefficient}): {a.avg.toFixed(1)}/20 — {t("belowThreshold")}
              </p>
            ))}
          </motion.div>
        )}

        {/* Current status hero — only show when there's data */}
        {hasData && currentAvg !== null && (
          <Link to="/planner?step=results">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="tour-dashboard rounded-2xl p-5 bg-card border-2 border-foreground card-shadow active:scale-[0.98] transition-transform"
          >
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">{t("currentAverage")}</p>
            <div className="flex items-end justify-between gap-2">
              <div className="flex items-end gap-1">
                <span className="text-5xl font-black text-foreground">{currentAvg.toFixed(1)}</span>
                <span className="text-xl font-bold text-muted-foreground mb-1">/20</span>
              </div>
              <span className="text-xs font-black text-muted-foreground mb-1.5">{t("target")}: {targetAvg}/20</span>
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-muted border border-foreground/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-secondary transition-all"
                style={{ width: `${Math.min((currentAvg / targetAvg) * 100, 100)}%` }}
              />
            </div>
          </motion.div>
          </Link>
        )}

        {/* Empty state mascot — no data yet */}
        {!hasData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 py-6"
          >
            <Mascot pose="pointing" size={100} animate />
            <p className="text-sm font-black text-foreground">Start by setting up your subjects!</p>
          </motion.div>
        )}

        {/* Dual View Toggle */}
        {hasData && (
          <Tabs defaultValue={gradingSystem === "apc" ? "weighted" : "ranking"} className="w-full">
            <TabsList className="w-full rounded-xl bg-muted h-11">
              <TabsTrigger value="weighted" className="flex-1 rounded-lg font-bold text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <BarChart3 className="h-3.5 w-3.5 mr-1" /> {t("weightedView")}
              </TabsTrigger>
              <TabsTrigger value="ranking" className="flex-1 rounded-lg font-bold text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <Trophy className="h-3.5 w-3.5 mr-1" /> {t("classRanking")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="weighted">
              <div className="flex flex-col gap-4 mt-2">
                {/* Predicted range */}
                {range && (
                  <motion.div
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="rounded-2xl bg-card p-4 border-2 border-border"
                  >
                    <h3 className="font-black text-foreground text-sm mb-2">{t("realisticRange")}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-danger">{range.min}</span>
                      <div className="flex-1 mx-3 h-2.5 rounded-full bg-muted relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-danger via-warning to-success rounded-full" />
                      </div>
                      <span className="text-sm font-bold text-success">{range.max}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-semibold text-center mt-1">
                      {filledMarks}/{totalMarks} {t("marksEntered")}
                    </p>
                  </motion.div>
                )}

                {/* Subject quick view */}
                <motion.div
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-2xl bg-card p-4 border-2 border-border"
                >
                  <h3 className="font-black text-foreground text-sm mb-3">{t("subjectsGlance")}</h3>
                  <div className="flex flex-col gap-2">
                    {appState!.subjects.map((sub) => {
                      const filled = (sub.marks.interro !== null ? 1 : 0) + (sub.marks.dev !== null ? 1 : 0) + (sub.marks.compo !== null ? 1 : 0);
                      return (
                        <div key={sub.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                          <span className="text-sm font-bold text-foreground">{sub.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground">Coeff {sub.coefficient}</span>
                            <div className="flex gap-0.5">
                              {[sub.marks.interro, sub.marks.dev, sub.marks.compo].map((m, i) => (
                                <div key={i} className={`h-2 w-2 rounded-full ${m !== null ? "bg-primary" : "bg-muted-foreground/30"}`} />
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="ranking">
              <div className="mt-2">
                <FrenchClassView subjects={appState!.subjects} />
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Quick actions */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-3"
        >
          {/* Show Start Planning always for new users, Continue Planning only if no marks yet */}
          {(!hasData || filledMarks === 0) && (
            <Link to="/planner" className="block">
              <div className="rounded-2xl bg-secondary border-2 border-foreground p-4 card-shadow flex items-center gap-4 active:translate-y-0.5 active:shadow-none transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-foreground bg-card">
                  <Target className="h-6 w-6 text-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-foreground">
                    {hasData ? t("continuePlanning") : t("startPlanningAction")}
                  </h3>
                  <p className="text-xs font-semibold text-foreground/60">{t("setTargetAddSubjects")}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-foreground" />
              </div>
            </Link>
          )}


        </motion.div>

      </div>

      <TaskBar action={
        hasData ? (
          <div className="relative">
            <div className="absolute bottom-full mb-3 left-0">
              <Link
                to="/simulator"
                title={t("whatIfSimulator")}
                className="tour-strategizer h-12 w-12 rounded-full bg-card border-2 border-foreground card-shadow flex items-center justify-center active:scale-95 transition-transform"
              >
                <TrendingUp className="h-6 w-6 text-foreground" />
              </Link>
            </div>
            <button
              onClick={openMarkSheet}
              className="tour-add-mark h-12 w-12 rounded-full bg-secondary border-2 border-foreground card-shadow flex items-center justify-center active:scale-95 transition-transform"
            >
              <Plus className="h-6 w-6 text-foreground" />
            </button>
          </div>
        ) : undefined
      } />

      {/* Mark entry bottom sheet */}
      <AnimatePresence>
        {showMarkSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMarkSheet(false)}
              className="fixed inset-0 z-50 bg-black/40"
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-background rounded-t-3xl border-t-2 border-x-2 border-foreground p-6 pb-10"
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-foreground/20 mx-auto mb-5" />

              {markStep === "subject" ? (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-black">Which subject?</h2>
                    <button onClick={() => setShowMarkSheet(false)}>
                      <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                    {appState?.subjects.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => handleSelectSubject(sub)}
                        className="flex items-center justify-between rounded-2xl bg-card border-2 border-foreground px-4 py-3 active:scale-[0.98] transition-transform card-shadow"
                      >
                        <span className="font-black text-foreground">{sub.name}</span>
                        <span className="text-xs font-bold text-muted-foreground">Coeff {sub.coefficient}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-5">
                    <button onClick={() => setMarkStep("subject")} className="text-muted-foreground">
                      <X className="h-5 w-5" />
                    </button>
                    <h2 className="text-xl font-black">{selectedSubject?.name}</h2>
                  </div>

                  {/* Mark type selector */}
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {(["interro", "dev", "compo"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setMarkType(type)}
                        className={`py-3 rounded-2xl border-2 text-sm font-black transition-all ${
                          markType === type
                            ? "bg-secondary border-foreground"
                            : "bg-card border-foreground/30 text-muted-foreground"
                        }`}
                      >
                        {type === "interro" ? "Interro" : type === "dev" ? "Devoir" : "Compo"}
                      </button>
                    ))}
                  </div>

                  {/* Score input */}
                  <div className="relative mb-5">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={0.25}
                      placeholder="Score (0–20)"
                      value={markValue}
                      onChange={(e) => setMarkValue(e.target.value)}
                      className="w-full rounded-2xl border-2 border-foreground bg-card px-4 py-4 text-2xl font-black text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-secondary"
                      autoFocus
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground">/20</span>
                  </div>

                  <button
                    onClick={handleSaveMark}
                    disabled={!markValue || parseFloat(markValue) < 0 || parseFloat(markValue) > 20}
                    className="w-full rounded-2xl bg-secondary border-2 border-foreground py-4 font-black text-foreground flex items-center justify-center gap-2 card-shadow active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Check className="h-5 w-5" />
                    Save Mark
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ProductTour />
    </div>
  );
};

export default Home;
