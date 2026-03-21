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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, Loader2, Sparkles } from 'lucide-react';
import { generateAndInsertCodes } from '@/lib/code-generator';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface GenerateCodesDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function GenerateCodesDialog({
  open,
  onClose,
  onSuccess,
}: GenerateCodesDialogProps) {
  const { user } = useAuth();
  const [duration, setDuration] = useState('3');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  const handleGenerate = async () => {
    const qty = parseInt(quantity);
    const dur = parseInt(duration);

    if (isNaN(qty) || qty < 1 || qty > 100) {
      toast.error('Quantity must be between 1 and 100');
      return;
    }

    setLoading(true);
    try {
      const codes = await generateAndInsertCodes(qty, dur, user?.email || 'admin');
      setGeneratedCodes(codes);
      toast.success(`Generated ${codes.length} codes successfully`);
    } catch (error: any) {
      console.error('Failed to generate codes:', error);
      toast.error(error.message || 'Failed to generate codes');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const copyAllCodes = () => {
    const allCodes = generatedCodes.join('\n');
    navigator.clipboard.writeText(allCodes);
    toast.success(`Copied ${generatedCodes.length} codes to clipboard`);
  };

  const handleClose = () => {
    if (generatedCodes.length > 0) {
      onSuccess();
    }
    setGeneratedCodes([]);
    setQuantity('1');
    setDuration('3');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Generate Subscription Codes
          </DialogTitle>
          <DialogDescription>
            {generatedCodes.length === 0
              ? 'Create new premium subscription codes'
              : 'Codes generated successfully. Copy and save them now.'}
          </DialogDescription>
        </DialogHeader>

        {generatedCodes.length === 0 ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Month</SelectItem>
                  <SelectItem value="3">3 Months</SelectItem>
                  <SelectItem value="6">6 Months</SelectItem>
                  <SelectItem value="12">12 Months (1 Year)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter number of codes"
              />
              <p className="text-xs text-muted-foreground">
                Maximum 100 codes per generation
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Codes
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Generated {generatedCodes.length} codes ({duration} month{duration !== '1' ? 's' : ''} each)
              </p>
              <Button onClick={copyAllCodes} variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy All
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-4">
              {generatedCodes.map((code, index) => (
                <div
                  key={code}
                  className="flex items-center justify-between p-3 bg-muted rounded hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-8">
                      #{index + 1}
                    </span>
                    <code className="font-mono font-medium text-sm">{code}</code>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyCode(code)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
