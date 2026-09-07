import { useState } from "react";
import { X, Crown, Key, MessageCircle } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { RedeemCodeSheet } from "./RedeemCodeSheet";

interface PremiumIntroSheetProps {
  open: boolean;
  onClose: () => void;
  onRedeemSuccess?: () => void;
  subjectName?: string;
  nudgeSubtext?: string;
}

export function PremiumIntroSheet({
  open,
  onClose,
  onRedeemSuccess,
  subjectName,
  nudgeSubtext,
}: PremiumIntroSheetProps) {
  const { t } = useLanguage();
  const [showRedeem, setShowRedeem] = useState(false);

  const handleWhatsApp = () => {
    const phoneNumber = "22890676722";
    const message = encodeURIComponent("Hello! I would like a Go Study! premium access code.");
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
  };

  const features = [
    { icon: "🎯", title: t("topQuestions"), desc: t("topQuestionsDesc") },
    { icon: "🗺️", title: t("keyTopics"), desc: t("keyTopicsDesc") },
    { icon: "📋", title: t("cheatSheet"), desc: t("cheatSheetDesc") },
    { icon: "✅", title: t("stepBySolutions"), desc: t("stepByStepSolutionsDesc") },
    { icon: "📝", title: t("practiceTests"), desc: t("practiceTestsDesc") },
    { icon: "🔍", title: t("weakSpots"), desc: t("weakSpotsDesc") },
  ];

  return (
    <>
      <Sheet open={open && !showRedeem} onBackdropClick={onClose} zIndex={65}>
        <div className="flex justify-center pt-3 pb-1 shrink-0 md:hidden">
          <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
        </div>

        <div className="flex items-start justify-between px-5 pt-3 pb-3 border-b border-border shrink-0">
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
          <button type="button" onClick={onClose} className="text-muted-foreground active:scale-95 transition-transform">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pt-4 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowRedeem(true)}
            className="w-full rounded-2xl bg-secondary border-2 border-foreground py-4 font-black text-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 text-base"
          >
            <Key className="h-5 w-5" />
            {t("iHaveACode")}
          </button>
          <p className="text-center text-[10px] font-semibold text-muted-foreground mt-2">
            {t("redeemCodeHint")}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-2 pb-4 min-h-0">
          <p className="text-xs font-black text-muted-foreground uppercase tracking-wide mb-3">
            {t("premiumIncludes")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon, title, desc }) => (
              <div key={title} className="rounded-2xl bg-card border-2 border-border p-3 flex flex-col gap-1.5">
                <span className="text-xl">{icon}</span>
                <p className="font-black text-xs text-foreground">{title}</p>
                <p className="text-[10px] font-semibold text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 pb-8 pt-2 border-t border-border bg-background shrink-0">
          <button
            type="button"
            onClick={handleWhatsApp}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground py-2 active:scale-[0.98] transition-transform"
          >
            <MessageCircle className="h-4 w-4 text-green-600" />
            {t("needACodeWhatsApp")}
          </button>
        </div>
      </Sheet>

      <RedeemCodeSheet
        open={showRedeem}
        onClose={() => setShowRedeem(false)}
        onSuccess={() => {
          onRedeemSuccess?.();
          onClose();
        }}
        subjectName={subjectName}
      />
    </>
  );
}
