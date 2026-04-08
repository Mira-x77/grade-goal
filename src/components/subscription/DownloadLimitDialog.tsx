import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface DownloadLimitDialogProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export function DownloadLimitDialog({ open, onClose, onUpgrade }: DownloadLimitDialogProps) {
  const { t } = useLanguage();
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("unlockPremiumStudyTools")}</DialogTitle>
          <DialogDescription>{t("unlockPremiumStudyToolsDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Crown className="h-5 w-5 text-premium" />
              {t("upgradeToPremium")}
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span><span>{t("top30Questions")}</span></li>
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span><span>{t("topicsLikelyAppear")}</span></li>
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span><span>{t("stepByStepSolutions")}</span></li>
            </ul>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              <X className="h-4 w-4 mr-2" />{t("cancel")}
            </Button>
            <Button onClick={onUpgrade} className="flex-1">
              <Crown className="h-4 w-4 mr-2" />{t("unlock")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
