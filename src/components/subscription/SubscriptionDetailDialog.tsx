import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Calendar, Download, MessageCircle } from 'lucide-react';
import { subscriptionService } from '@/services/subscriptionService';

interface SubscriptionDetailDialogProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export function SubscriptionDetailDialog({
  open,
  onClose,
  onUpgrade,
}: SubscriptionDetailDialogProps) {
  const [status, setStatus] = useState<{
    tier: string;
    downloads: string;
    expires?: string;
    daysRemaining?: number;
    isUnlimited: boolean;
  } | null>(null);

  useEffect(() => {
    if (open) {
      loadStatus();
    }
  }, [open]);

  const loadStatus = async () => {
    try {
      const statusData = await subscriptionService.getStatus();
      setStatus(statusData);
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    }
  };

  if (!status) return null;

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleWhatsAppContact = () => {
    const phoneNumber = '22890676722'; // +228 90676722
    const message = encodeURIComponent('Hello! I would like to purchase a ScoreTarget Premium code.');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status.tier === 'premium' ? (
              <>
                <Crown className="h-5 w-5 text-yellow-500" />
                Premium Subscription
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Free Plan
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Your current subscription details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Plan</span>
            <span className="font-medium capitalize">{status.tier}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Downloads this month</span>
            <span className="font-medium">{status.downloads}</span>
          </div>

          {status.tier === 'premium' && status.expires && (
            <>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Expires on</span>
                <span className="font-medium">{formatDate(status.expires)}</span>
              </div>

              {status.daysRemaining !== undefined && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Days remaining</span>
                  <span className="font-medium">
                    {status.daysRemaining} {status.daysRemaining === 1 ? 'day' : 'days'}
                  </span>
                </div>
              )}
            </>
          )}

          {status.tier === 'free' && (
            <div className="mt-4 space-y-4">
              {/* Premium Pricing */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-600" />
                  Premium Plans
                </h4>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">1 Month</span>
                    <span className="font-bold text-foreground">500 FCFA</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">6 Months</span>
                    <span className="font-bold text-foreground">3,000 FCFA</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">1 Year</span>
                    <span className="font-bold text-foreground">5,000 FCFA</span>
                  </div>
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>✓ Unlimited downloads</li>
                  <li>✓ Access all exam papers</li>
                  <li>✓ No monthly limits</li>
                </ul>
              </div>

              {/* WhatsApp Contact */}
              <button
                onClick={handleWhatsAppContact}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
                Contact via WhatsApp
              </button>

              {/* Upgrade Button */}
              <Button onClick={onUpgrade} className="w-full" variant="outline">
                <Crown className="h-4 w-4 mr-2" />
                I Have a Code
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
