import { useState, useEffect } from "react";
import { DEFAULT_SETTINGS, GradingSystem } from "@/types/exam";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AppState, Subject } from "@/types/exam";
import { saveState, loadState } from "@/lib/storage";
import { OnboardingHeader } from "@/components/OnboardingHeader";
import OnboardingScreen, { OnboardingStep } from "@/components/OnboardingScreen";
import SubjectsSetup from "@/components/SubjectsSetup";
import MarksInput from "@/components/MarksInput";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const stepParam = searchParams.get("step");
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("system");

  const handleOnboardingStepChange = (step: OnboardingStep) => {
    setOnboardingStep(step);
  };
  
  const [state, setState] = useState<AppState>(() => {
    const saved = loadState();
    // Always ensure settings exists — old stored states may not have it
    const initial: AppState = saved
      ? { ...saved, settings: saved.settings ?? DEFAULT_SETTINGS }
      : { step: "onboarding" as const, targetAverage: 20, targetMin: 20, subjects: [], settings: DEFAULT_SETTINGS };
    if (initial.targetMin === undefined || initial.targetMin === null) {
      initial.targetMin = initial.targetAverage ?? 16;
    }
    if (stepParam && saved && saved.subjects.length > 0) {
      const validSteps = ["onboarding", "subjects", "marks"] as const;
      if (validSteps.includes(stepParam as any)) {
        return { ...initial, step: stepParam as AppState["step"] };
      }
    }
    return initial;
  });

  useEffect(() => {
    // Auto-save state during onboarding
    saveState(state);
  }, [state]);

  const setStep = (step: AppState["step"]) => setState((s) => ({ ...s, step }));
  const setTarget = (targetMin: number) => setState((s) => ({ ...s, targetMin, targetAverage: targetMin }));
  const setSubjects = (subjects: Subject[]) => setState((s) => ({ ...s, subjects }));
  const setGradingSystem = (gradingSystem: GradingSystem) =>
    setState((s) => ({
      ...s,
      settings: { ...s.settings, gradingSystem },
      targetAverage: gradingSystem === "nigerian_university" ? 4.0 : 16,
      targetMin: gradingSystem === "nigerian_university" ? 4.0 : 16,
    }));
  const setStudentName = (studentName: string) => setState((s) => ({ ...s, studentName }));
  const setClassLevel = (classLevel: string) => setState((s) => ({ ...s, classLevel }));
  const setSerie = (serie: string) => setState((s) => ({ ...s, serie }));
  const setSemester = (semester: string) => setState((s) => ({ ...s, semester }));
  const setDepartment = (department: string) => setState((s) => ({ ...s, department }));
  const setUniversityLevel = (universityLevel: string) => setState((s) => ({ ...s, universityLevel }));

  const [nigerianSemester, setNigerianSemester] = useState<string>(() => loadState()?.semester ?? "");

  const handleBack = () => {
    if (state.step === "onboarding") {
      const isNigerian = state.settings?.gradingSystem === "nigerian_university";
      if (onboardingStep === "target") {
        handleOnboardingStepChange(isNigerian ? "semester" : "profile");
      } else if (onboardingStep === "semester") {
        handleOnboardingStepChange("profile");
      } else if (onboardingStep === "profile") {
        handleOnboardingStepChange("system");
      } else {
        navigate("/", { replace: true });
      }
    } else if (state.step === "subjects") {
      setStep("onboarding");
      handleOnboardingStepChange("target");
    } else if (state.step === "marks") {
      setStep("subjects");
    }
  };

  const isNigerianOnboarding = state.settings?.gradingSystem === "nigerian_university";

  const stepTitles: Record<AppState["step"], string> = {
    onboarding: onboardingStep === "system" ? t("gradingSystem") : onboardingStep === "profile" ? t("basicInfo") : onboardingStep === "semester" ? "Current Semester" : t("targetAverage"),
    subjects: t("addSubjects"),
    marks: t("enterYourMarks"),
  };

  const stepNumbers: Record<AppState["step"], number> = isNigerianOnboarding
    ? {
        onboarding: onboardingStep === "system" ? 1 : onboardingStep === "profile" ? 2 : onboardingStep === "semester" ? 3 : 4,
        subjects: 5,
        marks: 6,
      }
    : {
        onboarding: onboardingStep === "system" ? 1 : onboardingStep === "profile" ? 2 : 3,
        subjects: 4,
        marks: 5,
      };

  const TOTAL_STEPS = isNigerianOnboarding ? 6 : 5;

  return (
    <div className="min-h-screen bg-background w-full pb-20 flex flex-col items-center">
      <div className="w-full max-w-lg">
      <OnboardingHeader
        title={stepTitles[state.step]}
        onBack={handleBack}
        currentStep={stepNumbers[state.step]}
        totalSteps={TOTAL_STEPS}
      />

      <AnimatePresence mode="wait">
        <motion.div key={state.step + onboardingStep}>
          {state.step === "onboarding" && (
            <OnboardingScreen
              targetAverage={state.targetAverage}
              onTargetChange={setTarget}
              onContinue={() => {
                const isNigerian = state.settings?.gradingSystem === "nigerian_university";
                if (isNigerian) {
                  if (onboardingStep === "target") {
                    setState((s) => ({ ...s, semester: nigerianSemester }));
                    setStep("subjects");
                  } else {
                    setStep("subjects");
                  }
                } else {
                  setStep("subjects");
                }
              }}
              gradingSystem={state.settings?.gradingSystem ?? "apc"}
              onGradingSystemChange={setGradingSystem}
              studentName={state.studentName || ""}
              onStudentNameChange={setStudentName}
              classLevel={state.classLevel || ""}
              onClassLevelChange={setClassLevel}
              serie={state.serie || ""}
              onSerieChange={setSerie}
              semester={state.semester || ""}
              onSemesterChange={setSemester}
              department={state.department || ""}
              onDepartmentChange={setDepartment}
              level={state.universityLevel || ""}
              onLevelChange={setUniversityLevel}
              nigerianSemester={nigerianSemester}
              onNigerianSemesterChange={(sem) => {
                setNigerianSemester(sem);
                setState((s) => ({ ...s, semester: sem }));
              }}
              step={onboardingStep}
              onStepChange={handleOnboardingStepChange}
            />
          )}
          {state.step === "subjects" && (
            <SubjectsSetup
              subjects={state.subjects}
              onSubjectsChange={setSubjects}
              onContinue={() => setStep("marks")}
              onBack={() => setStep("onboarding")}
              classLevel={state.classLevel}
              serie={state.serie}
              isNigerian={state.settings?.gradingSystem === "nigerian_university"}
            />
          )}
          {state.step === "marks" && (
            <MarksInput
              subjects={state.subjects}
              onSubjectsChange={setSubjects}
              onContinue={() => {
                const isNigerian = state.settings?.gradingSystem === "nigerian_university";
                if (isNigerian) {
                  const semId = crypto.randomUUID();
                  const firstSem = {
                    id: semId,
                    name: nigerianSemester || "First Semester",
                    sessionLabel: new Date().getFullYear() + "/" + (new Date().getFullYear() + 1),
                    courses: [],
                    gpa: 0,
                    archived: false,
                  };
                  const finalState = {
                    ...state,
                    studentName: state.studentName || "Student",
                    nigerianState: state.nigerianState && state.nigerianState.semesters.length > 0
                      ? state.nigerianState
                      : {
                          semesters: [firstSem],
                          cgpa: 0,
                          classOfDegree: "Fail",
                          targetCGPA: state.targetMin ?? null,
                          remainingCreditUnits: 0,
                          activeSemesterId: semId,
                        },
                  };
                  saveState(finalState);
                  navigate("/", { replace: true });
                } else {
                  // Seed first APC semester from onboarding selection
                  const semId = crypto.randomUUID();
                  const firstApcSem = {
                    id: semId,
                    label: state.semester || "1st Semester",
                    academicYear: new Date().getFullYear() + "/" + (new Date().getFullYear() + 1),
                    classLevel: state.classLevel,
                    serie: state.serie,
                    subjects: state.subjects,
                    targetMin: state.targetMin,
                    archived: false,
                  };
                  const finalState = {
                    ...state,
                    apcSemesters: [firstApcSem],
                    activeApcSemesterId: semId,
                  };
                  saveState(finalState);
                  navigate("/", { replace: true });
                }
              }}
              onBack={() => setStep("subjects")}
              classLevel={state.classLevel}
              serie={state.serie}
              isNigerian={state.settings?.gradingSystem === "nigerian_university"}
            />
          )}
        </motion.div>
      </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
