import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { ArrowLeft, User, Target, BookOpen, Pencil, Check, Settings, Crown, ChevronRight, Plus, Trash2, Search, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { loadState, saveState } from "@/lib/storage";
import { AppState, Subject } from "@/types/exam";
import { CLASS_LEVELS, LYCEE_SERIES, getSubjectsForLevel } from "@/lib/subjects-data";
import TaskBar from "@/components/TaskBar";
import ScreenIntro from "@/components/ScreenIntro";
import { PremiumIntroSheet } from "@/components/subscription/PremiumIntroSheet";
import { PlanSelectSheet } from "@/components/subscription/PlanSelectSheet";
import { SubjectPackSheet } from "@/components/subscription/SubjectPackSheet";
import { PaymentSheet } from "@/components/subscription/PaymentSheet";
import { useLanguage } from "@/contexts/LanguageContext";

const allLevels = [...CLASS_LEVELS.college, ...CLASS_LEVELS.lycee];
const isLycee = (level: string) => (CLASS_LEVELS.lycee as readonly string[]).includes(level);

const Profile = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [state, setState] = useState<AppState | null>(null);
  const [editingBasic, setEditingBasic] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [editingGrading, setEditingGrading] = useState(false);
  const [editingSubjects, setEditingSubjects] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectSelected, setSubjectSelected] = useState<Set<string>>(new Set());
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [draft, setDraft] = useState({ studentName: "", classLevel: "", serie: "", semester: "" });
  const [draftTarget, setDraftTarget] = useState(16);

  // Premium flow
  const [showPremiumIntro, setShowPremiumIntro] = useState(false);
  const [showPlanSelect, setShowPlanSelect] = useState(false);
  const [showSubjectPack, setShowSubjectPack] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  useEffect(() => {
    const loaded = loadState();
    if (loaded) setState(loaded);
    else navigate("/");
  }, [navigate]);

  if (!state) return null;

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
    setDraft({ studentName: state.studentName || "", classLevel: state.classLevel || "", serie: state.serie || "", semester: state.semester || "" });
    setEditingBasic(true);
  };

  const saveBasic = () => {
    updateState({ studentName: draft.studentName, classLevel: draft.classLevel, serie: isLycee(draft.classLevel) ? draft.serie : undefined, semester: draft.semester });
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
    const newSubs: Subject[] = Array.from(subjectSelected).map((name) => ({
      id: crypto.randomUUID(),
      name,
      coefficient: 1,
      marks: { interro: null, dev: null, compo: null },
    }));
    updateState({ subjects: [...subjects, ...newSubs] });
    setSubjectSelected(new Set());
    setSubjectSearch("");
    setShowSubjectModal(false);
  };

  const addCustomSubject = () => {
    const name = subjectSearch.trim();
    if (!name || existingSubjectNames.has(name.toLowerCase())) return;
    const newSub: Subject = { id: crypto.randomUUID(), name, coefficient: 1, marks: { interro: null, dev: null, compo: null } };
    const selectedSubs: Subject[] = Array.from(subjectSelected).map((n) => ({
      id: crypto.randomUUID(), name: n, coefficient: 1, marks: { interro: null, dev: null, compo: null },
    }));
    updateState({ subjects: [...subjects, newSub, ...selectedSubs] });
    setSubjectSearch("");
    setSubjectSelected(new Set());
    setShowSubjectModal(false);
  };

  const updateSubjectCoeff = (id: string, coeff: number) => {
    updateState({ subjects: subjects.map((s) => s.id === id ? { ...s, coefficient: Math.max(1, coeff) } : s) });
  };

  const removeSubject = (id: string) => {
    updateState({ subjects: subjects.filter((s) => s.id !== id) });
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-20">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-6 py-3 flex items-center justify-between safe-area-top">
        <h1 className="text-lg font-black text-primary">{t("yourProfile")}</h1>
        <Link to="/settings" className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-foreground bg-card text-foreground active:scale-95 transition-all card-shadow">
          <Settings className="h-4 w-4" />
        </Link>
      </div>

      <div className="flex flex-col gap-6 px-6 py-6">

        {/* Premium banner */}
        <motion.button
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={() => setShowPremiumIntro(true)}
          className="w-full rounded-2xl bg-premium border-2 border-premium p-4 card-shadow active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-4 text-left"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-premium-foreground/20 border-2 border-premium-foreground/30 shrink-0">
            <Crown className="h-6 w-6 text-premium-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-black text-premium-foreground text-sm">{t("unlockPremium")}</p>
            <p className="text-[10px] font-semibold text-premium-foreground/70 mt-0.5">{t("monthsAccess")} · {t("prepToolsEvery")}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-premium-foreground/60 shrink-0" />
        </motion.button>
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-2xl bg-card p-5 border-2 border-border">
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
              </motion.div>
            ) : (
              <motion.div key="viewing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <InfoRow label={t("fullName")} value={state.studentName || "—"} />
                <InfoRow label={t("classLevel")} value={state.classLevel || "—"} />
                {state.classLevel && isLycee(state.classLevel) && (
                  <InfoRow label="Série" value={state.serie ? `Série ${state.serie}` : "—"} />
                )}
                <InfoRow label={t("semester")} value={state.semester || "—"} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Target Average */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-2xl bg-card p-5 border-2 border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                <Target className="h-5 w-5 text-secondary" />
              </div>
              <h3 className="font-black text-foreground">{t("targetAverage")}</h3>
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
                    <span className="text-5xl font-black text-primary">{draftTarget.toFixed(1)}</span>
                    <span className="text-xl font-bold text-muted-foreground">– 20 / 20</span>
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground mt-1">{t("minimumTarget")}</p>
                </div>
                <input
                  type="range" min="0" max="20" step="0.5"
                  value={draftTarget}
                  onChange={(e) => setDraftTarget(parseFloat(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary mt-4"
                />
                <div className="flex justify-between w-full text-xs font-bold text-muted-foreground mt-2 px-1">
                  <span>0</span><span>10</span><span>20</span>
                </div>
              </motion.div>
            ) : (
              <motion.div key="viewing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-2">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">{t("targetRange")}</p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-black text-primary">{state.targetMin ?? state.targetAverage}</span>
                  <span className="text-xl font-bold text-muted-foreground">– 20 / 20</span>
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
              </motion.div>
            ) : (
              <motion.div key="viewing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <InfoRow label={t("gradingSystemLabel")} value={state.settings.gradingSystem === "apc" ? t("apcTogolese") : t("frenchTrad")} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Subjects */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="rounded-2xl bg-card p-5 border-2 border-border mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-black text-foreground">{t("addSubjects")}</h3>
                <p className="text-xs text-muted-foreground font-semibold">{subjects.length} {subjects.length === 1 ? t("subjectsSelected") : t("subjectsSelectedPlural")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openSubjectModal}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground active:scale-95 transition-transform"
              >
                <Plus className="h-3.5 w-3.5" /> {t("addSubjects")}
              </button>
            </div>
          </div>

          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground font-semibold text-center py-4">{t("noSubjectsAdded")}</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center border-b border-border pb-1 mb-1">
                <span className="flex-1 text-xs font-black text-muted-foreground uppercase tracking-wider">{t("subject")}</span>
                <span className="text-xs font-black text-muted-foreground uppercase tracking-wider pr-8">{t("coefficient")}</span>
              </div>
              <AnimatePresence>
                {subjects.map((sub) => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -60 }}
                    className="flex items-center py-3 border-b border-border/50"
                  >
                    <span className="flex-1 font-bold text-foreground text-sm">{sub.name}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateSubjectCoeff(sub.id, sub.coefficient - 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-sm font-bold text-foreground active:scale-95">−</button>
                      <span className="w-6 text-center font-black text-foreground text-sm">{sub.coefficient}</span>
                      <button onClick={() => updateSubjectCoeff(sub.id, sub.coefficient + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-sm font-bold text-foreground active:scale-95">+</button>
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
                  <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <div>
                      <h2 className="text-base font-black text-foreground">{t("addSubjects")}</h2>
                      {subjectSelected.size > 0 && <p className="text-xs font-semibold text-primary mt-0.5">{subjectSelected.size} {t("selected")}</p>}
                    </div>
                    <button onClick={() => setShowSubjectModal(false)} className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground active:scale-95">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
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
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      <TaskBar showBack />

      <ScreenIntro
        screenKey="profile"
        title={t("profileIntroTitle")}
        description={t("profileIntroDesc")}
        mascotPose="idle"
        ctaLabel={t("profileIntroCta")}
      />

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

