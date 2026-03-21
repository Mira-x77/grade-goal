import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Plus, Printer } from 'lucide-react';
import { StatsCards } from '../components/subscription/StatsCards';
import { CodesTable } from '../components/subscription/CodesTable';
import { GenerateCodesDialog } from '../components/subscription/GenerateCodesDialog';
import { PrintableCodesSheet } from '../components/subscription/PrintableCodesSheet';

export default function SubscriptionCodes() {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showPrintSheet, setShowPrintSheet] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCodesGenerated = () => {
    setRefreshKey(prev => prev + 1);
    setShowGenerateDialog(false);
  };

  const handleSheetGenerated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Subscription Codes</h1>
          <p className="text-muted-foreground mt-1">
            Generate and manage premium subscription codes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPrintSheet(true)}>
            <Printer className="h-4 w-4 mr-2" />
            Print Sheet
          </Button>
          <Button onClick={() => setShowGenerateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Generate Codes
          </Button>
        </div>
      </div>

      <StatsCards key={`stats-${refreshKey}`} />
      
      <CodesTable key={`table-${refreshKey}`} />

      <GenerateCodesDialog
        open={showGenerateDialog}
        onClose={() => setShowGenerateDialog(false)}
        onSuccess={handleCodesGenerated}
      />

      <PrintableCodesSheet
        open={showPrintSheet}
        onClose={() => setShowPrintSheet(false)}
        onSuccess={handleSheetGenerated}
      />
    </div>
  );
}
