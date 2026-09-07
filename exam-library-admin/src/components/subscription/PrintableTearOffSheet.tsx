import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Printer, X } from 'lucide-react';

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.scoretarget.app';

function qrUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(data)}`;
}

interface PrintableTearOffSheetProps {
  open: boolean;
  codes: string[];
  durationMonths: number;
  onClose: () => void;
}

export function PrintableTearOffSheet({
  open,
  codes,
  durationMonths,
  onClose,
}: PrintableTearOffSheetProps) {
  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible print:border-0 print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Print codes — Go Study!</DialogTitle>
          <DialogDescription>
            {codes.length} tear-off slips · {durationMonths} month(s) each · cut along dashed lines
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 print:hidden mb-4">
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>

        <div id="printable-codes-root" className="print-codes-root bg-white text-black p-2 print:p-0">
          <div className="hidden print:block text-center mb-4 pb-2 border-b-2 border-black">
            <h1 className="text-2xl font-bold">Go Study! — Premium Codes</h1>
            <p className="text-sm">
              {durationMonths} month access · {codes.length} codes · {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
            {codes.map((code, index) => (
              <div
                key={code}
                className="tear-off-slip border-2 border-dashed border-gray-400 rounded-lg p-3 flex flex-col items-center text-center bg-white print:break-inside-avoid print:min-h-[2.75in]"
              >
                <p className="text-lg font-bold tracking-tight text-indigo-700">Go Study!</p>
                <p className="text-[10px] text-gray-600 mt-0.5 uppercase tracking-wide">Premium access code</p>

                <p className="font-mono text-2xl font-black my-3 tracking-wider text-black">{code}</p>

                <p className="text-[9px] leading-snug text-gray-700 max-w-[180px]">
                  Download <strong>Go Study!</strong> → tap <strong>Premium</strong> → enter this code
                </p>

                <img
                  src={qrUrl(PLAY_STORE_URL)}
                  alt="Play Store QR"
                  className="mt-2 h-[72px] w-[72px] print:h-[68px] print:w-[68px]"
                  width={72}
                  height={72}
                />
                <p className="text-[8px] text-gray-500 mt-1">Scan for Play Store</p>

                <p className="text-[8px] text-gray-400 mt-auto pt-2">#{String(index + 1).padStart(3, '0')} · {durationMonths}M</p>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @media print {
            @page { margin: 0.4in; size: A4; }
            body * { visibility: hidden !important; }
            #printable-codes-root,
            #printable-codes-root * {
              visibility: visible !important;
            }
            #printable-codes-root {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .tear-off-slip {
              border-color: #666 !important;
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
