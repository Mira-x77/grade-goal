import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { GradingSystem } from "@/types/exam";
import { useLanguage } from "@/contexts/LanguageContext";

const SYSTEM_LABELS: Record<GradingSystem, string> = {
  apc: "APC (Togolese Standard)",
  french: "French Traditional",
  nigerian_university: "Nigerian University",
};

interface GradingSystemConflictModalProps {
  open: boolean;
  cloudSystem: GradingSystem;
  localSystem: GradingSystem;
  onChoose: (chosen: "cloud" | "local") => void;
}

export function GradingSystemConflictModal({
  open,
  cloudSystem,
  localSystem,
  onChoose,
}: GradingSystemConflictModalProps) {
  const { t } = useLanguage();
  return (
    <Dialog open={open}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-sm"
      >
        <DialogHeader>
          <DialogTitle>{t("gradingConflictTitle")}</DialogTitle>
          <DialogDescription>
            {t("gradingConflictDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-2">
          <Button
            variant="outline"
            className="flex flex-col h-auto py-3 gap-1"
            onClick={() => onChoose("cloud")}
          >
            <span className="font-semibold">{t("cloudAccount")}</span>
            <span className="text-sm text-muted-foreground">
              {SYSTEM_LABELS[cloudSystem] ?? cloudSystem}
            </span>
          </Button>

          <Button
            variant="outline"
            className="flex flex-col h-auto py-3 gap-1"
            onClick={() => onChoose("local")}
          >
            <span className="font-semibold">{t("thisDevice")}</span>
            <span className="text-sm text-muted-foreground">
              {SYSTEM_LABELS[localSystem] ?? localSystem}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
