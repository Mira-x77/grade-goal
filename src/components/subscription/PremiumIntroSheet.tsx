import { X, Crown, ChevronRight } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppConfig } from "@/contexts/AppConfigContext";

interface PremiumIntroSheetProps {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  subjectName?: string;
  nudgeSubtext?: string; // contextual message for nudge-triggered opens
}

export function PremiumIntroSheet({ open, onClose, onContinue, subjectName, nudgeSubtext }: PremiumIntroSheetProps) {
  const { t } = useLanguage();
  const { premiumEnabled } = useAppConfig();

  const features = [
    { icon: "🎯", title: t("topQuestions"),   desc: t("topQuestionsDesc")    },
    { icon: "🗺️", title: t("keyTopics"),      desc: t("keyTopicsDesc")       },
    { icon: "📋", title: t("cheatSheet"),     desc: t("cheatSheetDesc")      },
    { icon: "✅", title: t("stepBySolutions"),desc: t("stepByStepSolutions") },
    { icon: "📝", title: t("practiceTests"),  desc: t("practiceTestsDesc")   },
    { icon: "🔍", title: t("weakSpots"),      desc: t("weakSpotsDesc")       },
  ];

  return (
    <Sheet open={open} onBackdropClick={onClose} zIndex={65}>
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1 shrink-0 md:hidden">
        <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-3 pb-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-premium" />
          <div>
            <h2 className="text-lg font-black text-foreground">{t("passSmarter")}</h2>
            <p className="text-xs font-semibold text-muted-foreground">
              {nudgeSubtext
                ? nudgeSubtext
                : subjectName
                  ? `${t("prepToolsFor")} ${subjectName}`
                  : t("prepToolsEvery")}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground active:scale-95 transition-transform">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable features grid */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-4 min-h-0">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {features.map(({ icon, title, desc }) => (
            <div key={title} className="rounded-2xl bg-card border-2 border-border p-4 flex flex-col gap-2">
              <span className="text-2xl">{icon}</span>
              <p className="font-black text-sm text-foreground">{title}</p>
              <p className="text-[10px] font-semibold text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="px-5 pb-8 pt-4 border-t border-border bg-background shrink-0">
        {premiumEnabled ? (
          <button
            onClick={onContinue}
            className="w-full rounded-2xl bg-secondary border-2 border-foreground py-4 font-black text-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {t("seePlans")}
            <ChevronRight className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-full rounded-2xl bg-muted border-2 border-border py-4 font-black text-muted-foreground flex items-center justify-center gap-2 opacity-60 cursor-not-allowed">
            <Crown className="h-4 w-4" />
            Coming Soon
          </div>
        )}
      </div>
    </Sheet>
  );
}
