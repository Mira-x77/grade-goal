import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, CheckCircle2, ArrowRight, Zap } from 'lucide-react';
import { subscriptionService } from '@/services/subscriptionService';
import { useLanguage } from '@/contexts/LanguageContext';

interface SubscriptionDetailDialogProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  subjectName?: string;
}

export function SubscriptionDetailDialog({ open, onClose, onUpgrade, subjectName }: SubscriptionDetailDialogProps) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<{
    tier: string;
    hasPremiumAccess: boolean;
    unlockedSubjects: string[];
    ownedPacks?: string[];
  } | null>(null);

  const trackEvent = (eventName: string) => {
    console.log(`[Analytics Event Tracked]: ${eventName}`);
  };

  useEffect(() => {
    if (open) {
      loadStatus();
      trackEvent('view_paywall');
    }
  }, [open]);

  const loadStatus = async () => {
    try {
      const statusData = await subscriptionService.getStatus();
      setStatus({
        ...statusData,
        ownedPacks: statusData.unlockedSubjects.includes('all') ? ['all'] : statusData.unlockedSubjects
      });
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    }
  };

  const handleClose = () => {
    trackEvent('dropoff_paywall');
    onClose();
  };

  const handlePackClick = () => {
    trackEvent('click_pack');
    trackEvent('purchase_pack'); // Simulated purchase
    onUpgrade();
  };

  const handlePassClick = () => {
    trackEvent('click_pass');
    trackEvent('purchase_pass'); // Simulated purchase
    onUpgrade();
  };

  if (!status) return null;

  const currentSubject = subjectName || "This Subject";
  const numOwnedPacks = status.ownedPacks?.length || 0;
  
  // If user already owns this specific subject
  if (status.ownedPacks?.includes(currentSubject)) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md text-center py-10">
          <div className="mx-auto w-12 h-12 bg-success/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
          <DialogTitle className="text-xl font-black mb-2">{t("youAlreadyOwn")}</DialogTitle>
          <DialogDescription className="text-base">
            {t("fullAccessTo").replace("{subject}", currentSubject)}
          </DialogDescription>
          <Button onClick={handleClose} className="mt-6 w-full font-bold">{t("close")}</Button>
        </DialogContent>
      </Dialog>
    );
  }

  // PRICING RULES
  const packPrice = "500 FCFA";
  const passPrice = numOwnedPacks > 0 ? "1000 FCFA" : "1500 FCFA";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-card border-border">
        {/* Header / Hero */}
        <div className="bg-premium/10 px-6 pt-8 pb-6 border-b border-premium/20 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-premium/20 rounded-full blur-3xl"></div>
          
          <Crown className="h-10 w-10 text-premium mx-auto mb-3 relative z-10" />
          <h2 className="text-2xl font-black text-foreground leading-tight mb-2 relative z-10">
            {t("focusOnWhatMatters")}
          </h2>
          <p className="text-sm font-semibold text-muted-foreground relative z-10">
            {t("questionsRepeat")}
          </p>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Value Preview list */}
          <div className="space-y-3">
            <div className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" /><span className="text-sm font-bold text-foreground">{t("top30Questions")}</span></div>
            <div className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" /><span className="text-sm font-bold text-foreground">{t("topicsLikelyAppear")}</span></div>
            <div className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" /><span className="text-sm font-bold text-foreground">{t("stepByStepSolutions")}</span></div>
            <div className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" /><span className="text-sm font-bold text-foreground">{t("whatToStudyGuide")}</span></div>
          </div>

          <div className="space-y-4">
            {/* CTA 1 (Pack) */}
            <button 
              onClick={handlePackClick}
              className="w-full relative overflow-hidden group rounded-2xl bg-premium border-2 border-premium transition-all p-4 flex flex-col items-center justify-center card-shadow active:translate-y-0.5 active:shadow-none active:scale-[0.98]"
            >
              <span className="relative z-10 text-lg font-black text-premium-foreground flex items-center justify-center gap-2">
                {t("unlockSubjectPack").replace("{subject}", currentSubject)}
                <ArrowRight className="h-5 w-5" />
              </span>
              <span className="relative z-10 text-sm font-bold text-foreground/70 mt-1">
                {packPrice}
              </span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 w-full">
              <div className="h-px bg-border flex-1"></div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">
                {t("preparingMultiple")}
              </span>
              <div className="h-px bg-border flex-1"></div>
            </div>

            {/* CTA 2 (Pass/Upgrade) */}
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              {numOwnedPacks > 0 ? (
                <div className="text-center mb-3">
                  <p className="text-xs font-bold text-primary mb-1">
                    <Zap className="h-3 w-3 inline mr-1" />
                    {t("youveUnlocked").replace("{n}", String(numOwnedPacks))}{numOwnedPacks > 1 ? "s" : ""}
                  </p>
                </div>
              ) : (
                <div className="text-center mb-3">
                  <p className="text-xs font-bold text-muted-foreground mb-1">{t("mostStudentsStart")}</p>
                </div>
              )}
              
              <button 
                onClick={handlePassClick}
                className="w-full rounded-xl bg-card hover:bg-muted border border-border transition-all py-3 flex flex-col items-center justify-center active:scale-[0.98]"
              >
                <span className="text-sm font-black text-foreground">
                  {numOwnedPacks > 0 ? t("unlockAllRemaining") : t("unlockAllSubjects")}
                </span>
                <span className="text-sm font-bold text-primary mt-0.5">
                  {passPrice}
                </span>
              </button>
              <p className="text-[10px] font-bold text-center text-muted-foreground mt-2 opacity-70">
                {t("bestForExamPrep")}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
