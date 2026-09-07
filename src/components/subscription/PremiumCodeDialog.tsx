import { RedeemCodeSheet } from './RedeemCodeSheet';

interface PremiumCodeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/** @deprecated Use RedeemCodeSheet via PremiumIntroSheet — kept for Library entry points */
export function PremiumCodeDialog({ open, onClose, onSuccess }: PremiumCodeDialogProps) {
  return (
    <RedeemCodeSheet
      open={open}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
