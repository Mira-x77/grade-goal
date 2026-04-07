import { useState, useEffect } from "react";
import { DEFAULT_SETTINGS } from "@/types/exam";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AppState, Subject } from "@/types/exam";
import { saveState, loadState } from "@/lib/storage";
import { OnboardingHeader } from "@/components/OnboardingHeader";
import OnboardingScreen, { OnboardingStep } from "@/components/OnboardingScreen";
import SubjectsSetup from "@/components/SubjectsSetup";
import MarksInput from "@/components/MarksInput";
import ResultsScreen from "@/components/ResultsScreen";
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
    const initial: AppState = saved || { step: "onboarding" as const, targetAverage: 20, targetMin: 20, subjects: [], settings: DEFAULT_SETTINGS };
    if (initial.targetMin === undefined || initial.targetMin === null) {
      initial.targetMin = initial.targetAverage ?? 16;
    }
    if (stepParam && saved && saved.subjects.length > 0) {
      const validSteps = ["onboarding", "subjects", "marks", "results"] as const;
      if (validSteps.includes(stepParam as any)) {
        return { ...initial, step: stepParam as AppState["step"] };
      }
    }
    return initial;
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  const setStep = (step: AppState["step"]) => setState((s) => ({ ...s, step }));
  const setTarget = (targetMin: number) => setState((s) => ({ ...s, targetMin, targetAverage: targetMin }));
  const setSubjects = (subjects: Subject[]) => setState((s) => ({ ...s, subjects }));
  const setGradingSystem = (gradingSystem: "apc" | "french") =>
    setState((s) => ({ ...s, settings: { ...s.settings, gradingSystem } }));
  const setStudentName = (studentName: string) => setState((s) => ({ ...s, studentName }));
  const setClassLevel = (classLevel: string) => setState((s) => ({ ...s, classLevel }));
  const setSerie = (serie: string) => setState((s) => ({ ...s, serie }));
  const setSemester = (semester: string) => setState((s) => ({ ...s, semester }));

  const handleBack = () => {
    if (state.step === "onboarding") {
      if (onboardingStep === "target") handleOnboardingStepChange("profile");
      else if (onboardingStep === "profile") handleOnboardingStepChange("system");
      else navigate("/");
    } else if (state.step === "subjects") {
      setStep("onboarding");
      handleOnboardingStepChange("target");
    } else if (state.step === "marks") {
      setStep("subjects");
    } else if (state.step === "results") {
      setStep("marks");
    }
  };

  const stepTitles: Record<AppState["step"], string> = {
    onboarding: onboardingStep === "system" ? t("gradingSystem") : onboardingStep === "profile" ? t("basicInfo") : t("targetAverage"),
    subjects: t("addSubjects"),
    marks: t("enterYourMarks"),
    results: t("yourProfile"),
  };

  const stepNumbers: Record<AppState["step"], number> = {
    onboarding: onboardingStep === "system" ? 1 : onboardingStep === "profile" ? 2 : 3,
    subjects: 4,
    marks: 5,
    results: 5,
  };

  const TOTAL_STEPS = 5;

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-20">
      {state.step !== "results" && (
        <OnboardingHeader
          title={stepTitles[state.step]}
          onBack={handleBack}
          currentStep={stepNumbers[state.step]}
          totalSteps={TOTAL_STEPS}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div key={state.step + onboardingStep}>
          {state.step === "onboarding" && (
            <OnboardingScreen
              targetAverage={state.targetAverage}
              onTargetChange={setTarget}
              onContinue={() => setStep("subjects")}
              gradingSystem={state.settings.gradingSystem}
              onGradingSystemChange={setGradingSystem}
              studentName={state.studentName || ""}
              onStudentNameChange={setStudentName}
              classLevel={state.classLevel || ""}
              onClassLevelChange={setClassLevel}
              serie={state.serie || ""}
              onSerieChange={setSerie}
              semester={state.semester || ""}
              onSemesterChange={setSemester}
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
            />
          )}
          {state.step === "marks" && (
            <MarksInput
              subjects={state.subjects}
              onSubjectsChange={setSubjects}
              onContinue={() => {
                // Save state as "results" so home screen knows onboarding is done, then navigate home
                const finalState = { ...state, step: "results" as const };
                saveState(finalState);
                navigate("/");
              }}
              onBack={() => setStep("subjects")}
              classLevel={state.classLevel}
              serie={state.serie}
            />
          )}
          {state.step === "results" && (
            <ResultsScreen
              subjects={state.subjects}
              targetAverage={state.targetMin ?? state.targetAverage}
              onBack={() => setStep("marks")}
              onEditMarks={() => setStep("marks")}
            />
          )}
        </motion.div>
      </AnimatePresence>

    </div>
  );
};

export default Index;
