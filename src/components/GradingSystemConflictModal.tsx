import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { GradingSystem } from "@/types/exam";

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
  return (
    <Dialog open={open}>
      <DialogContent
        // Prevent closing by clicking outside — user must make a choice
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-sm"
      >
        <DialogHeader>
          <DialogTitle>Grading System Conflict</DialogTitle>
          <DialogDescription>
            Your cloud account and this device have different grading systems saved.
            Which one would you like to keep?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-2">
          <Button
            variant="outline"
            className="flex flex-col h-auto py-3 gap-1"
            onClick={() => onChoose("cloud")}
          >
            <span className="font-semibold">Cloud account</span>
            <span className="text-sm text-muted-foreground">
              {SYSTEM_LABELS[cloudSystem] ?? cloudSystem}
            </span>
          </Button>

          <Button
            variant="outline"
            className="flex flex-col h-auto py-3 gap-1"
            onClick={() => onChoose("local")}
          >
            <span className="font-semibold">This device</span>
            <span className="text-sm text-muted-foreground">
              {SYSTEM_LABELS[localSystem] ?? localSystem}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
