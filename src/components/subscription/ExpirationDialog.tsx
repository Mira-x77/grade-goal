import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ExpirationDialogProps {
  open: boolean;
  onClose: () => void;
  onRenew: () => void;
}

export function ExpirationDialog({ open, onClose, onRenew }: ExpirationDialogProps) {
  const { t } = useLanguage();
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-secondary" />
            {t("premiumExpired")}
          </DialogTitle>
          <DialogDescription>{t("premiumExpiredDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-4">{t("premiumExpiredBody")}</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span><span>{t("freePlanDownloads")}</span></div>
              <div className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span><span>{t("premiumUnlimited")}</span></div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">{t("continueWithFree")}</Button>
            <Button onClick={onRenew} className="flex-1">
              <Crown className="h-4 w-4 mr-2" />{t("enterNewCode")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
