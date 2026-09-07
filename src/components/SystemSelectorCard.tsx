import { useState } from "react";
import { BookOpen, Target, GraduationCap } from "lucide-react";
import { GradingSystem } from "@/types/exam";
import { useLanguage } from "@/contexts/LanguageContext";

interface SystemSelectorCardProps {
  selected: GradingSystem;
  onChange: (system: GradingSystem) => void;
  /** When true, changing from the current selection shows a confirmation dialog */
  requireConfirmation?: boolean;
}

const SYSTEMS: {
  id: GradingSystem;
  icon: React.ElementType;
  labelKey: "apcSystem" | "frenchTraditional" | "nigerianUniversitySystem";
  descKey: "togoleseStandard" | "comparativeRanking" | "nigerianUniversityDesc";
}[] = [
  { id: "apc", icon: BookOpen, labelKey: "apcSystem", descKey: "togoleseStandard" },
  { id: "french", icon: Target, labelKey: "frenchTraditional", descKey: "comparativeRanking" },
  { id: "nigerian_university", icon: GraduationCap, labelKey: "nigerianUniversitySystem", descKey: "nigerianUniversityDesc" },
];

const SystemSelectorCard = ({ selected, onChange, requireConfirmation = false }: SystemSelectorCardProps) => {
  const { t } = useLanguage();
  const [pendingSystem, setPendingSystem] = useState<GradingSystem | null>(null);

  const handleSelect = (id: GradingSystem) => {
    if (id === selected) return;
    if (requireConfirmation) {
      setPendingSystem(id);
    } else {
      onChange(id);
    }
  };

  const confirmChange = () => {
    if (pendingSystem) {
      onChange(pendingSystem);
      setPendingSystem(null);
    }
  };

  const cancelChange = () => setPendingSystem(null);

  return (
    <>
      <div className="w-full flex flex-col gap-3">
        {SYSTEMS.map(({ id, icon: Icon, labelKey, descKey }) => (
          <button
            key={id}
            onClick={() => handleSelect(id)}
            className={`rounded-2xl p-5 text-left transition-all active:scale-[0.98] border-2 border-foreground card-shadow ${
              selected === id ? "bg-secondary" : "bg-card"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-foreground bg-background">
                <Icon className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="font-black text-foreground">{t(labelKey)}</p>
                <p className="text-xs font-semibold text-muted-foreground">{t(descKey)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Confirmation dialog */}
      {pendingSystem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-8">
          <div className="w-full max-w-sm rounded-3xl bg-card border-2 border-foreground p-6 flex flex-col gap-4 card-shadow">
            <div>
              <p className="font-black text-foreground text-lg">{t("changeSystemTitle")}</p>
              <p className="text-sm font-semibold text-muted-foreground mt-1">{t("changeSystemDesc")}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={confirmChange}
                className="w-full rounded-2xl bg-destructive border-2 border-foreground py-3 text-sm font-black text-destructive-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all"
              >
                {t("changeSystemConfirm")}
              </button>
              <button
                onClick={cancelChange}
                className="w-full rounded-2xl bg-card border-2 border-foreground py-3 text-sm font-black text-foreground active:translate-y-0.5 active:shadow-none transition-all"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SystemSelectorCard;
