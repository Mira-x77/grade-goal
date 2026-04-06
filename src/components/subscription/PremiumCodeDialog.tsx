import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Crown, Loader2, MessageCircle } from 'lucide-react';
import { subscriptionService } from '@/services/subscriptionService';
import { toast } from 'sonner';

interface PremiumCodeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PremiumCodeDialog({
  open,
  onClose,
  onSuccess,
}: PremiumCodeDialogProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Auto-format with dashes: XXXX-XXXX-XXXX
    if (value.length > 4 && value.length <= 8) {
      value = value.slice(0, 4) + '-' + value.slice(4);
    } else if (value.length > 8) {
      value = value.slice(0, 4) + '-' + value.slice(4, 8) + '-' + value.slice(8, 12);
    }
    
    setCode(value);
  };

  const handleActivate = async () => {
    if (code.replace(/-/g, '').length !== 12) {
      toast.error('Please enter a valid 12-character code');
      return;
    }

    setLoading(true);
    try {
      await subscriptionService.activatePremiumCode(code);
      toast.success('Full Access granted! You now have unlimited intelligence access.');
      onSuccess();
      onClose();
      setCode('');
    } catch (error: any) {
      console.error('Activation error:', error);
      toast.error(error.message || 'Failed to activate code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setCode('');
      onClose();
    }
  };

  const handleWhatsAppContact = () => {
    const phoneNumber = '22890676722'; // +228 90676722
    const message = encodeURIComponent('Hello! I would like to purchase a Go Study! Access code.');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-premium" />
            Enter Access Code
          </DialogTitle>
          <DialogDescription>
            Enter your code to unlock full exam intelligence & downloads
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Premium Pricing Info */}
          <div className="bg-premium/10 rounded-xl p-4 border border-premium/20">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Crown className="h-4 w-4 text-premium" />
              Pass Smarter Plans (Full Access)
            </h3>
            <div className="space-y-2 text-sm">
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
          </div>

          {/* WhatsApp Contact Button */}
          <button
            onClick={handleWhatsAppContact}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            Request Code via WhatsApp
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">
                Already have a code?
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Enter Access Code</Label>
            <Input
              id="code"
              placeholder="XXXX-XXXX-XXXX"
              value={code}
              onChange={handleCodeChange}
              maxLength={14}
              className="font-mono text-center text-lg tracking-wider"
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Enter the 12-character code you received
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleActivate}
              disabled={loading || code.replace(/-/g, '').length !== 12}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Activate
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
