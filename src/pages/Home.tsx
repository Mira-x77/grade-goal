import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Flame, AlertTriangle, ChevronRight, BookOpen, BarChart3, TrendingUp, Settings as SettingsIcon, User, Trophy, FileDown, PenLine, Zap, Plus, X, Check, Clock, ArrowUpRight, Trash2, Pencil, Crown, Bell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { loadState, saveState, getStreak, getHistory, HistoryEntry } from "@/lib/storage";
import { downloadService } from "@/services/downloadService";
import { calcYearlyAverage, getPredictedRange, getAbsoluteBounds } from "@/lib/exam-logic";
import { calcAPCYearlyAverage, getPerformanceAlerts } from "@/lib/grading-apc";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import FrenchClassView from "@/components/FrenchClassView";
import TaskBar from "@/components/TaskBar";
import Mascot from "@/components/Mascot";
import ProductTour from "@/components/ProductTour";
import ResultsScreen from "@/components/ResultsScreen";
import { PaymentSheet } from "@/components/subscription/PaymentSheet";
import { PlanSelectSheet } from "@/components/subscription/PlanSelectSheet";
import { PremiumIntroSheet } from "@/components/subscription/PremiumIntroSheet";
import { SubjectPackSheet } from "@/components/subscription/SubjectPackSheet";
import { Subject } from "@/types/exam";
import { useLanguage } from "@/contexts/LanguageContext";

const markTypeLabels: Record<string, string> = {
  interro: "Interro",
  dev: "Devoir",
  compo: "Compo",
};

