import { useState, useEffect } from "react";
import { DEFAULT_SETTINGS } from "@/types/exam";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { AppState, Subject } from "@/types/exam";
import { saveState, loadState } from "@/lib/storage";
import OnboardingScreen from "@/components/OnboardingScreen";
import SubjectsSetup from "@/components/SubjectsSetup";
import MarksInput from "@/components/MarksInput";
import ResultsScreen from "@/components/ResultsScreen";

const Index = () => {
  const [searchParams] = useSearchParams();
  const stepParam = searchParams.get("step");
  
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

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-black text-primary">ScoreTarget</h1>
          </div>
          <div className="flex gap-1">
            {(["onboarding", "subjects", "marks", "results"] as const).map((s, i) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  state.step === s ? "w-8 bg-primary" :
                  (["onboarding", "subjects", "marks", "results"].indexOf(state.step) > i) ? "w-4 bg-primary/40" :
                  "w-4 bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={state.step}>
          {state.step === "onboarding" && (
            <OnboardingScreen
              targetAverage={state.targetAverage}
              onTargetChange={setTarget}
              onContinue={() => setStep("subjects")}
            />
          )}
          {state.step === "subjects" && (
            <SubjectsSetup
              subjects={state.subjects}
              onSubjectsChange={setSubjects}
              onContinue={() => setStep("marks")}
              onBack={() => setStep("onboarding")}
            />
          )}
          {state.step === "marks" && (
            <MarksInput
              subjects={state.subjects}
              onSubjectsChange={setSubjects}
              onContinue={() => setStep("results")}
              onBack={() => setStep("subjects")}
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
