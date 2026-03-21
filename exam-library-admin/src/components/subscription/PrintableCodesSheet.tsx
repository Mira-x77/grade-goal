import { useState } from 'react';
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
import { Printer, Download, Loader2 } from 'lucide-react';
import { generateCodes } from '../../lib/code-generator';
import { subscriptionService } from '../../services/subscriptionService';
import { toast } from 'sonner';

interface PrintableCodesSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PrintableCodesSheet({ open, onClose, onSuccess }: PrintableCodesSheetProps) {
  const [quantity, setQuantity] = useState(20);
  const [duration, setDuration] = useState<1 | 3 | 6 | 12>(1);
  const [loading, setLoading] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const prices = {
    1: '500 FCFA',
    3: '1,500 FCFA',
    6: '3,000 FCFA',
    12: '5,000 FCFA'
  };

  const handleGenerate = async () => {
    if (quantity < 1 || quantity > 100) {
      toast.error('Quantity must be between 1 and 100');
      return;
    }

    setLoading(true);
    try {
      // Generate codes with duration
      const codes = await generateCodes(quantity, duration);
      
      // Save to database
      await subscriptionService.batchGenerateCodes(codes, duration);
      
      setGeneratedCodes(codes);
      setShowPreview(true);
      toast.success(`Generated ${quantity} codes successfully!`);
      onSuccess();
    } catch (error) {
      console.error('Failed to generate codes:', error);
      toast.error('Failed to generate codes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    const csv = [
      'Code,Duration,Price,Status',
      ...generatedCodes.map(code => `${code},${duration} month(s),${prices[duration]},Unused`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scoretarget-codes-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setGeneratedCodes([]);
    setShowPreview(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open && !showPreview} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Printable Code Sheet</DialogTitle>
            <DialogDescription>
              Create multiple codes for mass distribution to students
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Number of Codes</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                placeholder="e.g., 20"
              />
              <p className="text-xs text-muted-foreground">
                Maximum 100 codes per sheet
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Subscription Duration</Label>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v) as 1 | 3 | 6 | 12)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Month - 500 FCFA</SelectItem>
                  <SelectItem value="3">3 Months - 1,500 FCFA</SelectItem>
                  <SelectItem value="6">6 Months - 3,000 FCFA</SelectItem>
                  <SelectItem value="12">12 Months - 5,000 FCFA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <h4 className="font-semibold mb-2">Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Codes to generate:</span>
                  <span className="font-semibold">{quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-semibold">{duration} month(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price per code:</span>
                  <span className="font-semibold">{prices[duration]}</span>
                </div>
              </div>
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
                    Generate Sheet
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview and Print Dialog */}
      <Dialog open={showPreview} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="print:hidden">
            <DialogTitle>Generated Codes - Ready to Print</DialogTitle>
            <DialogDescription>
              {generatedCodes.length} codes generated. Print or download as CSV.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex gap-2 print:hidden">
              <Button onClick={handlePrint} className="flex-1">
                <Printer className="h-4 w-4 mr-2" />
                Print Sheet
              </Button>
              <Button onClick={handleDownloadCSV} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            </div>

            {/* Printable Sheet */}
            <div className="print:p-8">
              {/* Header */}
              <div className="text-center mb-8 border-b-2 border-gray-300 pb-4">
                <h1 className="text-3xl font-bold text-gray-900">ScoreTarget Premium Codes</h1>
                <p className="text-lg text-gray-600 mt-2">
                  {duration} Month Subscription - {prices[duration]}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Generated: {new Date().toLocaleDateString()} | Total Codes: {generatedCodes.length}
                </p>
              </div>

              {/* Codes Grid */}
              <div className="grid grid-cols-2 gap-4">
                {generatedCodes.map((code, index) => (
                  <div
                    key={code}
                    className="border-2 border-gray-300 rounded-lg p-4 bg-white print:break-inside-avoid"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500">
                        #{String(index + 1).padStart(3, '0')}
                      </span>
                      <span className="text-xs font-semibold text-green-600">
                        {duration}M
                      </span>
                    </div>
                    <div className="font-mono text-xl font-bold text-center py-3 bg-gray-50 rounded border border-gray-200">
                      {code}
                    </div>
                    <div className="mt-2 text-xs text-gray-600 text-center">
                      {prices[duration]}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t-2 border-gray-300 text-center text-sm text-gray-600">
                <p className="font-semibold">How to Redeem:</p>
                <p className="mt-1">
                  1. Open ScoreTarget app → Library → Subscription Badge
                </p>
                <p>2. Tap "I Have a Code" → Enter code → Activate</p>
                <p className="mt-2 text-xs text-gray-500">
                  For support: WhatsApp +228 90676722
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:p-8, .print\\:p-8 * {
            visibility: visible;
          }
          .print\\:p-8 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </>
  );
}