const Home = () => {
  const state = loadState();
  const streak = getStreak();
  const history = getHistory();
  const { t } = useLanguage();
  const navigate = useNavigate();

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

  const [showResultsSheet, setShowResultsSheet] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showEditMarksSheet, setShowEditMarksSheet] = useState(false);
  const [showPlanSelect, setShowPlanSelect] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [showPremiumIntro, setShowPremiumIntro] = useState(false);
  const [showSubjectPack, setShowSubjectPack] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [paymentPlan, setPaymentPlan] = useState<"single" | "all">("all");
  const [avgCardVisible, setAvgCardVisible] = useState(true);
  const avgCardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  // Local editable marks state for the edit sheet
  const [editMarksState, setEditMarksState] = useState<Record<string, { interro: string; dev: string; compo: string }>>({});

  const openEditMarksSheet = () => {
    if (!appState) return;
    const initial: Record<string, { interro: string; dev: string; compo: string }> = {};
    appState.subjects.forEach((s) => {
      initial[s.id] = {
        interro: s.marks.interro !== null ? String(s.marks.interro) : "",
        dev: s.marks.dev !== null ? String(s.marks.dev) : "",
        compo: s.marks.compo !== null ? String(s.marks.compo) : "",
      };
    });
    setEditMarksState(initial);
    setShowEditMarksSheet(true);
  };

  const handleSaveEditMarks = () => {
    if (!appState) return;
    const updated = {
      ...appState,
      subjects: appState.subjects.map((s) => {
        const vals = editMarksState[s.id];
        if (!vals) return s;
        const parse = (v: string) => {
          const n = parseFloat(v);
          return !isNaN(n) && n >= 0 && n <= 20 ? n : null;
        };
        return {
          ...s,
          marks: {
            interro: parse(vals.interro),
            dev: parse(vals.dev),
            compo: parse(vals.compo),
          },
        };
      }),
    };
    saveState(updated);
    setAppState(updated);
    setShowEditMarksSheet(false);
  };

  const openMarkSheet = () => {
    setMarkStep("subject");
    setSelectedSubject(null);
    setMarkValue("");
    setMarkType("interro");
    setShowMarkSheet(true);
  };

  const handleSelectSubject = (sub: Subject) => {
    setSelectedSubject(sub);
    // Auto-select the first unfilled mark type, or interro if all filled
    const order: ("interro" | "dev" | "compo")[] = ["interro", "dev", "compo"];
    const nextUnfilled = order.find(t => sub.marks[t] === null) ?? "interro";
    setMarkType(nextUnfilled);
    // Pre-fill value if the auto-selected type already has a value
    const existing = sub.marks[nextUnfilled];
    setMarkValue(existing !== null ? String(existing) : "");
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

  const handleClearStrategy = () => {
    if (!appState) return;
    const updated = { ...appState, savedStrategy: undefined };
    saveState(updated);
    setAppState(updated);
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
  const targetAvg = appState?.targetMin ?? appState?.targetAverage ?? 16;

  useEffect(() => {
    if (!avgCardRef.current) return;

    // Use IntersectionObserver with a negative top rootMargin equal to the header height.
    // We measure the header height once (it's fixed) and set rootMargin so the threshold
    // fires exactly when the card's bottom edge passes behind the header's bottom edge.
    const getHeaderHeight = () => headerRef.current?.getBoundingClientRect().height ?? 0;

    let observer: IntersectionObserver | null = null;

    const setup = () => {
      if (observer) observer.disconnect();
      const headerH = getHeaderHeight();
      observer = new IntersectionObserver(
        ([entry]) => {
          // visible = card bottom is still below the header bottom
          setAvgCardVisible(entry.isIntersecting);
        },
        {
          root: null,
          // Shrink the top of the viewport by the header height so the card is
          // considered "out of view" the moment its bottom crosses the header bottom.
          rootMargin: `-${headerH}px 0px 0px 0px`,
          // threshold 0 = fires as soon as any part enters/leaves the adjusted root
          threshold: 0,
        }
      );
      if (avgCardRef.current) observer.observe(avgCardRef.current);
    };

    // Small delay to let the header render and get its real height
    const raf = requestAnimationFrame(setup);
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [hasData, currentAvg]);

  const alerts = hasData ? getPerformanceAlerts(appState!.subjects, weightedSplit) : [];

  const filledMarks = hasData
    ? appState!.subjects.reduce((acc, s) => {
        return acc + (s.marks.interro !== null ? 1 : 0) + (s.marks.dev !== null ? 1 : 0) + (s.marks.compo !== null ? 1 : 0);
      }, 0)
    : 0;
  const totalMarks = hasData ? appState!.subjects.length * 3 : 0;

  // Recent activity (last 5)
  const recentHistory = history.slice(-5).reverse();

  // Strategy data
  const savedStrategy = appState?.savedStrategy;

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-20">
      {/* Header */}
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-30 max-w-md mx-auto bg-background/80 backdrop-blur-lg border-b border-border px-6 pb-4 safe-area-top">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between pt-2 gap-3"
        >
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-foreground truncate">
              {state?.studentName ? `${t("hey")} ${appState?.studentName}!` : t("scoreTarget")}
            </h1>
            {(appState?.classLevel || appState?.semester) && (
              <p className="text-xs font-bold text-muted-foreground mt-0.5 truncate">
                {[appState?.classLevel, appState?.serie ? `Série ${appState.serie}` : null, appState?.semester].filter(Boolean).join(" · ")}
              </p>
            )}
            <button
              onClick={() => setShowPremiumIntro(true)}
              className="mt-2 flex h-7 items-center gap-1 px-2.5 rounded-lg border-2 border-foreground bg-secondary text-foreground active:scale-95 transition-all card-shadow text-[11px] font-black"
            >
              <Crown className="h-3.5 w-3.5" />
              Unlock Premium
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowNotifications(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-foreground bg-card text-foreground active:scale-95 transition-all card-shadow"
            >
              <Bell className="h-5 w-5" />
            </button>
            <Link to="/profile" className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-foreground bg-card text-foreground active:scale-95 transition-all card-shadow">
              <User className="h-5 w-5" />
            </Link>
          </div>
        </motion.div>

        {/* Sticky mini average bar — appears when card scrolls out of view */}
        <AnimatePresence>
          {hasData && currentAvg !== null && !avgCardVisible && (
            <motion.button
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowResultsSheet(true)}
              className="w-full mt-2 flex items-center justify-between rounded-xl bg-card border border-border px-4 py-2 active:scale-[0.98] transition-transform"
            >
              <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">{t("currentAverage")}</span>
              <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-secondary transition-all"
                    style={{ width: `${Math.min((currentAvg / targetAvg) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-black text-foreground">{currentAvg.toFixed(1)}/20</span>
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-4 px-6 pb-8 pt-[calc(7rem+env(safe-area-inset-top))]">
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
          <button onClick={() => setShowResultsSheet(true)} className="w-full text-left">
          <motion.div
            ref={avgCardRef}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="tour-dashboard rounded-2xl p-5 bg-card border-2 border-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-shadow"
          >
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">{t("currentAverage")}</p>
            <div className="flex items-end justify-between gap-2">
              <div className="flex items-end gap-1">
                <span className="text-5xl font-black text-foreground">{currentAvg.toFixed(1)}</span>
                <span className="text-xl font-bold text-muted-foreground mb-1">/20</span>
              </div>
              <span className="text-xs font-black text-muted-foreground mb-1.5">{t("target")}: {targetAvg}–20</span>
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-muted border border-foreground/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-secondary transition-all"
                style={{ width: `${Math.min((currentAvg / targetAvg) * 100, 100)}%` }}
              />
            </div>
          </motion.div>
          </button>
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

        {/* ═════════ SAVED STRATEGY CARD ═════════ */}
        {hasData && savedStrategy && savedStrategy.marks.length > 0 && (
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-card border-2 border-secondary/40 p-4 relative overflow-hidden"
          >
            {/* Subtle accent stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary via-secondary/60 to-transparent" />

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/15">
                  <Target className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <h3 className="font-black text-foreground text-sm">{t("myStrategy")}</h3>
                  <p className="text-[10px] font-bold text-muted-foreground">
                    {t("projectedAverage")}: {savedStrategy.simulatedAverage.toFixed(1)}/20
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  to="/simulator"
                  className="flex items-center justify-center rounded-lg bg-secondary/15 h-7 w-7 active:scale-95 transition-transform"
                >
                  <Pencil className="h-3.5 w-3.5 text-secondary" />
                </Link>
                <button
                  onClick={handleClearStrategy}
                  className="flex items-center justify-center rounded-lg bg-muted h-7 w-7 text-[10px] font-black text-muted-foreground active:scale-95 transition-transform"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              {savedStrategy.marks.map((sm) => {
                // Check if the actual mark has been entered
                const sub = appState!.subjects.find((s) => s.id === sm.subjectId);
                const actualMark = sub ? sub.marks[sm.markType] : null;
                const isFulfilled = actualMark !== null;

                return (
                  <div
                    key={`${sm.subjectId}-${sm.markType}`}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                      isFulfilled ? "bg-success/10" : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isFulfilled ? (
                        <Check className="h-3.5 w-3.5 text-success flex-shrink-0" />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                      )}
                      <span className={`text-xs font-bold ${isFulfilled ? "text-success line-through" : "text-foreground"}`}>
                        {sm.subjectName}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {markTypeLabels[sm.markType]}
                      </span>
                    </div>
                    <span className={`text-xs font-black ${isFulfilled ? "text-success" : "text-foreground"}`}>
                      {isFulfilled ? `${actualMark!.toFixed(1)}` : `${sm.targetValue.toFixed(1)}`}/20
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Start Planning CTA — new users only */}
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

        {/* Horizontal scroll: Subjects at a glance + Class ranking */}
        {hasData && (
          <div className="overflow-x-auto -mx-6 px-6 pb-2">
            <div className="flex gap-3 items-start" style={{ width: "max-content" }}>
              {/* Card 1 — Subjects at a glance */}
              <div className="rounded-2xl bg-card p-4 border-2 border-border flex-shrink-0" style={{ width: "calc(100vw - 4rem)" }}>
                <h3 className="font-black text-foreground text-sm mb-3">{t("subjectsGlance")}</h3>
                <div className="flex flex-col gap-2">
                  {appState!.subjects.map((sub) => {
                    const marks = [
                      { label: "I", value: sub.marks.interro },
                      { label: "D", value: sub.marks.dev },
                      { label: "C", value: sub.marks.compo },
                    ];
                    const filled = marks.filter(m => m.value !== null).length;
                    const avg = filled > 0
                      ? marks.filter(m => m.value !== null).reduce((a, m) => a + m.value!, 0) / filled
                      : null;
                    return (
                      <div key={sub.id} className="rounded-xl bg-muted/50 px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-foreground">{sub.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground">×{sub.coefficient}</span>
                            <span className="text-sm font-black text-foreground">
                              {avg !== null ? avg.toFixed(1) : "—"}<span className="text-xs font-bold text-muted-foreground">/20</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 mt-1.5">
                          {marks.map((m) => (
                            <div key={m.label} className={`flex-1 rounded-lg py-1 text-center text-[10px] font-black ${m.value !== null ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground/40"}`}>
                              {m.value !== null ? m.value.toFixed(1) : m.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card 2 — Class ranking (no extra wrapper, FrenchClassView has its own cards) */}
              <div className="flex-shrink-0" style={{ width: "calc(100vw - 4rem)" }}>
                <FrenchClassView subjects={appState!.subjects} />
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ RECENT ACTIVITY ═══════════ */}
        {hasData && recentHistory.length > 0 && (
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl bg-card border-2 border-border p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-foreground text-sm">{t("recentActivity")}</h3>
              {history.length > 5 && (
                <button
                  onClick={() => setShowAllActivity(v => !v)}
                  className="text-[10px] font-black text-primary active:scale-95 transition-transform"
                >
                  {showAllActivity ? "Show less" : `See all ${history.length}`}
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {(showAllActivity ? [...history].reverse() : recentHistory).map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <PenLine className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {entry.subjectName} · {markTypeLabels[entry.markType] ?? entry.markType}
                    </p>
                    <p className="text-[10px] font-semibold text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <span className="text-sm font-black text-foreground">{entry.value.toFixed(1)}/20</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══════════ DOWNLOADED PAPERS ═══════════ */}
        {downloadedCount > 0 && (
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Link
              to="/my-downloads"
              className="flex items-center justify-between rounded-2xl bg-card border-2 border-border p-4 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                  <FileDown className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">{downloadedCount} {t("downloadedPapers")}</p>
                  <p className="text-[10px] font-bold text-muted-foreground">{t("viewAll")}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </motion.div>
        )}

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
                    {appState?.subjects.map((sub) => {
                      const allFilled =
                        sub.marks.interro !== null &&
                        sub.marks.dev !== null &&
                        sub.marks.compo !== null;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleSelectSubject(sub)}
                          className="flex items-center justify-between rounded-2xl bg-card border-2 border-foreground px-4 py-3 active:scale-[0.98] transition-transform card-shadow"
                        >
                          <span className="font-black text-foreground">{sub.name}</span>
                          <div className="flex items-center gap-2">
                            {allFilled && (
                              <div className="flex gap-0.5">
                                {[0,1,2].map(i => <div key={i} className="h-1.5 w-1.5 rounded-full bg-success" />)}
                              </div>
                            )}
                            <span className="text-xs font-bold text-muted-foreground">Coeff {sub.coefficient}</span>
                          </div>
                        </button>
                      );
                    })}
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
                    {(["interro", "dev", "compo"] as const).map((type) => {
                      const existingVal = selectedSubject?.marks[type];
                      const isFilled = existingVal !== null && existingVal !== undefined;
                      const isSelected = markType === type;
                      return (
                        <button
                          key={type}
                          onClick={() => {
                            setMarkType(type);
                            if (isFilled) setMarkValue(String(existingVal));
                            else setMarkValue("");
                          }}
                          className={`py-3 px-2 rounded-2xl border-2 text-sm font-black transition-all flex flex-col items-center gap-0.5 ${
                            isSelected
                              ? "bg-secondary border-foreground card-shadow"
                              : isFilled
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-card border-foreground/30 text-muted-foreground"
                          }`}
                        >
                          <span>{type === "interro" ? "Interro" : type === "dev" ? "Devoir" : "Compo"}</span>
                          {isFilled && (
                            <span className={`text-[10px] font-black ${isSelected ? "text-foreground/70" : "text-primary/70"}`}>
                              {Number(existingVal).toFixed(1)}
                            </span>
                          )}
                        </button>
                      );
                    })}
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

      {/* Premium intro → plan select → payment */}
      <PremiumIntroSheet
        open={showPremiumIntro ?? false}
        onClose={() => setShowPremiumIntro(false)}
        onContinue={() => { setShowPremiumIntro(false); setShowPlanSelect(true); }}
      />
      <PlanSelectSheet
        open={showPlanSelect}
        onClose={() => setShowPlanSelect(false)}
        onBack={() => { setShowPlanSelect(false); setShowPremiumIntro(true); }}
        onSelectPack={() => { setShowPlanSelect(false); setShowSubjectPack(true); }}
        onSelectAll={() => { setShowPlanSelect(false); setPaymentPlan("all"); (window as any).__packAmount = undefined; setShowPaymentSheet(true); }}
      />
      <SubjectPackSheet
        open={showSubjectPack}
        onClose={() => setShowSubjectPack(false)}
        onBack={() => { setShowSubjectPack(false); setShowPlanSelect(true); }}
        subjects={appState?.subjects?.map(s => s.name) ?? []}
        onConfirm={(subs, amount) => {
          setSelectedSubjects(subs);
          setPaymentPlan(subs.length >= (appState?.subjects?.length ?? 99) ? "all" : "single");
          setShowSubjectPack(false);
          setShowPaymentSheet(true);
          // store amount for PaymentSheet
          (window as any).__packAmount = amount;
        }}
      />
      <PaymentSheet
        open={showPaymentSheet}
        onClose={() => setShowPaymentSheet(false)}
        onBack={() => {
          setShowPaymentSheet(false);
          if (paymentPlan === "all" && selectedSubjects.length === 0) {
            setShowPlanSelect(true);
          } else {
            setShowSubjectPack(true);
          }
        }}
        onSuccess={() => setShowPaymentSheet(false)}
        subjectName={selectedSubjects.length === 1 ? selectedSubjects[0] : undefined}
        amount={(window as any).__packAmount ?? undefined}
      />

      {/* Results bottom sheet */}
      <AnimatePresence>
        {showResultsSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResultsSheet(false)}
              className="fixed inset-0 z-50 bg-black/50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-background rounded-t-3xl border-t-2 border-x-2 border-foreground overflow-hidden"
              style={{ maxHeight: "92vh" }}
              id="results-sheet"
            >
              {/* Drag handle — touch here to drag the whole sheet */}
              <div
                className="flex justify-center pt-3 pb-2 touch-none cursor-grab active:cursor-grabbing"
                onTouchStart={(e) => {
                  const sheet = document.getElementById("results-sheet") as HTMLElement;
                  if (!sheet) return;
                  const startY = e.touches[0].clientY;
                  let currentY = 0;

                  const onMove = (ev: TouchEvent) => {
                    currentY = Math.max(0, ev.touches[0].clientY - startY);
                    sheet.style.transform = `translateY(${currentY}px)`;
                    sheet.style.transition = "none";
                  };

                  const onEnd = () => {
                    sheet.style.transition = "";
                    if (currentY > window.innerHeight * 0.25) {
                      setShowResultsSheet(false);
                    } else {
                      sheet.style.transform = "";
                    }
                    document.removeEventListener("touchmove", onMove);
                    document.removeEventListener("touchend", onEnd);
                  };

                  document.addEventListener("touchmove", onMove, { passive: true });
                  document.addEventListener("touchend", onEnd);
                }}
              >
                <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: "calc(92vh - 28px)" }}>
                {appState && (
                  <ResultsScreen
                    subjects={appState.subjects}
                    targetAverage={appState.targetMin ?? appState.targetAverage}
                    onBack={() => setShowResultsSheet(false)}
                    onEditMarks={() => { setShowResultsSheet(false); openEditMarksSheet(); }}
                  />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Edit Marks bottom sheet */}
      <AnimatePresence>
        {showEditMarksSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditMarksSheet(false)}
              className="fixed inset-0 z-50 bg-black/50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-background rounded-t-3xl border-t-2 border-x-2 border-foreground overflow-hidden"
              style={{ maxHeight: "92vh" }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-border">
                <button onClick={() => setShowEditMarksSheet(false)}>
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
                <h2 className="text-lg font-black text-foreground">Edit Marks</h2>
                <button
                  onClick={handleSaveEditMarks}
                  className="rounded-xl bg-secondary border-2 border-foreground px-4 py-1.5 text-sm font-black text-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all"
                >
                  Done
                </button>
              </div>

              {/* Subject list */}
              <div className="overflow-y-auto px-6 py-4 flex flex-col gap-4" style={{ maxHeight: "calc(92vh - 100px)" }}>
                {appState?.subjects.map((sub) => {
                  const vals = editMarksState[sub.id] ?? { interro: "", dev: "", compo: "" };
                  const rows: { key: "interro" | "dev" | "compo"; label: string }[] = [
                    { key: "interro", label: "Interro" },
                    { key: "dev", label: "Devoir" },
                    { key: "compo", label: "Compo" },
                  ];
                  return (
                    <div key={sub.id} className="rounded-2xl bg-card border-2 border-foreground card-shadow p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-black text-foreground">{sub.name}</span>
                        <span className="text-xs font-bold text-muted-foreground">Coeff {sub.coefficient}</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {rows.map(({ key, label }) => (
                          <div key={key} className="flex items-center justify-between gap-3">
                            <span className="text-sm font-bold text-muted-foreground w-16">{label}</span>
                            <span className="text-sm font-bold text-foreground/40 flex-1 text-right pr-2">
                              {vals[key] === "" ? "—" : `${vals[key]}/20`}
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={20}
                              step={0.25}
                              placeholder="—"
                              value={vals[key]}
                              onChange={(e) =>
                                setEditMarksState((prev) => ({
                                  ...prev,
                                  [sub.id]: { ...prev[sub.id], [key]: e.target.value },
                                }))
                              }
                              className="w-20 rounded-xl border-2 border-foreground bg-background px-3 py-2 text-sm font-black text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-secondary text-center"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Notifications bottom sheet */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 z-50 bg-black/50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-background rounded-t-3xl border-t-2 border-x-2 border-foreground"
              style={{ maxHeight: "75vh" }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
              </div>
              <div className="flex items-center justify-between px-6 py-3 border-b border-border">
                <h2 className="text-lg font-black text-foreground">{t("notifications")}</h2>
                <button onClick={() => setShowNotifications(false)}>
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex flex-col items-center justify-center px-8 py-16 gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted border-2 border-border">
                  <Bell className="h-9 w-9 text-muted-foreground/50" />
                </div>
                <div className="text-center">
                  <p className="font-black text-foreground text-base">{t("allQuiet")}</p>
                  <p className="text-sm font-semibold text-muted-foreground mt-1 leading-relaxed">
                    {t("notificationsDesc")}
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;

