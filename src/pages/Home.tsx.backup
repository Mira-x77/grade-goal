import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Flame, AlertTriangle, ChevronRight, ChevronDown, BookOpen, BarChart3, TrendingUp, Settings as SettingsIcon, User, Trophy, FileDown, PenLine, Zap, Plus, X, Check, Clock, ArrowUpRight, Trash2, Pencil, Crown, Bell, ArrowLeft, Lightbulb, GraduationCap } from "lucide-react";
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
import OnboardingChecklist from "@/components/OnboardingChecklist";
import ResultsScreen from "@/components/ResultsScreen";
import { PaymentSheet } from "@/components/subscription/PaymentSheet";
import { PlanSelectSheet } from "@/components/subscription/PlanSelectSheet";
import { PremiumIntroSheet } from "@/components/subscription/PremiumIntroSheet";
import { SubjectPackSheet } from "@/components/subscription/SubjectPackSheet";
import { Subject } from "@/types/exam";
import { NigerianState, NigerianSemester, NigerianCourse } from "@/types/nigerian";
import { useLanguage } from "@/contexts/LanguageContext";
import NigerianAssessmentSheet from "@/components/NigerianAssessmentSheet";
import { useIsTablet } from "@/hooks/useIsTablet";
import { usePremiumNudge, nudgeSubtext, NudgeTrigger } from "@/hooks/usePremiumNudge";
import {
  scoreToGrade,
  computeGP,
  computeSemesterGPA,
  computeCGPA,
  classifyDegree,
  validateScore,
  validateCreditUnits,
  computeIntegratedSubjectScore,
} from "@/lib/grading-nigerian";

const markTypeLabels: Record<string, string> = {
  interro: "Interro",
  dev: "Devoir",
  compo: "Compo",
};

// ── Nigerian helpers (inline, no separate screen) ─────────────────────────────

function recomputeNigerianState(state: NigerianState): NigerianState {
  const semesters = state.semesters.map((sem) => {
    const courses = sem.courses.map((c) => {
      const { letter, points } = scoreToGrade(c.score);
      return { ...c, letter, gradePoints: points, gp: computeGP(c.score, c.creditUnits) };
    });
    return { ...sem, courses, gpa: computeSemesterGPA(courses) };
  });
  const cgpa = computeCGPA(semesters);
  return { ...state, semesters, cgpa, classOfDegree: classifyDegree(cgpa) };
}

