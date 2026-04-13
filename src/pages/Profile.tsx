import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { ArrowLeft, User, Target, BookOpen, Pencil, Check, Settings, Crown, ChevronRight, ChevronDown, Plus, Trash2, Search, X, GraduationCap, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { loadState, saveState } from "@/lib/storage";
import { AppState, Subject } from "@/types/exam";
import { CLASS_LEVELS, LYCEE_SERIES, getSubjectsForLevel } from "@/lib/subjects-data";
import TaskBar from "@/components/TaskBar";
import ScreenIntro from "@/components/ScreenIntro";
import ScreenTour from "@/components/ScreenTour";
import { PremiumIntroSheet } from "@/components/subscription/PremiumIntroSheet";
import { PlanSelectSheet } from "@/components/subscription/PlanSelectSheet";
import { SubjectPackSheet } from "@/components/subscription/SubjectPackSheet";
import { PaymentSheet } from "@/components/subscription/PaymentSheet";
import { createNigerianSubject } from "@/lib/nigerian-defaults";
import { useAppConfig } from "@/contexts/AppConfigContext";
import {
  scoreToGrade,
  computeGP,
  computeSemesterGPA,
  computeCGPA,
  classifyDegree,
  validateScore,
  validateCreditUnits,
} from "@/lib/grading-nigerian";
import { NigerianState } from "@/types/nigerian";
import { useLanguage } from "@/contexts/LanguageContext";

const allLevels = [...CLASS_LEVELS.college, ...CLASS_LEVELS.lycee];
const isLycee = (level: string) => (CLASS_LEVELS.lycee as readonly string[]).includes(level);

const Profile = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { premiumEnabled: PREMIUM_ENABLED } = useAppConfig();
  const [state, setState] = useState<AppState | null>(null);
  const [editingBasic, setEditingBasic] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [editingGrading, setEditingGrading] = useState(false);
  const [editingSubjects, setEditingSubjects] = useState(false);
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const [semestersOpen, setSemestersOpen] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectSelected, setSubjectSelected] = useState<Set<string>>(new Set());
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectModalView, setSubjectModalView] = useState<"list" | "custom">("list");
  const [subjectCustomName, setSubjectCustomName] = useState("");
  const [draft, setDraft] = useState({ studentName: "", classLevel: "", serie: "", semester: "", department: "", universityLevel: "" });
  const [draftTarget, setDraftTarget] = useState(16);

  // Premium flow
  const [showPremiumIntro, setShowPremiumIntro] = useState(false);
  const [showPlanSelect, setShowPlanSelect] = useState(false);
  const [showSubjectPack, setShowSubjectPack] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(80);
  useEffect(() => {
    if (!headerRef.current) return;
    const ro = new ResizeObserver(() => {
      setHeaderHeight(headerRef.current?.getBoundingClientRect().height ?? 0);
    });
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const loaded = loadState();
    if (loaded) setState(loaded);
    else navigate("/");
  }, [navigate]);

  if (!state) return null;

  const isNigerian = state?.settings?.gradingSystem === "nigerian_university";

  const updateState = (patch: Partial<AppState>) => {
    const newState = { ...state, ...patch };
    setState(newState);
    saveState(newState);
  };

  const updateSetting = (key: string, value: any) => {
    const newState = { ...state, settings: { ...state.settings, [key]: value } };
    setState(newState);
    saveState(newState);
  };

  const startEditBasic = () => {
    setDraft({ studentName: state.studentName || "", classLevel: state.classLevel || "", serie: state.serie || "", semester: state.semester || "", department: state.department || "", universityLevel: state.universityLevel || "" });
    setEditingBasic(true);
  };

  const saveBasic = () => {
    if (isNigerian) {
      updateState({ studentName: draft.studentName, department: draft.department, universityLevel: draft.universityLevel });
    } else {
      updateState({ studentName: draft.studentName, classLevel: draft.classLevel, serie: isLycee(draft.classLevel) ? draft.serie : undefined, semester: draft.semester });
    }
    setEditingBasic(false);
  };

  const startEditTarget = () => {
    setDraftTarget(state.targetMin ?? state.targetAverage);
    setEditingTarget(true);
  };

  // ── Subject editing helpers ──────────────────────────────────────────────
  const subjects = state.subjects ?? [];
  const allSuggestedForProfile = getSubjectsForLevel(state.classLevel || "", state.serie || "");
  const existingSubjectNames = new Set(subjects.map((s) => s.name.toLowerCase()));
  const availableToAdd = allSuggestedForProfile
    .filter((s) => !existingSubjectNames.has(s.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
  const filteredSubjects = subjectSearch.trim()
    ? availableToAdd.filter((s) => s.toLowerCase().includes(subjectSearch.toLowerCase()))
    : availableToAdd;
  const showCustomSubjectOption =
    subjectSearch.trim().length > 0 &&
    !availableToAdd.some((s) => s.toLowerCase() === subjectSearch.toLowerCase()) &&
    !existingSubjectNames.has(subjectSearch.toLowerCase());

  const openSubjectModal = () => {
    setSubjectSelected(new Set());
    setSubjectSearch("");
    setSubjectCustomName("");
    setSubjectModalView("list");
    setShowSubjectModal(true);
  };

  const toggleSubjectSelect = (name: string) => {
    setSubjectSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const confirmAddSubjects = () => {
    const newSubs: Subject[] = Array.from(subjectSelected).map((name) =>
      isNigerian
        ? createNigerianSubject(name, 1)
        : {
            id: crypto.randomUUID(),
            name,
            coefficient: 1,
            marks: { interro: null, dev: null, compo: null },
          }
    );
    updateState({ subjects: [...subjects, ...newSubs] });
    setSubjectSelected(new Set());
    setSubjectSearch("");
    setShowSubjectModal(false);
  };

  const addCustomSubject = () => {
    const name = subjectSearch.trim();
    if (!name || existingSubjectNames.has(name.toLowerCase())) return;
    
    const newSub: Subject = isNigerian
      ? createNigerianSubject(name, 1)
      : { id: crypto.randomUUID(), name, coefficient: 1, marks: { interro: null, dev: null, compo: null } };
    
    const selectedSubs: Subject[] = Array.from(subjectSelected).map((n) =>
      isNigerian
        ? createNigerianSubject(n, 1)
        : { id: crypto.randomUUID(), name: n, coefficient: 1, marks: { interro: null, dev: null, compo: null } }
    );
    
    updateState({ subjects: [...subjects, newSub, ...selectedSubs] });
    setSubjectSearch("");
    setSubjectSelected(new Set());
    setShowSubjectModal(false);
  };

  const confirmSubjectCustomName = () => {
    const name = subjectCustomName.trim();
    if (!name || existingSubjectNames.has(name.toLowerCase())) return;
    if (isNigerian) {
      // For Nigerian, directly add the subject (no preset list to select from)
      const newSub = createNigerianSubject(name, 1);
      updateState({ subjects: [...subjects, newSub] });
      setSubjectCustomName("");
      setShowSubjectModal(false);
    } else {
      setSubjectSelected((prev) => new Set([...prev, name]));
      setSubjectCustomName("");
      setSubjectModalView("list");
    }
  };

  const updateSubjectCoeff = (id: string, coeff: number) => {
    const max = isNigerian ? 6 : Infinity;
    if (isNigerian) {
      updateState({ subjects: subjects.map((s) => s.id === id ? { ...s, creditUnits: Math.min(max, Math.max(1, coeff)) } : s) });
    } else {
      updateState({ subjects: subjects.map((s) => s.id === id ? { ...s, coefficient: Math.max(1, coeff) } : s) });
    }
  };

  const removeSubject = (id: string) => {
    const subjectName = subjects.find((s) => s.id === id)?.name;
    // Also remove history entries for this subject
    if (subjectName) {
      const history = JSON.parse(localStorage.getItem("scoretarget_history") || "[]");
      const filtered = history.filter((e: { subjectName: string }) => e.subjectName !== subjectName);
      localStorage.setItem("scoretarget_history", JSON.stringify(filtered));
    }
    updateState({ subjects: subjects.filter((s) => s.id !== id) });
  };

  return (
    <div className="min-h-screen bg-background w-full pb-20">
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border safe-area-top py-3">
        <div className="header-inner flex items-center justify-between">
          {isNigerian ? (
            <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border-2 border-foreground card-shadow active:scale-95 transition-transform shrink-0">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
          ) : (
            <h1 className="text-lg font-black text-primary">{t("yourProfile")}</h1>
          )}
          <h1 className="text-lg font-black text-primary">{isNigerian ? t("yourProfile") : ""}</h1>
          <Link to="/settings" className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-foreground bg-card text-foreground active:scale-95 transition-all card-shadow">
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="content-col flex flex-col gap-6 py-6" style={{ paddingTop: headerHeight + 32 }}>

        {/* Premium banner */}
        {!isNigerian && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={() => setShowPremiumIntro(true)}
          className="w-full rounded-2xl bg-secondary border-2 border-foreground p-4 flex items-center gap-4 card-shadow cursor-pointer active:translate-y-0.5 active:shadow-none transition-all"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-premium/10 border-2 border-premium/30 shrink-0">
            <Crown className="h-6 w-6 text-premium" />
          </div>
          <div className="flex-1">
            <p className="font-black text-foreground text-sm">{t("unlockPremium")}</p>
            <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">{t("premiumStudyTools")}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </motion.div>
        )}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="tour-profile-info rounded-2xl bg-card p-5 border-2 border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-black text-foreground">{t("basicInfo")}</h3>
            </div>
            {editingBasic ? (
              <button onClick={saveBasic} className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground active:scale-95 transition-transform">
                <Check className="h-3.5 w-3.5" /> {t("done")}
              </button>
            ) : (
              <button onClick={startEditBasic} className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-1.5 text-xs font-black text-foreground active:scale-95 transition-transform">
                <Pencil className="h-3.5 w-3.5" /> {t("edit")}
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {editingBasic ? (
              <motion.div key="editing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-muted-foreground mb-1 block">{t("fullName")}</label>
                  <input
                    type="text"
                    value={draft.studentName}
                    onChange={(e) => setDraft((d) => ({ ...d, studentName: e.target.value }))}
                    className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 font-semibold text-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                {isNigerian ? (
                  <>
                    <div>
                      <label className="text-sm font-bold text-muted-foreground mb-1 block">Department</label>
                      <input
                        type="text"
                        value={draft.department}
                        onChange={(e) => setDraft((d) => ({ ...d, department: e.target.value }))}
                        placeholder="e.g. Computer Science"
                        className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 font-semibold text-foreground focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-muted-foreground mb-1 block">Level</label>
                      <div className="grid grid-cols-5 gap-2">
                        {["100", "200", "300", "400", "500"].map((lvl) => (
                          <button
                            key={lvl}
                            onClick={() => setDraft((d) => ({ ...d, universityLevel: lvl }))}
                            className={`rounded-xl px-2 py-2.5 text-xs font-black transition-all active:scale-95 border-2 border-foreground ${draft.universityLevel === lvl ? "bg-secondary text-foreground card-shadow" : "bg-card text-foreground"}`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-bold text-muted-foreground mb-1 block">{t("classLevel")}</label>
                      <select
                        value={draft.classLevel}
                        onChange={(e) => { const l = e.target.value; setDraft((d) => ({ ...d, classLevel: l, serie: isLycee(l) ? d.serie : "" })); }}
                        className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 font-semibold text-foreground focus:border-primary focus:outline-none transition-colors appearance-none"
                      >
                        <option value="" disabled>{t("selectClass")}</option>
                        {allLevels.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    {draft.classLevel && isLycee(draft.classLevel) && (
                      <div>
                        <label className="text-sm font-bold text-muted-foreground mb-1 block">Série</label>
                        <select
                          value={draft.serie}
                          onChange={(e) => setDraft((d) => ({ ...d, serie: e.target.value }))}
                          className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 font-semibold text-foreground focus:border-primary focus:outline-none transition-colors appearance-none"
                        >
                          <option value="" disabled>{t("selectSerie")}</option>
                          {LYCEE_SERIES.map(s => <option key={s} value={s}>Série {s}</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-bold text-muted-foreground mb-1 block">{t("semester")}</label>
                      <div className={`grid gap-2 ${isLycee(draft.classLevel) ? "grid-cols-2" : "grid-cols-3"}`}>
                        {(isLycee(draft.classLevel)
                          ? ["1st Semester", "2nd Semester"]
                          : ["1st Semester", "2nd Semester", "3rd Semester"]
                        ).map((s) => (
                          <button
                            key={s}
                            onClick={() => setDraft((d) => ({ ...d, semester: s }))}
                            className={`rounded-xl px-2 py-2.5 text-xs font-black transition-all active:scale-95 border-2 border-foreground ${
                              draft.semester === s ? "bg-secondary text-foreground card-shadow" : "bg-card text-foreground"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div key="viewing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <InfoRow label={t("fullName")} value={state.studentName || "—"} />
                {isNigerian ? (
                  <>
                    <InfoRow label="Department" value={state.department || "—"} />
                    <InfoRow label="Level" value={state.universityLevel ? `${state.universityLevel} Level` : "—"} />
                  </>
                ) : (
                  <>
                    <InfoRow label={t("classLevel")} value={state.classLevel || "—"} />
                    {state.classLevel && isLycee(state.classLevel) && (
                      <InfoRow label="Série" value={state.serie ? `Série ${state.serie}` : "—"} />
                    )}
                    <InfoRow label={t("semester")} value={state.semester || "—"} />
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Target Average */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="tour-profile-target rounded-2xl bg-card p-5 border-2 border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                <Target className="h-5 w-5 text-secondary" />
              </div>
              <h3 className="font-black text-foreground">{isNigerian ? "Target GPA" : t("targetAverage")}</h3>
            </div>
            {editingTarget ? (
              <button onClick={() => { updateState({ targetMin: draftTarget, targetAverage: draftTarget }); setEditingTarget(false); }} className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground active:scale-95 transition-transform">
                <Check className="h-3.5 w-3.5" /> {t("done")}
              </button>
            ) : (
              <button onClick={startEditTarget} className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-1.5 text-xs font-black text-foreground active:scale-95 transition-transform">
                <Pencil className="h-3.5 w-3.5" /> {t("edit")}
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {editingTarget ? (
              <motion.div key="editing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                <div className="text-center mb-2">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">{t("targetRange")}</p>
                  <div className="flex items-baseline justify-center gap-2">
                    {isNigerian ? (
                      <>
                        <span className="text-5xl font-black text-primary">{draftTarget.toFixed(2)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-5xl font-black text-primary">{draftTarget.toFixed(1)}</span>
                        <span className="text-xl font-bold text-muted-foreground">– 20 / 20</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground mt-1">{t("minimumTarget")}</p>
                </div>
                <input
                  type="range"
                  min={isNigerian ? 0 : 0}
                  max={isNigerian ? 5 : 20}
                  step={isNigerian ? 0.05 : 0.5}
                  value={draftTarget}
                  onChange={(e) => setDraftTarget(parseFloat(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary mt-4"
                />
                <div className="flex justify-between w-full text-xs font-bold text-muted-foreground mt-2 px-1">
                  {isNigerian ? (
                    <><span>0</span><span>2.5</span><span>5</span></>
                  ) : (
                    <><span>0</span><span>10</span><span>20</span></>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div key="viewing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-2">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">{t("targetRange")}</p>
                <div className="flex items-baseline justify-center gap-2">
                  {isNigerian ? (
                    <>
                      <span className="text-5xl font-black text-primary">{(state.targetMin ?? state.targetAverage).toFixed(2)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-5xl font-black text-primary">{state.targetMin ?? state.targetAverage}</span>
                      <span className="text-xl font-bold text-muted-foreground">– 20 / 20</span>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Grading System */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="rounded-2xl bg-card p-5 border-2 border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                <BookOpen className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-black text-foreground">{t("gradingSystemLabel")}</h3>
            </div>
            {editingGrading ? (
              <button onClick={() => setEditingGrading(false)} className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground active:scale-95 transition-transform">
                <Check className="h-3.5 w-3.5" /> {t("done")}
              </button>
            ) : (
              <button onClick={() => setEditingGrading(true)} className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-1.5 text-xs font-black text-foreground active:scale-95 transition-transform">
                <Pencil className="h-3.5 w-3.5" /> {t("edit")}
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {editingGrading ? (
              <motion.div key="editing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
                <button
                  onClick={() => updateSetting("gradingSystem", "apc")}
                  className={`rounded-xl px-4 py-3 text-left transition-all ${state.settings.gradingSystem === "apc" ? "bg-primary/15 text-primary border-2 border-primary" : "bg-muted text-foreground border-2 border-transparent"}`}
                >
                  <span className="font-bold block">{t("apcTogolese")}</span>
                </button>
                <button
                  onClick={() => updateSetting("gradingSystem", "french")}
                  className={`rounded-xl px-4 py-3 text-left transition-all ${state.settings.gradingSystem === "french" ? "bg-secondary/15 text-secondary border-2 border-secondary" : "bg-muted text-foreground border-2 border-transparent"}`}
                >
                  <span className="font-bold block">{t("frenchTrad")}</span>
                </button>
                <button
                  onClick={() => updateSetting("gradingSystem", "nigerian_university")}
                  className={`rounded-xl px-4 py-3 text-left transition-all ${state.settings.gradingSystem === "nigerian_university" ? "bg-primary/15 text-primary border-2 border-primary" : "bg-muted text-foreground border-2 border-transparent"}`}
                >
                  <span className="font-bold block">Nigerian University</span>
                </button>
              </motion.div>
            ) : (
              <motion.div key="viewing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <InfoRow label={t("gradingSystemLabel")} value={
                  state.settings.gradingSystem === "apc" ? t("apcTogolese")
                  : state.settings.gradingSystem === "french" ? t("frenchTrad")
                  : "Nigerian University"
                } />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Subjects */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="tour-profile-subjects rounded-2xl bg-card border-2 border-border mb-4 overflow-hidden">
          {/* Header — tapping toggles collapse */}
          <button
            onClick={() => setSubjectsOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-4 active:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-black text-foreground">{isNigerian ? "Courses" : "Subjects"}</h3>
                <p className="text-xs text-muted-foreground font-semibold">{subjects.length} {isNigerian ? "course" : "subject"}{subjects.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <motion.div animate={{ rotate: subjectsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {subjectsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-2 flex justify-end">
                  <button
                    onClick={openSubjectModal}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground active:scale-95 transition-transform"
                  >
                    <Plus className="h-3.5 w-3.5" /> {t("addSubjects")}
                  </button>
                </div>

                {subjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-semibold text-center py-4 px-5">{t("noSubjectsAdded")}</p>
                ) : (
                  <div className="flex flex-col px-5 pb-4">
                    <div className="flex items-center border-b border-border pb-1 mb-1">
                      <span className="flex-1 text-xs font-black text-muted-foreground uppercase tracking-wider">{isNigerian ? "Course" : t("subject")}</span>
                      <span className="text-xs font-black text-muted-foreground uppercase tracking-wider pr-8">{isNigerian ? "Credit Units" : t("coefficient")}</span>
                    </div>
                    <AnimatePresence>
                      {[...subjects].sort((a, b) => a.name.localeCompare(b.name)).map((sub) => (
                        <motion.div
                          key={sub.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -60 }}
                          className="flex items-center py-3 border-b border-border/50"
                        >
                          <span className="flex-1 font-bold text-foreground text-sm">{sub.name}</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateSubjectCoeff(sub.id, (isNigerian ? (sub.creditUnits ?? sub.coefficient) : sub.coefficient) - 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-sm font-bold text-foreground active:scale-95">−</button>
                            <span className="w-6 text-center font-black text-foreground text-sm">{isNigerian ? (sub.creditUnits ?? sub.coefficient) : sub.coefficient}</span>
                            <button onClick={() => updateSubjectCoeff(sub.id, (isNigerian ? (sub.creditUnits ?? sub.coefficient) : sub.coefficient) + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-sm font-bold text-foreground active:scale-95">+</button>
                            <button onClick={() => removeSubject(sub.id)} className="ml-1 text-destructive/50 active:text-destructive transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Add Subject Modal */}
      {createPortal(
        <AnimatePresence>
          {showSubjectModal && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/50" onClick={() => setShowSubjectModal(false)} />
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="fixed inset-0 z-[101] flex items-end justify-center pointer-events-none px-4 pb-4"
              >
                <div className="pointer-events-auto w-full max-w-sm bg-card rounded-3xl card-shadow overflow-hidden">
                  <AnimatePresence mode="wait">

                    {/* ── LIST VIEW ── */}
                    {subjectModalView === "list" && (
                      <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                        <div className="flex items-center justify-between px-5 pt-5 pb-3">
                          <div>
                            <h2 className="text-base font-black text-foreground">{isNigerian ? "Add Courses" : t("addSubjects")}</h2>
                            {subjectSelected.size > 0 && <p className="text-xs font-semibold text-primary mt-0.5">{subjectSelected.size} {t("selected")}</p>}
                          </div>
                          <button onClick={() => setShowSubjectModal(false)} className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground active:scale-95">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        {isNigerian ? (
                          /* Nigerian: only custom name input, no preset list */
                          <div className="px-5 pb-5">
                            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Course name</label>
                            <input
                              type="text"
                              placeholder="e.g. MTH 101, ENG 201…"
                              value={subjectCustomName}
                              onChange={(e) => setSubjectCustomName(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && confirmSubjectCustomName()}
                              className="w-full rounded-xl border-2 border-border bg-muted px-4 py-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors mb-3"
                              autoFocus
                            />
                            <button
                              onClick={confirmSubjectCustomName}
                              disabled={!subjectCustomName.trim() || existingSubjectNames.has(subjectCustomName.trim().toLowerCase())}
                              className="w-full rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground active:translate-y-0.5 transition-all disabled:opacity-30 disabled:pointer-events-none"
                            >
                              Add Course
                            </button>
                          </div>
                        ) : (
                          <>
                        <div className="px-4 pb-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder={t("searchOrTypeSubject")}
                              value={subjectSearch}
                              onChange={(e) => setSubjectSearch(e.target.value)}
                              className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-border bg-muted text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                              autoFocus
                            />
                          </div>
                        </div>
                        {/* Persistent custom button */}
                        {!showCustomSubjectOption && (
                          <div className="px-4 pb-2">
                            <button onClick={() => { setSubjectCustomName(""); setSubjectModalView("custom"); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/40 text-muted-foreground active:scale-[0.98] transition-all">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted-foreground/20">
                                <Plus className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-sm font-bold">Create custom subject</span>
                            </button>
                          </div>
                        )}
                        {/* Inline "Add [typed]" when no match */}
                        {showCustomSubjectOption && (
                          <div className="px-4 pb-2">
                            <button onClick={addCustomSubject} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 text-primary active:scale-[0.98] transition-all">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                                <Plus className="h-3.5 w-3.5 text-primary-foreground" />
                              </div>
                              <span className="text-sm font-black">{t("addSubjectBtn")} "{subjectSearch.trim()}"</span>
                            </button>
                          </div>
                        )}
                        <div className="overflow-y-auto max-h-56 px-3 pb-2">
                          {filteredSubjects.length === 0 && !showCustomSubjectOption ? (
                            <p className="text-center text-sm text-muted-foreground py-8 font-semibold">
                              {availableToAdd.length === 0 ? t("allSubjectsAdded") : t("noMatchesTypeCustom")}
                            </p>
                          ) : (
                            filteredSubjects.map((name) => {
                              const isSel = subjectSelected.has(name);
                              return (
                                <button key={name} onClick={() => toggleSubjectSelect(name)} className={`w-full flex items-center justify-between px-3 py-3 rounded-xl mb-1 transition-all active:scale-[0.98] ${isSel ? "bg-primary/15 text-primary" : "hover:bg-muted/60 text-foreground"}`}>
                                  <span className="text-sm font-bold">{name}</span>
                                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${isSel ? "bg-primary border-primary" : "border-border"}`}>
                                    {isSel && <Check className="h-3 w-3 text-primary-foreground" />}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                        {subjectSelected.size > 0 && (
                          <div className="px-5 pb-5 pt-3 border-t border-border">
                            <button onClick={confirmAddSubjects} className="w-full rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground active:translate-y-0.5 transition-all">
                              {t("addSubjectBtn")} {subjectSelected.size} {subjectSelected.size > 1 ? t("subjectsSelectedPlural") : t("subjectsSelected")}
                            </button>
                          </div>
                        )}
                          </>
                        )}
                      </motion.div>
                    )}

                    {/* ── CUSTOM NAME INPUT VIEW ── */}
                    {subjectModalView === "custom" && (
                      <motion.div key="custom" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }}>
                        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                          <button onClick={() => setSubjectModalView("list")} className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground active:scale-95 shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                          <h2 className="text-base font-black text-foreground">Create custom subject</h2>
                        </div>
                        <div className="px-5 pb-3">
                          <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Subject name</label>
                          <input
                            type="text"
                            placeholder="e.g. Latin, Drama, Economics…"
                            value={subjectCustomName}
                            onChange={(e) => setSubjectCustomName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && confirmSubjectCustomName()}
                            className="w-full rounded-xl border-2 border-border bg-muted px-4 py-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                            autoFocus
                          />
                        </div>
                        <div className="px-5 pb-5">
                          <button
                            onClick={confirmSubjectCustomName}
                            disabled={!subjectCustomName.trim() || existingSubjectNames.has(subjectCustomName.trim().toLowerCase())}
                            className="w-full rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground active:translate-y-0.5 transition-all disabled:opacity-30 disabled:pointer-events-none"
                          >
                            Done
                          </button>
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Semesters — Nigerian only */}
      {state?.settings?.gradingSystem === "nigerian_university" && (() => {
        const nigerianState: NigerianState = state.nigerianState ?? {
          semesters: [], cgpa: 0, classOfDegree: "Fail", targetCGPA: null, remainingCreditUnits: 0,
        };

        const activeSemId = nigerianState.activeSemesterId
          ?? (nigerianState.semesters.length > 0 ? nigerianState.semesters[nigerianState.semesters.length - 1].id : undefined);

        const updateNigerianState = (updated: NigerianState) => {
          const newState = { ...state, nigerianState: updated };
          saveState(newState);
          setState(newState);
        };

        const switchToSemester = (semId: string) => {
          updateNigerianState({ ...nigerianState, activeSemesterId: semId });
        };

        const cgpa = nigerianState.semesters.length > 1
          ? computeCGPA(nigerianState.semesters).toFixed(2)
          : null;

        return (
          <div className="content-col px-4 pb-4">
            <div className="rounded-2xl bg-card border-2 border-border overflow-hidden">
              <button
                onClick={() => setSemestersOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 active:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <span className="font-black text-foreground text-sm">Semesters</span>
                  {cgpa && (
                    <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">CGPA {cgpa}</span>
                  )}
                </div>
                <motion.div animate={{ rotate: semestersOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {semestersOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border px-4 pb-4 pt-3 flex flex-col gap-3">

                      {nigerianState.semesters.length === 0 && (
                        <p className="text-sm font-semibold text-muted-foreground text-center py-2">No semesters yet. Add your first one below.</p>
                      )}

                      {nigerianState.semesters.map((sem, i) => {
                        const isActive = sem.id === activeSemId;
                        const isPast = !isActive;
                        return (
                          <div key={sem.id} className={`rounded-2xl border-2 overflow-hidden transition-all ${isActive ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                            {/* Semester header — tap to switch */}
                            <button
                              onClick={() => !isActive && switchToSemester(sem.id)}
                              className={`w-full flex items-center justify-between px-4 py-3 ${!isActive ? "active:bg-muted/40 transition-colors" : ""}`}
                            >
                              <div className="flex flex-col items-start gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{sem.sessionLabel}</span>
                                  {isActive && (
                                    <span className="text-[9px] font-black text-primary bg-primary/15 px-1.5 py-0.5 rounded-full uppercase tracking-widest">Current</span>
                                  )}
                                </div>
                                <span className="text-sm font-black text-foreground">{sem.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="text-right">
                                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">GPA</p>
                                  <p className="text-lg font-black text-foreground leading-none">{sem.gpa.toFixed(2)}</p>
                                </div>
                                {!isActive && (
                                  <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-xl">Switch</span>
                                )}
                                {!isActive && sem.courses.length === 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const updated = {
                                        ...nigerianState,
                                        semesters: nigerianState.semesters.filter(s => s.id !== sem.id),
                                        activeSemesterId: nigerianState.activeSemesterId === sem.id ? undefined : nigerianState.activeSemesterId,
                                      };
                                      updated.cgpa = computeCGPA(updated.semesters);
                                      updated.classOfDegree = classifyDegree(updated.cgpa);
                                      updateNigerianState(updated);
                                    }}
                                    className="text-danger/50 active:text-danger active:scale-90 transition-all"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </button>

                            {/* Active semester: full editable card */}
                            {isActive && (
                              <SemesterCardProfile
                                key={sem.id}
                                semester={sem}
                                index={i}
                                onAddCourse={(semId, name, cu, score) => {
                                  const { letter, points } = scoreToGrade(score);
                                  const gp = computeGP(score, cu);
                                  const newCourse = { id: crypto.randomUUID(), name, creditUnits: cu, score, letter, gradePoints: points, gp };
                                  const updated = {
                                    ...nigerianState,
                                    semesters: nigerianState.semesters.map(s =>
                                      s.id === semId
                                        ? { ...s, courses: [...s.courses, newCourse], gpa: computeSemesterGPA([...s.courses, newCourse]) }
                                        : s
                                    ),
                                  };
                                  updated.cgpa = computeCGPA(updated.semesters);
                                  updated.classOfDegree = classifyDegree(updated.cgpa);
                                  updateNigerianState(updated);
                                }}
                                onRemoveCourse={(semId, courseId) => {
                                  const updated = {
                                    ...nigerianState,
                                    semesters: nigerianState.semesters.map(s =>
                                      s.id === semId
                                        ? { ...s, courses: s.courses.filter(c => c.id !== courseId), gpa: computeSemesterGPA(s.courses.filter(c => c.id !== courseId)) }
                                        : s
                                    ),
                                  };
                                  updated.cgpa = computeCGPA(updated.semesters);
                                  updated.classOfDegree = classifyDegree(updated.cgpa);
                                  updateNigerianState(updated);
                                }}
                                headerHidden // header already shown above
                              />
                            )}

                            {/* Past semester: read-only course list */}
                            {isPast && sem.courses.length > 0 && (
                              <div className="border-t border-border px-4 pb-3 pt-2 flex flex-col gap-1">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Courses</p>
                                {sem.courses.map((c) => (
                                  <div key={c.id} className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-1.5">
                                    <span className="flex-1 text-xs font-bold text-foreground truncate">{c.name}</span>
                                    <span className="text-[10px] font-bold text-muted-foreground">{c.creditUnits} CU</span>
                                    <span className="text-xs font-bold text-foreground">{c.score}</span>
                                    <span className={`text-xs font-black w-5 text-center ${c.letter === "A" ? "text-success" : c.letter === "B" ? "text-primary" : c.letter === "C" ? "text-warning" : "text-danger"}`}>{c.letter}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <AddSemesterInline
                        onAdd={(sessionLabel, name) => {
                          const newSem = { id: crypto.randomUUID(), sessionLabel, name, courses: [], gpa: 0 };
                          const updated = { ...nigerianState, semesters: [...nigerianState.semesters, newSem], activeSemesterId: newSem.id };
                          updated.cgpa = computeCGPA(updated.semesters);
                          updated.classOfDegree = classifyDegree(updated.cgpa);
                          updateNigerianState(updated);
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })()}

      <TaskBar showBack />

      <ScreenIntro
        screenKey="profile"
        title={t("profileIntroTitle")}
        description={t("profileIntroDesc")}
        mascotPose="idle"
        ctaLabel={t("profileIntroCta")}
      />

      <ScreenTour
        storageKey="scoretarget_tour_profile"
        introKey="profile"
        delay={1000}
        steps={[
          { target: ".tour-profile-info", titleKey: "tourProfileInfoTitle", contentKey: "tourProfileInfoContent", duration: 4500 },
          { target: ".tour-profile-target", titleKey: "tourProfileTargetTitle", contentKey: "tourProfileTargetContent", duration: 4500 },
          { target: ".tour-profile-subjects", titleKey: "tourProfileSubjectsTitle", contentKey: "tourProfileSubjectsContent", duration: 4500 },
        ]}
      />

      <>
          <PremiumIntroSheet
            open={showPremiumIntro}
            onClose={() => setShowPremiumIntro(false)}
            onContinue={() => { setShowPremiumIntro(false); setShowPlanSelect(true); }}
          />
          <PlanSelectSheet
            open={showPlanSelect}
            onClose={() => setShowPlanSelect(false)}
            onBack={() => { setShowPlanSelect(false); setShowPremiumIntro(true); }}
            onSelectPack={() => { setShowPlanSelect(false); setShowSubjectPack(true); }}
            onSelectAll={() => { setShowPlanSelect(false); (window as any).__packAmount = undefined; setShowPaymentSheet(true); }}
          />
          <SubjectPackSheet
            open={showSubjectPack}
            onClose={() => setShowSubjectPack(false)}
            onBack={() => { setShowSubjectPack(false); setShowPlanSelect(true); }}
            subjects={state?.subjects?.map(s => s.name) ?? []}
            onConfirm={(subs, amount) => {
              setSelectedSubjects(subs);
              setShowSubjectPack(false);
              (window as any).__packAmount = amount;
              setShowPaymentSheet(true);
            }}
          />
          <PaymentSheet
            open={showPaymentSheet}
            onClose={() => setShowPaymentSheet(false)}
            onBack={() => {
              setShowPaymentSheet(false);
              if (selectedSubjects.length === 0) setShowPlanSelect(true);
              else setShowSubjectPack(true);
            }}
            onSuccess={() => setShowPaymentSheet(false)}
            subjectName={selectedSubjects.length === 1 ? selectedSubjects[0] : undefined}
            amount={(window as any).__packAmount ?? undefined}
          />
        </>
    </div>
  );
};

export default Profile;

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm font-bold text-muted-foreground">{label}</span>
      <span className="text-sm font-black text-foreground">{value}</span>
    </div>
  );
}


// ── Semester components for Profile ──────────────────────────────────────

import { NigerianSemester } from "@/types/nigerian";

function SemesterCardProfile({
  semester, index, onAddCourse, onRemoveCourse, headerHidden = false,
}: {
  semester: NigerianSemester;
  index: number;
  onAddCourse: (semId: string, name: string, cu: number, score: number) => void;
  onRemoveCourse: (semId: string, courseId: string) => void;
  headerHidden?: boolean;
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
      className="overflow-hidden"
    >
      {!headerHidden && (
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-3 active:bg-muted/40 transition-colors">
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
      )}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
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
                      <motion.div key={course.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex items-center rounded-xl bg-muted/50 px-3 py-2 gap-1">
                        <span className="flex-1 text-sm font-bold text-foreground truncate">{course.name}</span>
                        <span className="w-8 text-center text-xs font-bold text-muted-foreground">{course.creditUnits}</span>
                        <span className="w-10 text-center text-xs font-bold text-foreground">{course.score}</span>
                        <span className={`w-8 text-center text-xs font-black ${course.letter === "A" ? "text-success" : course.letter === "B" ? "text-primary" : course.letter === "C" ? "text-warning" : course.letter === "F" ? "text-danger" : "text-muted-foreground"}`}>{course.letter}</span>
                        <span className="w-8 text-center text-xs font-bold text-foreground">{course.gp}</span>
                        <button onClick={() => onRemoveCourse(semester.id, course.id)} className="w-8 flex items-center justify-center text-destructive/50 active:text-destructive active:scale-90 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
              <div className="rounded-2xl bg-muted/40 border-2 border-dashed border-border p-3 flex flex-col gap-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Add Course</p>
                <input type="text" placeholder="Course name" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border-2 border-border bg-card px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input type="number" placeholder="Units (1–6)" value={cu} min={1} max={6} onChange={e => { setCu(e.target.value); setCuErr(validateCreditUnits(Math.floor(Number(e.target.value)))); }} className={`w-full rounded-xl border-2 bg-card px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${cuErr ? "border-danger" : "border-border focus:border-primary"}`} />
                    {cuErr && <p className="text-[10px] font-bold text-danger mt-0.5 px-1">{cuErr}</p>}
                  </div>
                  <div className="flex-1">
                    <input type="number" placeholder="Score (0–100)" value={score} min={0} max={100} onChange={e => { setScore(e.target.value); setScoreErr(validateScore(Math.floor(Number(e.target.value)))); }} className={`w-full rounded-xl border-2 bg-card px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${scoreErr ? "border-danger" : "border-border focus:border-primary"}`} />
                    {scoreErr && <p className="text-[10px] font-bold text-danger mt-0.5 px-1">{scoreErr}</p>}
                  </div>
                </div>
                <button onClick={() => { if (!canAdd) return; onAddCourse(semester.id, name.trim(), Math.floor(Number(cu)), Math.floor(Number(score))); setName(""); setCu(""); setScore(""); setScoreErr(null); setCuErr(null); }} disabled={!canAdd} className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-extrabold text-primary-foreground active:scale-95 transition-transform disabled:opacity-30 disabled:pointer-events-none">
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

function AddSemesterInline({ onAdd }: { onAdd: (sessionLabel: string, name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [sessionLabel, setSessionLabel] = useState("");
  const [semName, setSemName] = useState("");
  const canSubmit = sessionLabel.trim().length > 0 && semName.trim().length > 0;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 py-3 text-sm font-extrabold text-primary active:scale-[0.98] transition-all">
        <Plus className="h-4 w-4" /> New Semester
      </button>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-card border-2 border-primary/40 p-4 flex flex-col gap-3">
      <div>
        <p className="text-sm font-black text-foreground">New Semester</p>
        <p className="text-xs font-semibold text-muted-foreground mt-0.5">This will switch the app to the new semester. You can always switch back.</p>
      </div>
      <input type="text" placeholder="Session (e.g. 2023/2024)" value={sessionLabel} onChange={e => setSessionLabel(e.target.value)} autoFocus className="w-full rounded-xl border-2 border-border bg-muted px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
      <input type="text" placeholder="Semester name (e.g. First Semester)" value={semName} onChange={e => setSemName(e.target.value)} onKeyDown={e => e.key === "Enter" && canSubmit && (onAdd(sessionLabel.trim(), semName.trim()), setOpen(false), setSessionLabel(""), setSemName(""))} className="w-full rounded-xl border-2 border-border bg-muted px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
      <div className="flex gap-2">
        <button onClick={() => { setOpen(false); setSessionLabel(""); setSemName(""); }} className="flex-1 rounded-xl border-2 border-border py-2.5 text-sm font-extrabold text-foreground active:scale-95 transition-transform">Cancel</button>
        <button onClick={() => { if (!canSubmit) return; onAdd(sessionLabel.trim(), semName.trim()); setOpen(false); setSessionLabel(""); setSemName(""); }} disabled={!canSubmit} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-extrabold text-primary-foreground active:scale-95 transition-transform disabled:opacity-30 disabled:pointer-events-none">Create</button>
      </div>
    </motion.div>
  );
}
