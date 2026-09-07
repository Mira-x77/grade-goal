/**
 * SimpleOnboarding — the ONE and ONLY onboarding in the app.
 *
 * Steps:
 *   1. Name
 *   2. Grading system (APC / French / Nigerian University)
 *   3. Class level  (varies by system)
 *   4. Target grade
 *   5. Add subjects
 *
 * On completion saves the full AppState and navigates to /.
 * ProtectedRoute checks for `studentName` + `gradingSystem` to decide
 * whether onboarding is complete.
 */

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, Target, GraduationCap,
  ChevronDown, Check, ArrowLeft,
} from "lucide-react";
import { DEFAULT_SETTINGS, GradingSystem, AppState, Subject } from "@/types/exam";
import { loadState, saveState } from "@/lib/storage";
import { CLASS_LEVELS, LYCEE_SERIES_BY_LEVEL } from "@/lib/subjects-data";
import { useLanguage } from "@/contexts/LanguageContext";
import SubjectsSetup from "@/components/SubjectsSetup";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// Onboarding illustrations
import welcomeImg from "@/assets/onboarding/welcome.jpeg";
import searchImg from "@/assets/onboarding/search.jpeg";
import confirmImg from "@/assets/onboarding/confirm.jpeg";

// ─── Shared helpers ────────────────────────────────────────────────────────

const allLycee = CLASS_LEVELS.lycee as readonly string[];
const isLycee = (lvl: string) => allLycee.includes(lvl);

const NIGERIAN_DEPARTMENTS = [
  "Accounting", "Agricultural Science", "Architecture", "Banking & Finance",
  "Biochemistry", "Biology", "Business Administration", "Chemical Engineering",
  "Chemistry", "Civil Engineering", "Computer Engineering", "Computer Science",
  "Criminology", "Economics", "Education", "Electrical Engineering",
  "English Language", "Environmental Science", "Estate Management",
  "Fine & Applied Arts", "Food Science & Technology", "Geography",
  "Geology", "History & International Studies", "Industrial Chemistry",
  "Information Technology", "International Relations", "Law",
  "Library & Information Science", "Linguistics", "Mass Communication",
  "Mathematics", "Mechanical Engineering", "Medicine & Surgery",
  "Microbiology", "Nursing", "Nutrition & Dietetics", "Petroleum Engineering",
  "Pharmacy", "Philosophy", "Physics", "Political Science", "Psychology",
  "Public Administration", "Quantity Surveying", "Religious Studies",
  "Sociology", "Software Engineering", "Statistics", "Surveying & Geoinformatics",
  "Theatre Arts", "Urban & Regional Planning", "Veterinary Medicine",
  "Zoology",
];

const NIGERIAN_LEVELS = ["100", "200", "300", "400", "500"] as const;

// ─── Portal dropdown ────────────────────────────────────────────────────────

interface DropdownProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}