function NigerianSemesterCard({
  semester, index, onAddCourse, onRemoveCourse,
}: {
  semester: NigerianSemester;
  index: number;
  onAddCourse: (semId: string, name: string, cu: number, score: number) => void;
  onRemoveCourse: (semId: string, courseId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [name, setName] = useState("");
  const [cu, setCu] = useState("");
  const [score, setScore] = useState("");
  const [scoreErr, setScoreErr] = useState<string | null>(null);
  const [cuErr, setCuErr] = useState<string | null>(null);

  const canAdd = name.trim().length > 0 && cu !== "" && score !== "" && !scoreErr && !cuErr;

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-2xl bg-card border-2 border-border overflow-hidden"
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 active:bg-muted/40 transition-colors"
      >
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{semester.sessionLabel}</span>
          <span className="text-sm font-black text-foreground">{semester.name}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">GPA</span>
            <span className="text-lg font-black text-foreground leading-none">{semester.gpa.toFixed(2)}</span>
          </div>
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
            <div className="border-t border-border px-4 pt-3 pb-4 flex flex-col gap-3">
              {semester.courses.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center px-1 mb-0.5">
                    <span className="flex-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Course</span>
                    <span className="w-8 text-center text-[9px] font-black text-muted-foreground uppercase">CU</span>
                    <span className="w-10 text-center text-[9px] font-black text-muted-foreground uppercase">Score</span>
                    <span className="w-8 text-center text-[9px] font-black text-muted-foreground uppercase">Grade</span>
                    <span className="w-8 text-center text-[9px] font-black text-muted-foreground uppercase">GP</span>
                    <span className="w-8" />
                  </div>
                  <AnimatePresence>
                    {semester.courses.map((course) => (
                      <motion.div
                        key={course.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        className="flex items-center rounded-xl bg-muted/50 px-3 py-2 gap-1"
                      >
                        <span className="flex-1 text-sm font-bold text-foreground truncate">{course.name}</span>
                        <span className="w-8 text-center text-xs font-bold text-muted-foreground">{course.creditUnits}</span>
                        <span className="w-10 text-center text-xs font-bold text-foreground">{course.score}</span>
                        <span className={`w-8 text-center text-xs font-black ${
                          course.letter === "A" ? "text-success" : course.letter === "B" ? "text-primary"
                          : course.letter === "C" ? "text-warning" : course.letter === "F" ? "text-danger" : "text-muted-foreground"
                        }`}>{course.letter}</span>
                        <span className="w-8 text-center text-xs font-bold text-foreground">{course.gp}</span>
                        <button
                          onClick={() => onRemoveCourse(semester.id, course.id)}
                          className="w-8 flex items-center justify-center text-destructive/50 hover:text-destructive active:scale-90 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
              {/* Inline add-course form */}
              <div className="rounded-2xl bg-muted/40 border-2 border-dashed border-border p-3 flex flex-col gap-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Add Course</p>
                <input
                  type="text" placeholder="Course name" value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-xl border-2 border-border bg-card px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number" placeholder="Units (1–6)" value={cu} min={1} max={6}
                      onChange={e => { setCu(e.target.value); setCuErr(validateCreditUnits(Math.floor(Number(e.target.value)))); }}
                      className={`w-full rounded-xl border-2 bg-card px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${cuErr ? "border-danger" : "border-border focus:border-primary"}`}
                    />
                    {cuErr && <p className="text-[10px] font-bold text-danger mt-0.5 px-1">{cuErr}</p>}
                  </div>
                  <div className="flex-1">
                    <input
                      type="number" placeholder="Score (0–100)" value={score} min={0} max={100}
                      onChange={e => { setScore(e.target.value); setScoreErr(validateScore(Math.floor(Number(e.target.value)))); }}
                      className={`w-full rounded-xl border-2 bg-card px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${scoreErr ? "border-danger" : "border-border focus:border-primary"}`}
                    />
                    {scoreErr && <p className="text-[10px] font-bold text-danger mt-0.5 px-1">{scoreErr}</p>}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!canAdd) return;
                    onAddCourse(semester.id, name.trim(), Math.floor(Number(cu)), Math.floor(Number(score)));
                    setName(""); setCu(""); setScore(""); setScoreErr(null); setCuErr(null);
                  }}
                  disabled={!canAdd}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-extrabold text-primary-foreground active:scale-95 transition-transform disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Plus className="h-4 w-4" /> Add Course
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function NigerianAddSemesterButton({ onAdd }: { onAdd: (sessionLabel: string, name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [sessionLabel, setSessionLabel] = useState("");
  const [semName, setSemName] = useState("");
  const canSubmit = sessionLabel.trim().length > 0 && semName.trim().length > 0;

  if (!open) {
    return (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 py-3.5 text-sm font-extrabold text-primary active:scale-[0.98] transition-all"
      >
        <Plus className="h-4 w-4" /> Add Semester
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border-2 border-primary/40 p-4 flex flex-col gap-3"
    >
      <p className="text-sm font-black text-foreground">New Semester</p>
      <input
        type="text" placeholder="Session (e.g. 2023/2024)" value={sessionLabel}
        onChange={e => setSessionLabel(e.target.value)} autoFocus
        className="w-full rounded-xl border-2 border-border bg-muted px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
      />
      <input
        type="text" placeholder="Semester name (e.g. First Semester)" value={semName}
        onChange={e => setSemName(e.target.value)}
        onKeyDown={e => e.key === "Enter" && canSubmit && (onAdd(sessionLabel.trim(), semName.trim()), setOpen(false), setSessionLabel(""), setSemName(""))}
        className="w-full rounded-xl border-2 border-border bg-muted px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
      />
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 rounded-xl border-2 border-border py-2.5 text-sm font-extrabold text-foreground active:scale-95 transition-transform">Cancel</button>
        <button
          onClick={() => { if (!canSubmit) return; onAdd(sessionLabel.trim(), semName.trim()); setOpen(false); setSessionLabel(""); setSemName(""); }}
          disabled={!canSubmit}
          className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-extrabold text-primary-foreground active:scale-95 transition-transform disabled:opacity-30 disabled:pointer-events-none"
        >Add</button>
      </div>
    </motion.div>
  );
}

function NigerianTargetCard({ nigerianState, onChange }: { nigerianState: NigerianState; onChange: (s: NigerianState) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl bg-card border-2 border-border overflow-hidden"
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 active:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-black text-foreground">Target CGPA</span>
        </div>
        <div className="flex items-center gap-2">
          {nigerianState.targetCGPA !== null && (
            <span className="text-sm font-black text-primary">{nigerianState.targetCGPA.toFixed(2)}</span>
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
            <div className="border-t border-border px-4 pt-3 pb-4 flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Target CGPA (0–5)</label>
                <input
                  type="number" placeholder="e.g. 4.50" min={0} max={5} step={0.01}
                  value={nigerianState.targetCGPA ?? ""}
                  onChange={e => {
                    const n = parseFloat(e.target.value);
                    onChange({ ...nigerianState, targetCGPA: isNaN(n) ? null : Math.min(5, Math.max(0, n)) });
                  }}
                  className="w-full rounded-xl border-2 border-border bg-muted px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Remaining Credit Units</label>
                <input
                  type="number" placeholder="e.g. 60" min={0}
                  value={nigerianState.remainingCreditUnits || ""}
                  onChange={e => {
                    const n = parseInt(e.target.value, 10);
                    onChange({ ...nigerianState, remainingCreditUnits: isNaN(n) ? 0 : Math.max(0, n) });
                  }}
                  className="w-full rounded-xl border-2 border-border bg-muted px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SubjectsGlanceCard({ subjects, title }: { subjects: Subject[]; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="carousel-card rounded-2xl bg-card border-2 border-border flex-shrink-0 overflow-hidden">
      {/* Collapsible header — same pattern as Subject Comparison */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 active:bg-muted/50 transition-colors"
      >
        <h3 className="font-black text-foreground text-sm">{title}</h3>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
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
            <div className="flex flex-col gap-2 px-4 pb-4">
              {[...subjects].sort((a, b) => a.name.localeCompare(b.name)).map((sub) => {
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const Home = () => {
  const streak = getStreak();
  const history = getHistory();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const isTablet = useIsTablet();

  // ── Premium nudge ──────────────────────────────────────────────────────────
  const [activeNudge, setActiveNudge] = useState<NudgeTrigger | null>(null);
  const { fire: fireNudge } = usePremiumNudge((trigger) => setActiveNudge(trigger));

  const [downloadedCount, setDownloadedCount] = useState(0);
  const [appState, setAppState] = useState(() => loadState());

  const hasData = appState && appState.subjects.length > 0;
  const gradingSystem = appState?.settings?.gradingSystem ?? "apc";
  const weightedSplit = appState?.settings?.apcWeightedSplit ?? false;
  const isNigerian = gradingSystem === "nigerian_university";

  // Mark entry flow
  const [showMarkSheet, setShowMarkSheet] = useState(false);
  const [markStep, setMarkStep] = useState<"subject" | "score">("subject");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [markType, setMarkType] = useState<"interro" | "dev" | "compo">("interro");
  const [markValue, setMarkValue] = useState("");

  const [showResultsSheet, setShowResultsSheet] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showEditMarksSheet, setShowEditMarksSheet] = useState(false);
  const [strategyOpen, setStrategyOpen] = useState(false);
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
  const [editMarksState, setEditMarksState] = useState<Record<string, { interro: string; dev: string; compo: string; coefficient: string }>>({});

  const openEditMarksSheet = () => {
    if (!appState) return;
    const initial: Record<string, { interro: string; dev: string; compo: string; coefficient: string }> = {};
    appState.subjects.forEach((s) => {
      initial[s.id] = {
        interro: s.marks.interro !== null ? String(s.marks.interro) : "",
        dev: s.marks.dev !== null ? String(s.marks.dev) : "",
        compo: s.marks.compo !== null ? String(s.marks.compo) : "",
        coefficient: String(s.coefficient),
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
        const coeff = parseInt(vals.coefficient);
        return {
          ...s,
          coefficient: !isNaN(coeff) && coeff >= 1 ? coeff : s.coefficient,
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
    const updatedSubject = updated.subjects.find((s) => s.id === selectedSubject.id)!;
    setSelectedSubject(updatedSubject);
    // Auto-advance to the next unfilled mark type
    const order: ("interro" | "dev" | "compo")[] = ["interro", "dev", "compo"];
    const nextUnfilled = order.find(t => updatedSubject.marks[t] === null || updatedSubject.marks[t] === undefined);
    if (nextUnfilled) {
      setMarkType(nextUnfilled);
      setMarkValue("");
    } else {
      // All 3 marks filled — go back to subject picker
      setMarkStep("subject");
      setSelectedSubject(null);
      setMarkValue("");
    }
    // Fire bad_score nudge if the mark is low (below 10 or below the target avg)
    if (val < Math.min(10, targetAvg - 2)) {
      setTimeout(() => fireNudge("bad_score"), 800);
    }
  };

  const [showDeleteStrategyConfirm, setShowDeleteStrategyConfirm] = useState(false);

  const handleNigerianStateChange = (nigerianState: NigerianState) => {
    if (!appState) return;
    const updated = { ...appState, nigerianState };
    saveState(updated);
    setAppState(updated);
  };

  const handleClearStrategy = () => {
    if (!appState) return;
    const updated = { ...appState, savedStrategy: undefined, strategyDeleted: true };
    saveState(updated);
    setAppState(updated);
  };

  useEffect(() => {
    downloadService.getDownloadedPapers().then((papers) => setDownloadedCount(papers.length));
  }, []);

  // Fire at_risk nudge on mount when avg is below target but recovery is possible
  useEffect(() => {
    if (isNigerian || !hasData || currentAvg === null) return;
    const gap = targetAvg - currentAvg;
    // Only nudge if behind by 0.5–4 points (still recoverable, not hopeless)
    if (gap > 0.4 && gap <= 4) {
      const timer = setTimeout(() => fireNudge("at_risk"), 3000);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentAvg = hasData
    ? gradingSystem === "apc"
      ? calcAPCYearlyAverage(appState!.subjects, weightedSplit)
      : calcYearlyAverage(appState!.subjects)
    : null;
  const range = hasData ? getPredictedRange(appState!.subjects) : null;
  const bounds = hasData ? getAbsoluteBounds(appState!.subjects) : null;
  const targetAvg = appState?.targetMin ?? appState?.targetAverage ?? 16;

  // Nigerian-specific derived values
  const nigerianState: NigerianState = appState?.nigerianState ?? {
    semesters: [], cgpa: 0, classOfDegree: "Fail", targetCGPA: null, remainingCreditUnits: 0,
  };
  // GPA is computed from subjects with customAssessments (the integrated model)
  const nigerianCGPA = isNigerian
    ? (computeIntegratedCGPA(appState?.subjects ?? []) ?? 0)
    : 0;
  const nigerianClass = isNigerian ? classifyDegree(nigerianCGPA) : "";
  const nigerianHasData = isNigerian && (appState?.subjects ?? []).some(s =>
    s.customAssessments && s.customAssessments.some(a => a.value !== null)
  );

  // Unified hero values — same card, different semantics
  const heroValue = isNigerian ? nigerianCGPA : currentAvg;
  const heroMax = isNigerian ? 5 : 20;
  const heroTarget = isNigerian ? (appState?.targetMin ?? 5) : targetAvg;
  const heroLabel = isNigerian ? "Current GPA" : t("currentAverage");
  const heroSuffix = isNigerian ? "/ 5.00" : "/20";
  const heroTargetLabel = isNigerian ? `Target: ${nigerianState.targetCGPA?.toFixed(2) ?? "—"} / 5.00` : `${t("target")}: ${targetAvg}–20`;
  const heroBarColor = heroValue === null ? "bg-muted-foreground/30"
    : heroValue >= heroTarget ? "bg-success"
    : heroValue >= heroTarget - (isNigerian ? 0.5 : 2) ? "bg-warning"
    : "bg-danger";
  const heroHasData = isNigerian ? nigerianHasData : (hasData && currentAvg !== null);

  const avgBarColor = heroBarColor;

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

  // Guard: if state hasn't loaded yet, show spinner
  if (!appState) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background w-full pb-20">
      {/* Header — bleeds edge-to-edge, inner content constrained */}
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border safe-area-top pb-4">
        <div className="header-inner">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between pt-2 gap-3"
        >
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-foreground truncate">
              {appState?.studentName ? `${t("hey")} ${appState?.studentName}!` : t("scoreTarget")}
            </h1>
            {(appState?.classLevel || appState?.semester) && (
              <p className="text-xs font-bold text-muted-foreground mt-0.5 truncate">
                {[appState?.classLevel, appState?.serie ? `Série ${appState.serie}` : null, appState?.semester].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isNigerian && (
            <button
              onClick={() => setShowPremiumIntro(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-premium bg-premium text-premium-foreground active:scale-95 transition-all card-shadow"
              title={t("unlockPremium")}
            >
              <Crown className="h-5 w-5" />
            </button>
            )}
            {/* Bell + Profile grouped in a single pill — like the reference */}
            <div className="tour-header-actions flex items-center bg-card border-2 border-foreground rounded-2xl overflow-hidden card-shadow">
              <button
                onClick={() => setShowNotifications(true)}
                className="flex h-9 w-9 items-center justify-center text-foreground active:bg-muted transition-colors"
              >
                <Bell className="h-5 w-5" />
              </button>
              <div className="w-px h-5 bg-foreground/20" />
              {isNigerian ? (
                <Link to="/settings" className="flex h-9 w-9 items-center justify-center text-foreground active:bg-muted transition-colors">
                  <SettingsIcon className="h-5 w-5" />
                </Link>
              ) : (
                <Link to="/profile" className="flex h-9 w-9 items-center justify-center text-foreground active:bg-muted transition-colors">
                  <User className="h-5 w-5" />
                </Link>
              )}
            </div>
          </div>
        </motion.div>

        {/* Sticky mini average bar — appears when card scrolls out of view */}
        <AnimatePresence>
          {heroHasData && !avgCardVisible && (
            <motion.button
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowResultsSheet(true)}
              className="w-full mt-2 flex items-center justify-between rounded-xl bg-card border border-border px-4 py-2 active:scale-[0.98] transition-transform"
            >
              <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">{heroLabel}</span>
              <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${avgBarColor} transition-all`}
                    style={{ width: `${Math.min(((heroValue ?? 0) / heroMax) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-black text-foreground">
                  {heroValue !== null ? heroValue.toFixed(isNigerian ? 2 : 1) : "—"}{isNigerian ? "" : "/20"}
                </span>
              </div>
            </motion.button>
          )}
        </AnimatePresence>
        </div>{/* /header-inner */}
      </div>

      <div className="content-col flex flex-col gap-4 pb-8 pt-[calc(7rem+env(safe-area-inset-top))]">

        {/* ══════════ HERO CARD ══════════ */}

        {/* Nigerian: Current GPA */}
        {isNigerian && (
          <button onClick={() => setShowResultsSheet(true)} className="w-full text-left">
          <motion.div
            ref={avgCardRef}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="tour-dashboard rounded-2xl p-5 bg-card border-2 border-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-shadow"
          >
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Current GPA</p>
            <div className="flex items-end justify-between gap-2">
              <div className="flex items-end gap-1">
                <span className="text-5xl font-black text-foreground">{nigerianCGPA.toFixed(2)}</span>
                <span className="text-xl font-bold text-muted-foreground mb-1">/ 5.00</span>
              </div>
              <div className="flex flex-col items-end gap-0.5 mb-1.5">
                {appState?.targetMin != null && appState.targetMin > 0 && (
                  <span className="text-[10px] font-bold text-muted-foreground">
                    Target: {appState.targetMin.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-muted border border-foreground/20 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${avgBarColor} transition-all`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((nigerianCGPA / 5) * 100, 100)}%` }}
                transition={{ delay: 0.2, type: "spring", stiffness: 60 }}
              />
            </div>
          </motion.div>
          </button>
        )}

        {/* APC/French: Current Average */}
        {!isNigerian && hasData && currentAvg !== null && (
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
                className={`h-full rounded-full ${avgBarColor} transition-all`}
                style={{ width: `${Math.min((currentAvg / targetAvg) * 100, 100)}%` }}
              />
            </div>
          </motion.div>
          </button>
        )}

        {/* Empty state — no data yet */}
        {!isNigerian && !hasData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 py-6"
          >
            <Mascot pose="pointing" size={100} animate />
            <p className="text-sm font-black text-foreground">{t("startBySettingUp")}</p>
          </motion.div>
        )}

        {/* APC/French: has subjects but no marks yet */}
        {!isNigerian && hasData && currentAvg === null && (
          <motion.div
            ref={avgCardRef}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="tour-dashboard rounded-2xl p-5 bg-card border-2 border-border"
          >
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">{t("currentAverage")}</p>
            <p className="text-3xl font-black text-muted-foreground/40 mb-1">—/20</p>
            <p className="text-sm font-semibold text-muted-foreground">{t("noMarksYet")}</p>
            <div className="mt-3 h-2.5 rounded-full bg-muted border border-foreground/10" />
          </motion.div>
        )}

        {/* Performance Alerts — APC/French only */}
        {!isNigerian && alerts.length > 0 && (
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
                <AlertTriangle className="h-3 w-3 flex-shrink-0" /> {a.subject.name} ({t("coeff")} {a.subject.coefficient}): {a.avg.toFixed(1)}/20 — {t("belowThreshold")}
              </p>
            ))}
          </motion.div>
        )}

        {/* Onboarding checklist — Nigerian */}
        {isNigerian && hasData && (
          <div className="tour-checklist">
          <OnboardingChecklist
            steps={[
              {
                key: "target",
                label: "Set target GPA",
                description: "Set the GPA you're aiming for this semester",
                done: !!(appState?.targetMin && appState.targetMin > 0),
                href: "/profile",
              },
              {
                key: "subjects",
                label: "Add your courses",
                description: "Add the courses you're taking",
                done: (appState?.subjects?.length ?? 0) > 0,
                href: "/planner",
              },
              {
                key: "mark",
                label: "Log a score",
                description: "Enter your first assessment score",
                done: (appState?.subjects ?? []).some(s => s.customAssessments?.some(a => a.value !== null)),
                onClick: openMarkSheet,
              },
            ]}
          />
          </div>
        )}

        {/* Onboarding checklist — APC/French */}
        {!isNigerian && hasData && (
          <div className="tour-checklist">
          <OnboardingChecklist
            steps={[
              {
                key: "target",
                label: t("checklistSetTarget"),
                description: t("checklistSetTargetDesc"),
                done: !!(appState?.targetMin && appState.targetMin > 0),
                href: "/profile",
              },
              {
                key: "subjects",
                label: t("checklistAddSubjects"),
                description: t("checklistAddSubjectsDesc"),
                done: (appState?.subjects?.length ?? 0) > 0,
                href: "/planner",
              },
              {
                key: "mark",
                label: t("checklistLogMark"),
                description: t("checklistLogMarkDesc"),
                done: filledMarks > 0,
                onClick: openMarkSheet,
              },
              {
                key: "simulator",
                label: t("checklistSimulator"),
                description: t("checklistSimulatorDesc"),
                done: !!(appState?.savedStrategy && appState.savedStrategy.marks.length > 0) || !!(appState as any)?.strategyDeleted,
                href: "/simulator",
              },
              {
                key: "library",
                label: t("checklistLibrary"),
                description: t("checklistLibraryDesc"),
                done: downloadedCount > 0,
                href: "/library",
              },
            ]}
          />
          </div>
        )}

        {/* Saved Strategy — APC/French only */}
        {!isNigerian && hasData && savedStrategy && savedStrategy.marks.length > 0 && (
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-card border-2 border-secondary/40 overflow-hidden relative"
          >
            {/* Accent stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary via-secondary/60 to-transparent" />

            {/* Collapsible header */}
            <button
              onClick={() => setStrategyOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 pt-4 pb-3 active:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/15">
                  <Target className="h-4 w-4 text-secondary" />
                </div>
                <div className="text-left">
                  <h3 className="font-black text-foreground text-sm">{t("myStrategy")}</h3>
                  <p className="text-[10px] font-bold text-muted-foreground">
                    {t("projectedAverage")}: {savedStrategy.simulatedAverage.toFixed(1)}/20
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  to="/simulator"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center rounded-lg bg-secondary/15 h-7 w-7 active:scale-95 transition-transform"
                >
                  <Pencil className="h-3.5 w-3.5 text-secondary" />
                </Link>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDeleteStrategyConfirm(true); }}
                  className="flex items-center justify-center rounded-lg bg-muted h-7 w-7 text-[10px] font-black text-muted-foreground active:scale-95 transition-transform"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                <motion.div animate={{ rotate: strategyOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {strategyOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-1.5 px-4 pb-4 border-t border-secondary/20 pt-3">
                    {/* Group marks by subject */}
                    {Array.from(new Map(savedStrategy.marks.map(sm => [sm.subjectId, sm.subjectName])))
                      .sort(([, a], [, b]) => (a as string).localeCompare(b as string))
                      .map(([subjectId, subjectName]) => {
                      const subMarks = savedStrategy.marks.filter(sm => sm.subjectId === subjectId);
                      const sub = appState!.subjects.find(s => s.id === subjectId);
                      const anyFulfilled = subMarks.some(sm => sub?.marks[sm.markType] !== null);
                      return (
                        <div
                          key={subjectId}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 ${anyFulfilled ? "bg-secondary/10" : "bg-muted/50"}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                            <span className="text-xs font-bold text-foreground">{subjectName}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {subMarks.map(sm => {
                              const actual = sub?.marks[sm.markType] ?? null;
                              const pillStyle = actual === null
                                ? "bg-muted text-foreground/60"
                                : actual >= sm.targetValue
                                  ? "bg-success/20 text-success"
                                  : "bg-danger/20 text-danger";
                              return (
                                <span key={sm.markType} className={`text-[10px] font-black px-1.5 py-0.5 rounded ${pillStyle}`}>
                                  {sm.targetValue.toFixed(1)}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* New user CTA — APC/French */}
        {!isNigerian && !hasData && (
          <Link to="/planner" className="block">
            <div className="rounded-2xl bg-secondary border-2 border-foreground p-4 card-shadow flex items-center gap-4 active:translate-y-0.5 active:shadow-none transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-foreground bg-card">
                <Target className="h-6 w-6 text-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-foreground">
                  {t("startPlanningAction")}
                </h3>
                <p className="text-xs font-semibold text-foreground/60">{t("setTargetAddSubjects")}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-foreground" />
            </div>
          </Link>
        )}

        {/* New user CTA — Nigerian */}
        {isNigerian && !hasData && (
          <Link to="/planner" className="block">
            <div className="rounded-2xl bg-secondary border-2 border-foreground p-4 card-shadow flex items-center gap-4 active:translate-y-0.5 active:shadow-none transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-foreground bg-card">
                <GraduationCap className="h-6 w-6 text-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-foreground">Add your courses</h3>
                <p className="text-xs font-semibold text-foreground/60">Set your target GPA and log your scores</p>
              </div>
              <ChevronRight className="h-5 w-5 text-foreground" />
            </div>
          </Link>
        )}

        {/* Courses at a glance — Nigerian (replaces SubjectsGlanceCard) */}
        {isNigerian && hasData && (
          <div className="tour-subjects-carousel overflow-x-auto -mx-4 px-4 pb-2 hide-scrollbar">
            <div className="flex gap-3 items-start" style={{ width: "max-content" }}>
              <div className="carousel-card rounded-2xl bg-card border-2 border-border flex-shrink-0 overflow-hidden">
                <div className="px-4 py-3">
                  <h3 className="font-black text-foreground text-sm">Courses</h3>
                </div>
                <div className="flex flex-col gap-1 px-4 pb-4">
                  {[...(appState?.subjects ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map((sub) => {
                    const score = computeIntegratedSubjectScore(sub);
                    const { letter } = score !== null ? scoreToGrade(Math.round(score)) : { letter: null };
                    const cu = sub.creditUnits ?? sub.coefficient;
                    return (
                      <div key={sub.id} className="rounded-xl bg-muted/50 px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-foreground">{sub.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground">{cu} CU</span>
                            {score !== null && letter && (
                              <span className="text-sm font-black text-foreground">{score.toFixed(1)}<span className="text-xs font-bold text-muted-foreground"> · {letter}</span></span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subjects at a glance + Class ranking — APC/French */}
        {!isNigerian && hasData && (
          <div className="tour-subjects-carousel overflow-x-auto -mx-4 px-4 pb-2 hide-scrollbar">
            <div className="flex gap-3 items-start" style={{ width: "max-content" }}>
              <SubjectsGlanceCard subjects={appState!.subjects} title={t("subjectsGlance")} />
              <div className="carousel-card flex-shrink-0">
                <FrenchClassView subjects={appState!.subjects} />
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity — both systems */}
        {(isNigerian ? hasData : hasData) && recentHistory.length > 0 && (
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="tour-recent-activity rounded-2xl bg-card border-2 border-border p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-foreground text-sm">{t("recentActivity")}</h3>
              {history.length > 5 && (
                <button onClick={() => setShowAllActivity(v => !v)} className="text-[10px] font-black text-primary active:scale-95 transition-transform">
                  {showAllActivity ? t("showLess") : `${t("seeAll")} ${history.length}`}
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
                  <span className="text-sm font-black text-foreground">{entry.value.toFixed(1)}{isNigerian ? "/100" : "/20"}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Downloaded Papers — APC/French only (library feature) */}
        {!isNigerian && downloadedCount > 0 && (
          <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <Link to="/my-downloads" className="flex items-center justify-between rounded-2xl bg-card border-2 border-border p-4 active:scale-[0.98] transition-transform">
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

        {/* Ideas & Feedback — both systems */}
        {hasData && (
          <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}>
            <Link to="/feedback-board" className="tour-feedback flex items-center gap-3 rounded-2xl bg-card border-2 border-border p-4 active:scale-[0.98] transition-transform">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/20 border border-secondary/30 shrink-0">
                <Lightbulb className="h-5 w-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-foreground">{language === "fr" ? "Idées & Avis" : "Ideas & Feedback"}</p>
                <p className="text-[10px] font-bold text-muted-foreground">{t("tourFeedbackHint")}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          </motion.div>
        )}
      </div>

      <TaskBar action={
        (isNigerian ? hasData : hasData) ? (
          <div className="relative">
            {/* Strategizer — APC/French only */}
            {!isNigerian && (
              <div className="absolute bottom-full mb-3 left-0">
                <Link
                  to="/simulator"
                  title={t("whatIfSimulator")}
                  className="tour-strategizer h-12 w-12 rounded-full bg-card border-2 border-foreground card-shadow flex items-center justify-center active:scale-95 transition-transform"
                >
                  <TrendingUp className="h-6 w-6 text-foreground" />
                </Link>
              </div>
            )}
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
              initial={isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: "100%" }}
              animate={isTablet ? { x: "-50%", y: "-50%", scale: 1, opacity: 1 } : { y: 0 }}
              exit={isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="sheet z-50 p-6 pb-10"
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-foreground/20 mx-auto mb-5" />

              {markStep === "subject" ? (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-black">{isNigerian ? "Which course?" : t("whichSubject")}</h2>
                    <button onClick={() => setShowMarkSheet(false)}>
                      <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                    {[...(appState?.subjects ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map((sub) => {
                      const markKeys = ["interro", "dev", "compo"] as const;
                      // Nigerian: show credit units and computed weighted score
                      const nigerianScore = isNigerian ? computeIntegratedSubjectScore(sub) : null;
                      const { letter } = (isNigerian && nigerianScore !== null) ? scoreToGrade(Math.round(nigerianScore)) : { letter: null };
                      const hasAssessments = isNigerian && sub.customAssessments && sub.customAssessments.some(a => a.value !== null);
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleSelectSubject(sub)}
                          className="flex items-center justify-between rounded-2xl bg-card border-2 border-foreground px-4 py-3 active:scale-[0.98] transition-transform card-shadow"
                        >
                          <span className="font-black text-foreground truncate min-w-0 mr-3">{sub.name}</span>
                          <div className="flex items-center gap-2">
                            {isNigerian ? (
                              <>
                                <span className="text-xs font-bold text-muted-foreground">{sub.creditUnits ?? sub.coefficient} CU</span>
                                {hasAssessments && nigerianScore !== null && (
                                  <span className="text-xs font-black text-primary">{nigerianScore.toFixed(1)} · {letter}</span>
                                )}
                                <div className={`h-2 w-2 rounded-full border-2 border-foreground ${hasAssessments ? "bg-foreground" : "bg-transparent"}`} />
                              </>
                            ) : (
                              <>
                                <div className="flex gap-1">
                                  {markKeys.map(k => {
                                    const filled = sub.marks[k] !== null && sub.marks[k] !== undefined;
                                    return (
                                      <div
                                        key={k}
                                        className={`h-2 w-2 rounded-full border-2 border-foreground transition-all ${filled ? "bg-foreground" : "bg-transparent"}`}
                                      />
                                    );
                                  })}
                                </div>
                                <span className="text-xs font-bold text-muted-foreground">{t("coeff")} {sub.coefficient}</span>
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  {!isNigerian && (
                  <div className="flex items-center gap-3 mb-5">
                    <button onClick={() => setMarkStep("subject")} className="text-muted-foreground">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h2 className="text-xl font-black flex-1">{selectedSubject?.name}</h2>
                    <button onClick={() => setShowMarkSheet(false)} className="text-muted-foreground">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  )}

                  {isNigerian ? (
                    /* ── Nigerian score entry: NigerianAssessmentSheet ── */
                    <NigerianAssessmentSheet
                      subject={selectedSubject!}
                      onSave={(updated) => {
                        if (!appState) return;
                        const newState = {
                          ...appState,
                          subjects: appState.subjects.map(s => s.id === updated.id ? updated : s),
                        };
                        saveState(newState);
                        setAppState(newState);
                        setShowMarkSheet(false);
                      }}
                      onBack={() => setMarkStep("subject")}
                      onClose={() => setShowMarkSheet(false)}
                    />
                  ) : (
                    /* ── APC/French: interro / dev / compo type selector ── */
                    <>
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
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ProductTour />

      {/* ── Delete strategy confirm dialog ── */}
      <AnimatePresence>
        {showDeleteStrategyConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/50"
              onClick={() => setShowDeleteStrategyConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="fixed inset-x-6 z-[81] top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-card border-2 border-foreground rounded-2xl p-5 card-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10 shrink-0">
                  <Trash2 className="h-5 w-5 text-danger" />
                </div>
                <div>
                  <h3 className="font-black text-foreground text-sm">Delete strategy?</h3>
                  <p className="text-xs font-semibold text-muted-foreground mt-0.5">This can't be undone.</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowDeleteStrategyConfirm(false)}
                  className="flex-1 rounded-xl bg-muted border-2 border-foreground/20 py-2.5 text-sm font-black text-foreground active:scale-95 transition-transform"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { handleClearStrategy(); setShowDeleteStrategyConfirm(false); }}
                  className="flex-1 rounded-xl bg-danger border-2 border-foreground py-2.5 text-sm font-black text-danger-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>



      {/* Premium intro → plan select → payment */}
      {/* Manual trigger (Crown button) */}
      <PremiumIntroSheet
        open={showPremiumIntro && !activeNudge}
        onClose={() => setShowPremiumIntro(false)}
        onContinue={() => { setShowPremiumIntro(false); setShowPlanSelect(true); }}
      />
      {/* Contextual nudge trigger */}
      <PremiumIntroSheet
        open={!!activeNudge}
        subjectName={undefined}
        nudgeSubtext={activeNudge ? nudgeSubtext(activeNudge, language as "en" | "fr") : undefined}
        onClose={() => setActiveNudge(null)}
        onContinue={() => { setActiveNudge(null); setShowPlanSelect(true); }}
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
              initial={isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: "100%" }}
              animate={isTablet ? { x: "-50%", y: "-50%", scale: 1, opacity: 1 } : { y: 0 }}
              exit={isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="sheet z-50"
              id="results-sheet"
            >
              {/* Drag handle */}
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
                    if (currentY > window.innerHeight * 0.25) setShowResultsSheet(false);
                    else sheet.style.transform = "";
                    document.removeEventListener("touchmove", onMove);
                    document.removeEventListener("touchend", onEnd);
                  };
                  document.addEventListener("touchmove", onMove, { passive: true });
                  document.addEventListener("touchend", onEnd);
                }}
              >
                <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {isNigerian ? (
                  /* ── Nigerian GPA results view ── */
                  <div className="px-6 pb-10 pt-2 flex flex-col gap-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-black text-foreground">GPA Breakdown</h2>
                      <button onClick={() => setShowResultsSheet(false)}>
                        <X className="h-5 w-5 text-muted-foreground" />
                      </button>
                    </div>

                    {/* CGPA hero */}
                    <div className="rounded-2xl bg-card border-2 border-foreground p-5 text-center">
                      <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Cumulative GPA</p>
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-6xl font-black text-foreground">{nigerianCGPA.toFixed(2)}</span>
                        <span className="text-xl font-bold text-muted-foreground">/ 5.00</span>
                      </div>
                      <span className={`inline-block mt-2 text-sm font-black px-3 py-1 rounded-full border ${
                        nigerianClass === "First Class" ? "bg-success/15 text-success border-success/30"
                        : nigerianClass === "Second Class Upper" ? "bg-primary/15 text-primary border-primary/30"
                        : nigerianClass === "Second Class Lower" ? "bg-warning/15 text-warning border-warning/30"
                        : nigerianClass === "Third Class" ? "bg-orange-500/15 text-orange-500 border-orange-500/30"
                        : nigerianClass === "Pass" ? "bg-muted text-muted-foreground border-border"
                        : "bg-danger/15 text-danger border-danger/30"
                      }`}>{nigerianClass}</span>
                      {nigerianState.targetCGPA !== null && (
                        <p className="text-xs font-bold text-muted-foreground mt-2">
                          Target: {nigerianState.targetCGPA.toFixed(2)} / 5.00
                        </p>
                      )}
                    </div>

                    {/* Per-semester breakdown */}
                    {nigerianState.semesters.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Semesters</p>
                        {nigerianState.semesters.map((sem) => (
                          <div key={sem.id} className="rounded-2xl bg-card border-2 border-border overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3">
                              <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{sem.sessionLabel}</p>
                                <p className="text-sm font-black text-foreground">{sem.name}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">GPA</p>
                                <p className="text-2xl font-black text-foreground leading-none">{sem.gpa.toFixed(2)}</p>
                              </div>
                            </div>
                            {sem.courses.length > 0 && (
                              <div className="border-t border-border px-4 pb-3 pt-2 flex flex-col gap-1">
                                {sem.courses.map((c) => (
                                  <div key={c.id} className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-1.5">
                                    <span className="flex-1 text-xs font-bold text-foreground truncate">{c.name}</span>
                                    <span className="text-[10px] font-bold text-muted-foreground">{c.creditUnits} CU</span>
                                    <span className="text-xs font-bold text-foreground">{c.score}</span>
                                    <span className={`text-xs font-black w-5 text-center ${
                                      c.letter === "A" ? "text-success" : c.letter === "B" ? "text-primary"
                                      : c.letter === "C" ? "text-warning" : c.letter === "F" ? "text-danger" : "text-muted-foreground"
                                    }`}>{c.letter}</span>
                                    <span className="text-[10px] font-bold text-muted-foreground">GP {c.gp}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Courses (subjects) with assessments */}
                    {appState && appState.subjects.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Courses & Assessments</p>
                        {appState.subjects.map((sub) => {
                          const score = computeIntegratedSubjectScore(sub);
                          const { letter, points } = score !== null ? scoreToGrade(Math.round(score)) : { letter: "—", points: 0 };
                          const cu = sub.creditUnits ?? sub.coefficient;
                          return (
                            <div key={sub.id} className="rounded-2xl bg-card border-2 border-border overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3">
                                <div>
                                  <p className="text-sm font-black text-foreground">{sub.name}</p>
                                  <p className="text-[10px] font-bold text-muted-foreground">{cu} Credit Units</p>
                                </div>
                                {score !== null && (
                                  <div className="text-right">
                                    <p className="text-lg font-black text-foreground">{score.toFixed(1)}<span className="text-xs text-muted-foreground">/100</span></p>
                                    <p className="text-xs font-black text-primary">{letter} · {points} pts</p>
                                  </div>
                                )}
                              </div>
                              {sub.customAssessments && sub.customAssessments.length > 0 && (
                                <div className="border-t border-border px-4 pb-3 pt-2 flex flex-col gap-1">
                                  {sub.customAssessments.map((a) => (
                                    <div key={a.id} className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-1.5">
                                      <span className="flex-1 text-xs font-bold text-foreground">{a.label}</span>
                                      <span className="text-[10px] font-bold text-muted-foreground">{a.weight}%</span>
                                      <span className="text-xs font-black text-foreground">
                                        {a.value !== null ? `${a.value}/100` : "—"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── APC/French results view ── */
                  appState && (
                    <ResultsScreen
                      subjects={appState.subjects}
                      targetAverage={appState.targetMin ?? appState.targetAverage}
                      onBack={() => setShowResultsSheet(false)}
                      onEditMarks={() => { setShowResultsSheet(false); openEditMarksSheet(); }}
                    />
                  )
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
              initial={isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: "100%" }}
              animate={isTablet ? { x: "-50%", y: "-50%", scale: 1, opacity: 1 } : { y: 0 }}
              exit={isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="sheet z-50"
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
                <h2 className="text-lg font-black text-foreground">{t("editMarks")}</h2>
                <button
                  onClick={handleSaveEditMarks}
                  className="rounded-xl bg-secondary border-2 border-foreground px-4 py-1.5 text-sm font-black text-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all"
                >
                  Done
                </button>
              </div>

              {/* Subject list */}
              <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4 min-h-0">
                {appState?.subjects.map((sub) => {
                  const vals = editMarksState[sub.id] ?? { interro: "", dev: "", compo: "" };
                  const rows: { key: "interro" | "dev" | "compo"; label: string }[] = [
                    { key: "interro", label: t("interro") },
                    { key: "dev", label: t("devoir") },
                    { key: "compo", label: t("composition") },
                  ];
                  return (
                    <div key={sub.id} className="rounded-2xl bg-card border-2 border-foreground card-shadow p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-black text-foreground">{sub.name}</span>
                        {/* Coefficient stepper */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-muted-foreground">{t("coeff")}</span>
                          <button
                            onClick={() => setEditMarksState(prev => ({
                              ...prev,
                              [sub.id]: { ...prev[sub.id], coefficient: String(Math.max(1, parseInt(prev[sub.id]?.coefficient || "1") - 1)) }
                            }))}
                            className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted text-sm font-bold text-foreground active:scale-95"
                          >−</button>
                          <span className="w-5 text-center text-sm font-black text-foreground">
                            {editMarksState[sub.id]?.coefficient ?? sub.coefficient}
                          </span>
                          <button
                            onClick={() => setEditMarksState(prev => ({
                              ...prev,
                              [sub.id]: { ...prev[sub.id], coefficient: String(parseInt(prev[sub.id]?.coefficient || "1") + 1) }
                            }))}
                            className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted text-sm font-bold text-foreground active:scale-95"
                          >+</button>
                        </div>
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
              initial={isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: "100%" }}
              animate={isTablet ? { x: "-50%", y: "-50%", scale: 1, opacity: 1 } : { y: 0 }}
              exit={isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="sheet z-50"
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

