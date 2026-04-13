import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Target, BookOpen, GraduationCap, ChevronDown, Check } from "lucide-react";
import { GradingSystem } from "@/types/exam";
import { CLASS_LEVELS, LYCEE_SERIES } from "@/lib/subjects-data";
import Mascot from "@/components/Mascot";
import { useLanguage } from "@/contexts/LanguageContext";

export type OnboardingStep = "system" | "profile" | "semester" | "target";

// ── Custom dropdown — portal-based to escape overflow:hidden/auto containers ──

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
    // Only close on scroll events outside the panel itself
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
          {/* Backdrop — pointer events only, no touch-action blocking */}
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
            {/* overscroll-contain prevents the scroll from bubbling and closing the dropdown */}
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

interface OnboardingScreenProps {
  targetAverage: number;
  onTargetChange: (value: number) => void;
  onContinue: () => void;
  gradingSystem: GradingSystem;
  onGradingSystemChange: (system: GradingSystem) => void;
  studentName: string;
  onStudentNameChange: (name: string) => void;
  classLevel: string;
  onClassLevelChange: (level: string) => void;
  serie: string;
  onSerieChange: (serie: string) => void;
  semester: string;
  onSemesterChange: (semester: string) => void;
  department: string;
  onDepartmentChange: (department: string) => void;
  level: string;
  onLevelChange: (level: string) => void;
  nigerianSemester: string;
  onNigerianSemesterChange: (semester: string) => void;
  step: OnboardingStep;
  onStepChange: (step: OnboardingStep) => void;
}

const allLevels = [...CLASS_LEVELS.college, ...CLASS_LEVELS.lycee];
const isLycee = (level: string) => (CLASS_LEVELS.lycee as readonly string[]).includes(level);

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

