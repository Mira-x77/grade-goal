import { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { generateAndInsertCodes } from '../../lib/code-generator';
import { PrintableTearOffSheet } from './PrintableTearOffSheet';

const QUICK_COUNTS = [10, 25, 50, 100] as const;
const DEFAULT_DURATION = 1;

interface QuickGeneratePrintProps {
  onGenerated?: () => void;
}

export function QuickGeneratePrint({ onGenerated }: QuickGeneratePrintProps) {
  const { user } = useAuth();
  const [loadingCount, setLoadingCount] = useState<number | null>(null);
  const [printCodes, setPrintCodes] = useState<string[]>([]);
  const [printDuration, setPrintDuration] = useState(DEFAULT_DURATION);

  const handleQuickGenerate = async (count: number) => {
    setLoadingCount(count);
    try {
      const codes = await generateAndInsertCodes(count, DEFAULT_DURATION, user?.email || 'admin');
      setPrintDuration(DEFAULT_DURATION);
      setPrintCodes(codes);
      toast.success(`Generated ${count} codes — ready to print`);
      onGenerated?.();
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate codes');
    } finally {
      setLoadingCount(null);
    }
  };

  return (
    <>
      <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-5 w-5 text-yellow-400" />
          <h3 className="font-bold text-white">Quick generate & print</h3>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          One tap creates codes and opens a print-ready tear-off sheet (1 month each).
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_COUNTS.map((count) => (
            <Button
              key={count}
              onClick={() => handleQuickGenerate(count)}
              disabled={loadingCount !== null}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold min-w-[4.5rem]"
            >
              {loadingCount === count ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                count
              )}
            </Button>
          ))}
        </div>
      </div>

      <PrintableTearOffSheet
        open={printCodes.length > 0}
        codes={printCodes}
        durationMonths={printDuration}
        onClose={() => setPrintCodes([])}
      />
    </>
  );
}
