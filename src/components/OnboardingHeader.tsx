import { ArrowLeft } from "lucide-react";

interface OnboardingHeaderProps {
  title: string;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}

export function OnboardingHeader({ title, onBack, currentStep, totalSteps }: OnboardingHeaderProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-30 bg-background safe-area-top pb-4 pt-3">
      <div className="header-inner max-w-lg mx-auto flex items-center justify-between">
      {currentStep > 1 ? (
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : (
        <div className="h-9 w-9" />
      )}

      <h1 className="text-base font-black text-foreground">{title}</h1>

      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all ${
              i + 1 === currentStep ? "h-2.5 w-2.5 bg-primary" : "h-2 w-2 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
      </div>{/* /header-inner */}
    </div>
  );
}
