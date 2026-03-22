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

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const stepParam = searchParams.get("step");
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("system");
  
  const [state, setState] = useState<AppState>(() => {
    const saved = loadState();
    const initial = saved || { step: "onboarding" as const, targetAverage: 16, subjects: [], settings: DEFAULT_SETTINGS };
    // If URL has a step param and we have data, go to that step
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
  const setTarget = (targetAverage: number) => setState((s) => ({ ...s, targetAverage }));
  const setSubjects = (subjects: Subject[]) => setState((s) => ({ ...s, subjects }));
  const setGradingSystem = (gradingSystem: "apc" | "french") =>
    setState((s) => ({ ...s, settings: { ...s.settings, gradingSystem } }));
  const setStudentName = (studentName: string) => setState((s) => ({ ...s, studentName }));
  const setClassLevel = (classLevel: string) => setState((s) => ({ ...s, classLevel }));
  const setSerie = (serie: string) => setState((s) => ({ ...s, serie }));

  const handleBack = () => {
    if (state.step === "onboarding") {
      if (onboardingStep === "target") setOnboardingStep("profile");
      else if (onboardingStep === "profile") setOnboardingStep("system");
      else navigate("/");
    } else if (state.step === "subjects") {
      setStep("onboarding");
      setOnboardingStep("target");
    } else if (state.step === "marks") {
      setStep("subjects");
    } else if (state.step === "results") {
      setStep("marks");
    }
  };

  const stepTitles: Record<AppState["step"], string> = {
    onboarding: onboardingStep === "system" ? "Grading System" : onboardingStep === "profile" ? "Your Profile" : "Set Target",
    subjects: "Add Subject",
    marks: "Enter Marks",
    results: "Your Results",
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
        <motion.div key={state.step}>
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
              step={onboardingStep}
              onStepChange={setOnboardingStep}
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
              onContinue={() => setStep("results")}
              onBack={() => setStep("subjects")}
              classLevel={state.classLevel}
              serie={state.serie}
            />
          )}
          {state.step === "results" && (
            <ResultsScreen
              subjects={state.subjects}
              targetAverage={state.targetAverage}
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
