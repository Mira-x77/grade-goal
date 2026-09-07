import { useState } from "react";
import { X, Crown, Key, Loader2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { RedeemCodeSheet } from "./RedeemCodeSheet";

interface PaymentSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onBack?: () => void;
  subjectName?: string;
  amount?: number;
}

/** Legacy payment sheet — redirects to code redemption (mobile pay de-emphasized) */
export function PaymentSheet({ open, onClose, onSuccess, onBack, subjectName }: PaymentSheetProps) {
  const { t } = useLanguage();
  const [showRedeem, setShowRedeem] = useState(false);

  if (!open) return null;

  return (
    <>
      <Sheet open={open && !showRedeem} onBackdropClick={onClose} zIndex={70}>
        <div className="flex justify-center pt-3 pb-1 shrink-0 md:hidden">
          <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
        </div>
        <div className="flex items-start justify-between px-5 pt-3 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            {onBack && (
              <button type="button" onClick={onBack} className="text-muted-foreground active:scale-95">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-premium" />
                <h2 className="text-lg font-black text-foreground">{t("enterAccessCode")}</h2>
              </div>
              {subjectName && (
                <p className="text-xs font-semibold text-muted-foreground mt-0.5">{subjectName}</p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-6 flex flex-col gap-4">
          <p className="text-sm font-semibold text-muted-foreground text-center">{t("redeemCodeSteps")}</p>
          <button
            type="button"
            onClick={() => setShowRedeem(true)}
            className="w-full rounded-2xl bg-secondary border-2 border-foreground py-4 font-black text-foreground card-shadow flex items-center justify-center gap-2"
          >
            <Key className="h-5 w-5" />
            {t("iHaveACode")}
          </button>
        </div>
      </Sheet>
      <RedeemCodeSheet
        open={showRedeem}
        onClose={() => setShowRedeem(false)}
        onSuccess={() => {
          onSuccess();
          onClose();
        }}
        subjectName={subjectName}
      />
    </>
  );
}