function AppDropdown({ value, onChange, placeholder, options }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const panelHeight = Math.min(224, options.length * 48 + 8);
      const showAbove = spaceBelow < panelHeight + 8;
      setPanelStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        ...(showAbove
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    }
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={`w-full rounded-xl border-2 bg-card px-4 py-3 font-semibold text-left flex items-center justify-between transition-colors ${
          open ? "border-primary" : "border-border"
        } ${value ? "text-foreground" : "text-muted-foreground"}`}
      >
        <span>{selected?.label ?? placeholder}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </motion.div>
      </button>

      {open && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setOpen(false)}
            style={{ touchAction: "none" }}
          />
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={panelStyle}
            className="bg-card border-2 border-foreground rounded-2xl card-shadow overflow-hidden"
          >
            <div
              className="max-h-56 overflow-y-auto py-1 overscroll-contain"
              onTouchMove={e => e.stopPropagation()}
            >
              {options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors active:bg-muted/60 ${
                    opt.value === value ? "text-primary bg-primary/10" : "text-foreground"
                  }`}
                >
                  <span>{opt.label}</span>
                  {opt.value === value && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </motion.div>
        </>,
        document.body
      )}
    </div>
  );
}

// ─── Fixed bottom button ────────────────────────────────────────────────────

function NextButton({
  onClick,
  disabled = false,
  label,
  hint,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  hint?: React.ReactNode;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-background via-background to-transparent">
      <div className="w-full max-w-sm mx-auto px-6">
        {hint && <div className="mb-3 w-full flex justify-center">{hint}</div>}
        <button
          onClick={onClick}
          disabled={disabled}
          className="w-full rounded-2xl bg-secondary border-2 border-foreground py-4 text-base font-black text-foreground card-shadow active:translate-y-1 active:shadow-none transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          {label}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5;

export default function SimpleOnboarding() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Load any previously stored state so returning users don't lose data
  const saved = loadState();

  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  // Step 1 — Name
  const [name, setName] = useState(saved?.studentName ?? "");

  // Step 2 — Grading system
  const [gradingSystem, setGradingSystem] = useState<GradingSystem>(
    saved?.settings?.gradingSystem ?? "apc"
  );

  // Step 3 — Class / level details
  const [schoolTab, setSchoolTab] = useState<"college" | "lycee">("college");
  const [classLevel, setClassLevel] = useState(saved?.classLevel ?? "");
  const [serie, setSerie] = useState(saved?.serie ?? "");
  const [semester, setSemester] = useState(saved?.semester ?? "");
  const [department, setDepartment] = useState(saved?.department ?? "");
  const [uniLevel, setUniLevel] = useState(saved?.universityLevel ?? "");
  const [nigerianSemester, setNigerianSemester] = useState(saved?.semester ?? "");

  // Step 4 — Target
  const defaultTarget = gradingSystem === "nigerian_university" ? 4.0 : 16;
  const [target, setTarget] = useState<number>(
    saved?.targetAverage ?? defaultTarget
  );

  // Step 5 — Subjects (reuse SubjectsSetup which handles add/remove)
  const [subjects, setSubjects] = useState<Subject[]>(saved?.subjects ?? []);

  const isNigerian = gradingSystem === "nigerian_university";

  // Sync target range when system changes
  useEffect(() => {
    setTarget(isNigerian ? 4.0 : 16);
  }, [gradingSystem]); // eslint-disable-line react-hooks/exhaustive-deps

  // Step 3 validation (class/level details)
  const step3Valid = isNigerian
    ? !!department && !!uniLevel && !!nigerianSemester
    : !!classLevel && (!isLycee(classLevel) || !!serie) && !!semester;

  const stepVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  const TOTAL_STEPS = 5;

  const goNext = () => {
    if (step < 5) setStep((s) => (s + 1) as Step);
  };

  const goBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const handleFinish = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const base: AppState = saved ?? {
        step: "marks" as const,
        targetAverage: target,
        targetMin: target,
        subjects: [],
        settings: DEFAULT_SETTINGS,
      };

      const updated: AppState = {
        ...base,
        step: "marks",
        studentName: name.trim(),
        classLevel,
        serie,
        semester: isNigerian ? nigerianSemester : semester,
        department,
        universityLevel: uniLevel,
        targetAverage: target,
        targetMin: target,
        subjects,
        settings: {
          ...(base.settings ?? DEFAULT_SETTINGS),
          gradingSystem,
        },
        // Mark onboarding as completed
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        // Set account creation timestamp if this is first time
        account_created_at: base.account_created_at ?? new Date().toISOString(),
      };

      // Save to localStorage first (immediate, synchronous)
      saveState(updated);
      localStorage.setItem("grade_calculator_setup_done", "true");

      // If user is authenticated, save to Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          const { saveAppStateToCloud } = await import("@/services/cloudSyncService");
          await saveAppStateToCloud(session.user.id, {
            ...updated,
            last_synced_at: new Date().toISOString(),
          });
          console.log("✅ Onboarding data saved to Supabase");
        } catch (syncError) {
          console.warn("⚠️ Failed to sync onboarding to cloud:", syncError);
          // Don't block navigation if cloud save fails
          // Data is already in localStorage and will sync later
        }
      } else {
        console.log("📱 Guest mode: onboarding saved locally, will sync on sign-in");
      }

      // Allow navigation to Home without mandatory auth (Google sign-in was offered at end of onboarding)
      if (!session?.user) {
        localStorage.setItem("guest_mode", "true");
      }

      // Navigate to home
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      toast.error("Failed to save your settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };



  return (
    <div className="min-h-screen bg-background flex flex-col items-center safe-area-top">

      {/* ── Top bar: back + progress dots ── */}
      <div className="w-full max-w-sm px-6 pt-6 flex items-center gap-4">
        <button
          onClick={goBack}
          className={`rounded-xl border-2 border-foreground bg-card p-2 transition-all active:scale-95 ${step === 1 ? "invisible pointer-events-none" : ""}`}
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>

        {/* Progress dots */}
        <div className="flex gap-2 flex-1 justify-center">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <motion.div
              key={s}
              animate={{ width: step === s ? 24 : 8, opacity: step >= s ? 1 : 0.3 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`h-2 rounded-full ${step >= s ? "bg-secondary" : "bg-muted"}`}
            />
          ))}
        </div>

        {/* Spacer to balance the back button */}
        <div className="w-10" />
      </div>

      <div className="w-full max-w-sm px-6 flex flex-col items-center flex-1">
        <AnimatePresence mode="wait">

          {/* ════════════════════════════════════════
              STEP 1 — Name
          ════════════════════════════════════════ */}
          {step === 1 && (
            <motion.div
              key="step2"
              variants={stepVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.22 }}
              className="w-full flex flex-col items-center gap-6 pt-6 pb-36"
            >
              <div className="w-32 h-32 mx-auto rounded-3xl bg-secondary/20 border-2 border-border flex items-center justify-center overflow-hidden">
                <img src={welcomeImg} alt="Welcome" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-black text-foreground">Hey there!</h1>
                <p className="text-sm font-semibold text-muted-foreground mt-1">What should we call you?</p>
              </div>
              <div className="w-full">
                <label className="text-sm font-bold text-muted-foreground mb-1 block">Your name</label>
                <input
                  type="text"
                  placeholder="e.g. Kofi, Ama, Chidi…"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && name.trim() && goNext()}
                  autoFocus
                  className="w-full rounded-2xl border-2 border-border bg-card px-4 py-3.5 font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors text-base"
                />
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════
              STEP 2 — Grading System
          ════════════════════════════════════════ */}
          {step === 2 && (
            <motion.div
              key="step3"
              variants={stepVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.22 }}
              className="w-full flex flex-col items-center gap-6 pt-6 pb-36"
            >
              <div className="text-center">
                <h1 className="text-2xl font-black text-foreground">
                  Nice to meet you, {name.split(" ")[0]}!
                </h1>
                <p className="text-sm font-semibold text-muted-foreground mt-1">
                  Which grading system does your school use?
                </p>
              </div>

              <div className="w-full flex flex-col gap-3">
                {([
                  {
                    id: "apc" as GradingSystem,
                    icon: <BookOpen className="h-5 w-5 text-foreground" />,
                    title: t("apcSystem"),
                    sub: t("togoleseStandard"),
                  },
                  {
                    id: "french" as GradingSystem,
                    icon: <Target className="h-5 w-5 text-foreground" />,
                    title: t("frenchTraditional"),
                    sub: t("comparativeRanking"),
                  },
                  {
                    id: "nigerian_university" as GradingSystem,
                    icon: <GraduationCap className="h-5 w-5 text-foreground" />,
                    title: t("nigerianUniversity"),
                    sub: t("gpaCgpaCredit"),
                  },
                ] as const).map(({ id, icon, title, sub }) => (
                  <button
                    key={id}
                    onClick={() => setGradingSystem(id)}
                    className={`rounded-2xl p-5 text-left transition-all active:scale-[0.98] border-2 border-foreground card-shadow ${
                      gradingSystem === id ? "bg-secondary" : "bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-foreground bg-background">
                        {icon}
                      </div>
                      <div>
                        <p className="font-black text-foreground">{title}</p>
                        <p className="text-xs font-semibold text-muted-foreground">{sub}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════
              STEP 3 — Class / Level details
          ════════════════════════════════════════ */}
          {step === 3 && (
            <motion.div
              key="step3"
              variants={stepVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.22 }}
              className="w-full flex flex-col items-center gap-5 pt-6 pb-36 overflow-y-auto min-h-screen"
            >
              <div className="w-32 h-32 mx-auto rounded-3xl bg-secondary/20 border-2 border-border flex items-center justify-center overflow-hidden mb-2">
                <img src={searchImg} alt="Search" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-black text-foreground">Almost there!</h1>
                <p className="text-sm font-semibold text-muted-foreground mt-1">
                  {isNigerian ? "Tell us about your university year" : "Tell us about your class"}
                </p>
              </div>

              <div className="w-full flex flex-col gap-4">

                {/* ── Nigerian ── */}
                {isNigerian && (
                  <>
                    <div>
                      <label className="text-sm font-bold text-muted-foreground mb-1 block">Department / Faculty</label>
                      <AppDropdown
                        value={department}
                        onChange={(val) => { setDepartment(val); setUniLevel(""); }}
                        placeholder="Select your department"
                        options={NIGERIAN_DEPARTMENTS.map(d => ({ value: d, label: d }))}
                      />
                    </div>

                    <AnimatePresence>
                      {department && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <label className="text-sm font-bold text-muted-foreground mb-1 block">Level</label>
                          <AppDropdown
                            value={uniLevel}
                            onChange={setUniLevel}
                            placeholder="Select your level"
                            options={NIGERIAN_LEVELS.map(lvl => ({ value: lvl, label: `${lvl} Level` }))}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {uniLevel && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <label className="text-sm font-bold text-muted-foreground mb-1 block">Semester</label>
                          <div className="flex flex-col gap-2">
                            {(["First Semester", "Second Semester"] as const).map((sem) => (
                              <button
                                key={sem}
                                onClick={() => setNigerianSemester(sem)}
                                className={`rounded-2xl p-4 text-left transition-all active:scale-[0.98] border-2 border-foreground card-shadow font-black text-foreground ${
                                  nigerianSemester === sem ? "bg-secondary" : "bg-card"
                                }`}
                              >
                                {sem}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}

                {/* ── APC / French ── */}
                {!isNigerian && (
                  <>
                    <div>
                      <label className="text-sm font-bold text-muted-foreground mb-2 block">{t("classLevel")}</label>
                      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-3">
                        {(["college", "lycee"] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => {
                              setSchoolTab(tab);
                              if (tab === "college" && isLycee(classLevel)) {
                                setClassLevel(""); setSerie("");
                              }
                              if (tab === "lycee" && classLevel && !isLycee(classLevel)) {
                                setClassLevel("");
                                if (semester === "3rd Semester") setSemester("");
                              }
                            }}
                            className={`flex-1 rounded-lg py-2 text-sm font-black transition-all ${
                              schoolTab === tab
                                ? "bg-card border-2 border-foreground text-foreground card-shadow"
                                : "text-muted-foreground"
                            }`}
                          >
                            {tab === "college" ? t("collegeTab") : t("lyceeTab")}
                          </button>
                        ))}
                      </div>

                      <AnimatePresence mode="wait">
                        <motion.div
                          key={schoolTab}
                          initial={{ opacity: 0, x: schoolTab === "lycee" ? 20 : -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: schoolTab === "lycee" ? -20 : 20 }}
                          transition={{ duration: 0.15 }}
                          className="grid grid-cols-2 gap-2"
                        >
                          {(schoolTab === "college" ? CLASS_LEVELS.college : CLASS_LEVELS.lycee).map((lvl) => (
                            <button
                              key={lvl}
                              onClick={() => { setClassLevel(lvl); setSerie(""); if (semester === "3rd Semester") setSemester(""); }}
                              className={`rounded-xl px-3 py-2.5 text-sm font-black transition-all active:scale-95 border-2 border-foreground ${
                                classLevel === lvl ? "bg-secondary text-foreground card-shadow" : "bg-card text-foreground"
                              }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {isLycee(classLevel) && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                        <label className="text-sm font-bold text-muted-foreground mb-1 block">{t("serieLabel")}</label>
                        <div className="grid grid-cols-2 gap-2">
                          {(LYCEE_SERIES_BY_LEVEL[classLevel] ?? []).map((s) => (
                            <button
                              key={s}
                              onClick={() => setSerie(s)}
                              className={`rounded-xl px-3 py-2.5 text-sm font-black transition-all active:scale-95 border-2 border-foreground ${
                                serie === s ? "bg-secondary text-foreground card-shadow" : "bg-card text-foreground"
                              }`}
                            >
                              {t("serieLabel")} {s}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {classLevel && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2">
                        <label className="text-sm font-bold text-muted-foreground mb-1 block">{t("semester")}</label>
                        <div className={`grid gap-2 ${isLycee(classLevel) ? "grid-cols-2" : "grid-cols-3"}`}>
                          {(isLycee(classLevel)
                            ? [
                                { key: "1st Semester", label: t("firstSemester") },
                                { key: "2nd Semester", label: t("secondSemester") },
                              ]
                            : [
                                { key: "1st Semester", label: t("firstSemester") },
                                { key: "2nd Semester", label: t("secondSemester") },
                                { key: "3rd Semester", label: t("thirdSemester") },
                              ]
                          ).map(({ key, label }) => (
                            <button
                              key={key}
                              onClick={() => setSemester(key)}
                              className={`rounded-xl px-3 py-2.5 text-xs font-black transition-all active:scale-95 border-2 border-foreground ${
                                semester === key ? "bg-secondary text-foreground card-shadow" : "bg-card text-foreground"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════
              STEP 4 — Target
          ════════════════════════════════════════ */}
          {step === 4 && (
            <motion.div
              key="step4"
              variants={stepVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.22 }}
              className="w-full flex flex-col items-center gap-8 pt-6 pb-36"
            >
              <div className="w-32 h-32 mx-auto rounded-3xl bg-secondary/20 border-2 border-border flex items-center justify-center overflow-hidden mb-2">
                <img src={confirmImg} alt="Confirm" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-black text-foreground">Set your goal</h1>
                <p className="text-sm font-semibold text-muted-foreground mt-1">
                  {t("setYearlyAverage")}
                </p>
              </div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-full"
              >
                {isNigerian ? (
                  <div className="rounded-2xl bg-card p-8 border-2 border-border text-center">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Target GPA</p>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-5xl font-black text-primary">{target.toFixed(2)}</span>
                      <span className="text-xl font-bold text-muted-foreground">/ 5.00</span>
                    </div>
                    <div className="mt-8">
                      <input
                        type="range" min="0" max="5" step="0.05"
                        value={target}
                        onChange={(e) => setTarget(parseFloat(e.target.value))}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-xs font-bold text-muted-foreground mt-2 px-1">
                        <span>0.00</span><span>2.50</span><span>5.00</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-card p-8 border-2 border-border text-center">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">{t("targetRange")}</p>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-5xl font-black text-primary">{target.toFixed(1)}</span>
                      <span className="text-xl font-bold text-muted-foreground">– 20 / 20</span>
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground mt-1">{t("minimumTarget")}</p>
                    <div className="mt-8">
                      <input
                        type="range" min="0" max="20" step="0.5"
                        value={target}
                        onChange={(e) => setTarget(parseFloat(e.target.value))}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-xs font-bold text-muted-foreground mt-2 px-1">
                        <span>0</span><span>10</span><span>20</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════
              STEP 5 — Subjects
          ════════════════════════════════════════ */}
          {step === 5 && (
            <motion.div
              key="step5"
              variants={stepVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.22 }}
              className="w-full pb-36 pt-2"
            >
              <div className="text-center mb-6">
                <h1 className="text-2xl font-black text-foreground">Add your subjects</h1>
                <p className="text-sm font-semibold text-muted-foreground mt-1">Select the subjects you're studying</p>
              </div>
              <SubjectsSetup
                subjects={subjects}
                onSubjectsChange={setSubjects}
                onContinue={handleFinish}
                onBack={goBack}
                classLevel={classLevel}
                serie={serie}
                isNigerian={isNigerian}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Bottom button (steps 1–4 only; step 5 uses SubjectsSetup button) ── */}
      {step < 5 && (
        <NextButton
          onClick={() => {
            if (step === 1 && name.trim()) goNext();
            else if (step === 2) goNext();
            else if (step === 3 && step3Valid) goNext();
            else if (step === 4) goNext();
          }}
          disabled={
            (step === 1 && !name.trim()) ||
            (step === 3 && !step3Valid)
          }
          label="Next →"
          hint={
            step === 3 && !step3Valid && (department || classLevel) ? (
              <p className="text-xs font-bold text-muted-foreground text-center">
                {isNigerian
                  ? !department ? "Select your department" : !uniLevel ? "Select your level" : "Select your semester"
                  : !classLevel ? t("chooseYourClass")
                  : isLycee(classLevel) && !serie ? t("chooseYourSerie")
                  : t("chooseYourSemester")}
              </p>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
