import { CLASS_LEVELS } from "@/lib/subjects-data";
import {
  composeOnboardingClassFilter,
  seriesForCycle,
  splitOnboardingClassFilter,
} from "@/lib/library-filters";
import { useLanguage } from "@/contexts/LanguageContext";

interface ClassLevelFilterProps {
  value: string;
  onChange: (next: string) => void;
  showAll?: boolean;
}

const college = CLASS_LEVELS.college as readonly string[];
const lycee = CLASS_LEVELS.lycee as readonly string[];

export function ClassLevelFilter({
  value,
  onChange,
  showAll = true,
}: ClassLevelFilterProps) {
  const { t } = useLanguage();
  const { cycle, serie } = splitOnboardingClassFilter(value);
  const schoolTab = college.includes(cycle) ? "college" : "lycee";
  const series = seriesForCycle(cycle);

  return (
    <div className="space-y-3">
      {showAll && (
        <button
          type="button"
          onClick={() => onChange("")}
          className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${
            !value
              ? "bg-primary/10 border-primary text-primary"
              : "bg-card border-border text-foreground"
          }`}
        >
          {t("all")}
        </button>
      )}

      <div className="flex rounded-xl bg-muted p-1 border-2 border-foreground">
        {(["college", "lycee"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              if (tab === schoolTab) return;
              if (tab === "college") {
                onChange(composeOnboardingClassFilter(college[0]));
                return;
              }
              onChange(composeOnboardingClassFilter(lycee.includes(cycle) ? cycle : "1ère"));
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

      <div className="grid grid-cols-2 gap-2">
        {(schoolTab === "college" ? college : lycee).map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => onChange(composeOnboardingClassFilter(lvl))}
            className={`rounded-xl px-3 py-2.5 text-sm font-black transition-all active:scale-95 border-2 border-foreground ${
              cycle === lvl
                ? "bg-secondary text-foreground card-shadow"
                : "bg-card text-foreground"
            }`}
          >
            {lvl}
          </button>
        ))}
      </div>

      {series.length > 0 && (
        <div>
          <label className="text-xs font-black text-muted-foreground uppercase tracking-wide mb-2 block">
            {t("serieLabel")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {series.map((s) => {
              const next = composeOnboardingClassFilter(cycle, s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange(next)}
                  className={`rounded-xl px-3 py-2.5 text-sm font-black transition-all active:scale-95 border-2 border-foreground ${
                    serie === s
                      ? "bg-secondary text-foreground card-shadow"
                      : "bg-card text-foreground"
                  }`}
                >
                  {t("serieLabel")} {s}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
