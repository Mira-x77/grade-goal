import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { markSetupSkipped } from "@/lib/schedule-storage";
import { t } from "@/lib/i18n";

interface ScheduleSetupCardProps {
  onSetupNow: () => void;
  onDismiss: () => void;
}

export function ScheduleSetupCard({ onSetupNow, onDismiss }: ScheduleSetupCardProps) {
  const handleRemindLater = () => {
    markSetupSkipped();
    onDismiss();
  };

  return (
    <div className="rounded-2xl bg-card p-4 border-2 border-border">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 flex-shrink-0">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-foreground text-sm">{t("neverForgetBooks")}</h3>
          <p className="text-xs font-semibold text-muted-foreground mt-1">
            {t("setupScheduleReminder")}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onSetupNow}
              className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground active:scale-95 transition-transform"
            >
              {t("setUpNow")}
            </button>
            <button
              onClick={handleRemindLater}
              className="rounded-xl bg-muted px-3 py-2 text-sm font-bold text-foreground active:scale-95 transition-transform"
            >
              {t("later")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

