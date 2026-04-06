import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, X } from 'lucide-react';

interface DownloadLimitDialogProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export function DownloadLimitDialog({
  open,
  onClose,
  onUpgrade,
}: DownloadLimitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Limit Reached</DialogTitle>
          <DialogDescription>
            You've used all 5 free downloads this month
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Crown className="h-5 w-5 text-premium" />
              Upgrade to Premium
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Unlimited downloads every month</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Access to all exam papers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>No waiting for monthly reset</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={onUpgrade} className="flex-1">
              <Crown className="h-4 w-4 mr-2" />
              Enter Premium Code
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