const FixedNextButton = ({ onClick, disabled = false, label, hint }: { onClick: () => void; disabled?: boolean; label: string; hint?: React.ReactNode }) => (
  <div className="fixed bottom-0 left-0 right-0 z-30 pb-10 pt-2 bg-gradient-to-t from-background via-background to-transparent">
    <div className="content-col max-w-lg mx-auto">
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

const OnboardingScreen = ({
  targetAverage, onTargetChange, onContinue,
  gradingSystem, onGradingSystemChange,
  studentName, onStudentNameChange,
  classLevel, onClassLevelChange,
  serie, onSerieChange,
  semester, onSemesterChange,
  department, onDepartmentChange,
  level, onLevelChange,
  nigerianSemester, onNigerianSemesterChange,
  step, onStepChange
}: OnboardingScreenProps) => {
  const { t, language, setLang } = useLanguage();
  const [schoolTab, setSchoolTab] = useState<"college" | "lycee">(
    isLycee(classLevel) ? "lycee" : "college"
  );

  const NIGERIAN_LEVELS = ["100", "200", "300", "400", "500"] as const;

  const profileValid = !!studentName.trim() && !!classLevel && (!isLycee(classLevel) || !!serie) && !!semester;
  const nigerianProfileValid = !!studentName.trim() && !!department && !!level;
  const isNigerian = gradingSystem === "nigerian_university";

  return (
    <AnimatePresence mode="wait">


      {/* ── STEP 1: Grading System ── */}
      {step === "system" && (
        <motion.div
          key="system"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="flex flex-col items-center gap-8 pt-28 pb-36 content-col"
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Mascot pose="thinking" size={110} animate />
          </motion.div>

          <div className="text-center">
            <h1 className="text-3xl font-black text-foreground">{t("gradingSystem")}</h1>
            <p className="mt-2 text-muted-foreground font-semibold">{t("chooseSystem")}</p>
          </div>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={() => onGradingSystemChange("apc")}
              className={`rounded-2xl p-5 text-left transition-all active:scale-[0.98] border-2 border-foreground card-shadow ${
                gradingSystem === "apc" ? "bg-secondary" : "bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-foreground bg-background">
                  <BookOpen className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="font-black text-foreground">{t("apcSystem")}</p>
                  <p className="text-xs font-semibold text-muted-foreground">{t("togoleseStandard")}</p>
                </div>
              </div>
            </button>

            <div className="rounded-2xl p-5 text-left border-2 border-border bg-muted/30 opacity-50 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-border bg-background">
                  <Target className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-black text-muted-foreground">{t("frenchTraditional")}</p>
                  <p className="text-xs font-semibold text-muted-foreground/70">Coming soon</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => onGradingSystemChange("nigerian_university")}
              className={`rounded-2xl p-5 text-left transition-all active:scale-[0.98] border-2 border-foreground card-shadow ${
                gradingSystem === "nigerian_university" ? "bg-secondary" : "bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-foreground bg-background">
                  <GraduationCap className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="font-black text-foreground">Nigerian University</p>
                  <p className="text-xs font-semibold text-muted-foreground">GPA / CGPA · Credit units</p>
                </div>
              </div>
            </button>
          </div>

          <FixedNextButton
            onClick={() => onStepChange("profile")}
            label={t("next") || "Next"}
          />
        </motion.div>
      )}

      {/* ── STEP 2: Profile ── */}
      {step === "profile" && (
        <motion.div
          key="profile"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="flex flex-col items-center gap-6 pt-28 pb-36 overflow-y-auto min-h-screen content-col"
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Mascot pose="idle" size={110} animate />
          </motion.div>

          <div className="text-center">
            <h1 className="text-3xl font-black text-foreground">{t("basicInfo")}</h1>
            <p className="mt-2 text-muted-foreground font-semibold">
              {isNigerian ? "What should we call you?" : t("tellUsNameClass")}
            </p>
          </div>

          <div className="w-full flex flex-col gap-4">
            {/* Name — shown for all systems */}
            <div>
              <label className="text-sm font-bold text-muted-foreground mb-1 block">{t("fullName")}</label>
              <input
                type="text"
                placeholder={language === "fr" ? "ex. Kofi, Ama..." : "e.g. Kofi, Ama..."}
                value={studentName}
                onChange={(e) => onStudentNameChange(e.target.value)}
                autoFocus
                className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            {/* Department + Level — Nigerian only */}
            {isNigerian && (
              <>
                <div>
                  <label className="text-sm font-bold text-muted-foreground mb-1 block">Department / Faculty</label>
                  <AppDropdown
                    value={department}
                    onChange={(val) => { onDepartmentChange(val); if (level) onLevelChange(""); }}
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
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <label className="text-sm font-bold text-muted-foreground mb-1 block">Level</label>
                      <AppDropdown
                        value={level}
                        onChange={onLevelChange}
                        placeholder="Select your level"
                        options={NIGERIAN_LEVELS.map(lvl => ({ value: lvl, label: `${lvl} Level` }))}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* Class / serie / semester — APC and French only */}
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
                            onClassLevelChange(""); onSerieChange("");
                          }
                          if (tab === "lycee" && classLevel && !isLycee(classLevel)) {
                            onClassLevelChange(""); if (semester === "3rd Semester") onSemesterChange("");
                          }
                        }}
                        className={`flex-1 rounded-lg py-2 text-sm font-black transition-all ${
                          schoolTab === tab
                            ? "bg-card border-2 border-foreground text-foreground card-shadow"
                            : "text-muted-foreground"
                        }`}
                      >
                        {tab === "college" ? "Collège" : "Lycée"}
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
                          onClick={() => {
                            onClassLevelChange(lvl);
                            onSerieChange("");
                            if (semester === "3rd Semester") onSemesterChange("");
                          }}
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
                    <label className="text-sm font-bold text-muted-foreground mb-1 block">Série</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {LYCEE_SERIES.map((s) => (
                        <button
                          key={s}
                          onClick={() => onSerieChange(s)}
                          className={`rounded-xl px-3 py-2.5 text-sm font-black transition-all active:scale-95 border-2 border-foreground ${
                            serie === s ? "bg-secondary text-foreground card-shadow" : "bg-card text-foreground"
                          }`}
                        >
                          Série {s}
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
                            { key: "3rd Semester", label: t("thirdSemester") || "3rd Semester" },
                          ]
                      ).map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => onSemesterChange(key)}
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

          <FixedNextButton
            onClick={() => isNigerian ? onStepChange("semester") : onStepChange("target")}
            disabled={isNigerian ? !nigerianProfileValid : !profileValid}
            label={isNigerian ? "Next" : t("next")}
            hint={
              !isNigerian && !profileValid && (studentName.trim() || classLevel) ? (
                <p className="text-xs font-bold text-muted-foreground text-center">
                  {!studentName.trim()
                    ? t("enterYourName")
                    : !classLevel
                    ? t("chooseYourClass")
                    : (isLycee(classLevel) && !serie)
                    ? t("chooseYourSerie")
                    : t("chooseYourSemester")}
                </p>
              ) : undefined
            }
          />
        </motion.div>
      )}

      {/* ── STEP 3: Nigerian Semester ── */}
      {step === "semester" && (
        <motion.div
          key="semester"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="flex flex-col items-center gap-8 pt-28 pb-36 content-col"
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Mascot pose="idle" size={110} animate />
          </motion.div>

          <div className="text-center">
            <h1 className="text-3xl font-black text-foreground">Current Semester</h1>
            <p className="mt-2 text-muted-foreground font-semibold">Which semester are you in right now?</p>
          </div>

          <div className="w-full flex flex-col gap-3">
            {(["First Semester", "Second Semester"] as const).map((sem) => (
              <button
                key={sem}
                onClick={() => onNigerianSemesterChange(sem)}
                className={`rounded-2xl p-5 text-left transition-all active:scale-[0.98] border-2 border-foreground card-shadow font-black text-foreground ${
                  nigerianSemester === sem ? "bg-secondary" : "bg-card"
                }`}
              >
                {sem}
              </button>
            ))}
          </div>

          <FixedNextButton
            onClick={() => onStepChange("target")}
            disabled={!nigerianSemester}
            label="Next"
          />
        </motion.div>
      )}

      {/* ── STEP 4: Target ── */}
      {step === "target" && (
        <motion.div
          key="target"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="flex flex-col items-center gap-8 pt-28 pb-36 content-col"
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Mascot pose="pointing" size={110} animate />
          </motion.div>

          <div className="text-center">
            <h1 className="text-3xl font-black text-foreground">
              {t("whatsYourTarget")}
            </h1>
            <p className="mt-2 text-muted-foreground font-semibold">
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
                  <span className="text-5xl font-black text-primary">{(targetAverage ?? 4.00).toFixed(2)}</span>
                </div>
                <div className="mt-8">
                  <input
                    type="range" min="0" max="5" step="0.05"
                    value={targetAverage}
                    onChange={(e) => onTargetChange(parseFloat(e.target.value))}
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
                  <span className="text-5xl font-black text-primary">{(targetAverage ?? 16).toFixed(1)}</span>
                  <span className="text-xl font-bold text-muted-foreground">– 20 / 20</span>
                </div>
                <p className="text-xs font-semibold text-muted-foreground mt-1">{t("minimumTarget")}</p>
                <div className="mt-8">
                  <input
                    type="range" min="0" max="20" step="0.5"
                    value={targetAverage}
                    onChange={(e) => onTargetChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs font-bold text-muted-foreground mt-2 px-1">
                    <span>0</span><span>10</span><span>20</span>
                  </div>
                </div>
              </div>
            )}

          </motion.div>

          <FixedNextButton onClick={onContinue} label={t("letsGo")} />
        </motion.div>
      )}

    </AnimatePresence>
  );
};

export default OnboardingScreen;
