import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  CODE_PRICING_CONFIG_KEY,
  DEFAULT_CODE_PRICING,
  parseCodePricing,
  formatCodePrice,
} from '../../lib/code-pricing';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Printer, Loader2 } from 'lucide-react';
import { generateCodes } from '../../lib/code-generator';
import { subscriptionService } from '../../services/subscriptionService';
import { toast } from 'sonner';
import { PrintableTearOffSheet } from './PrintableTearOffSheet';

interface PrintableCodesSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PrintableCodesSheet({ open, onClose, onSuccess }: PrintableCodesSheetProps) {
  const [quantity, setQuantity] = useState(25);
  const [duration, setDuration] = useState<1 | 3 | 6 | 12>(1);
  const [loading, setLoading] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  const [pricing, setPricing] = useState(DEFAULT_CODE_PRICING);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('app_config')
      .select('value')
      .eq('key', CODE_PRICING_CONFIG_KEY)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setPricing(parseCodePricing(data.value));
      });
  }, [open]);

  const prices = useMemo(() => {
    const p = pricing;
    return {
      1: formatCodePrice(p.month1, p.currency),
      3: p.month3 ? formatCodePrice(p.month3, p.currency) : '—',
      6: p.month6 ? formatCodePrice(p.month6, p.currency) : '—',
      12: p.month12 ? formatCodePrice(p.month12, p.currency) : '—',
    };
  }, [pricing]);

  const handleGenerate = async () => {
    if (quantity < 1 || quantity > 100) {
      toast.error('Quantity must be between 1 and 100');
      return;
    }
    setLoading(true);
    try {
      const codes = await generateCodes(quantity, duration);
      await subscriptionService.batchGenerateCodes(codes, duration);
      setGeneratedCodes(codes);
      toast.success(`Generated ${quantity} codes successfully!`);
      onSuccess();
    } catch (error) {
      console.error('Failed to generate codes:', error);
      toast.error('Failed to generate codes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setGeneratedCodes([]);
    onClose();
  };

  return (
    <>
      <Dialog open={open && generatedCodes.length === 0} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate printable code sheet</DialogTitle>
            <DialogDescription>
              Creates tear-off slips with QR codes for the Play Store
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Number of codes</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select
                value={String(duration)}
                onValueChange={(v) => setDuration(parseInt(v, 10) as 1 | 3 | 6 | 12)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Month — {prices[1]}</SelectItem>
                  <SelectItem value="3">3 Months — {prices[3]}</SelectItem>
                  <SelectItem value="6">6 Months — {prices[6]}</SelectItem>
                  <SelectItem value="12">12 Months — {prices[12]}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4 mr-2" />
                    Generate & Print
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <PrintableTearOffSheet
        open={generatedCodes.length > 0}
        codes={generatedCodes}
        durationMonths={duration}
        onClose={handleClose}
      />
    </>
  );
}
