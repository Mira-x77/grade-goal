import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  AlertCircle, 
  FileText, 
  Bug, 
  Sparkles, 
  RefreshCw,
  X,
  Calendar,
  HardDrive
} from 'lucide-react';
import { updateService, type AppUpdate } from '@/services/UpdateService';
import { toast } from 'sonner';

interface UpdateDialogProps {
  isOpen: boolean;
  update: AppUpdate | null;
  onDismiss: () => void;
  onUpdateStarted: () => void;
  onUpdateCompleted: () => void;
}

export function UpdateDialog({ 
  isOpen, 
  update, 
  onDismiss, 
  onUpdateStarted, 
  onUpdateCompleted 
}: UpdateDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const formatFileSize = (bytes: number): string => {
    return updateService.formatFileSize(bytes);
  };

  const handleDismiss = () => {
    if (!update?.isMandatory && !isDownloading) {
      onDismiss();
    }
  };

  const startUpdate = async () => {
    if (!update) return;

    try {
      setIsDownloading(true);
      setErrorMessage('');
      onUpdateStarted();

      const success = await updateService.openStoreUpdate(update);

      if (success) {
        toast.success('Opening Google Play to update Go Study!');
        onUpdateCompleted();
        if (!update.isMandatory) onDismiss();
      } else {
        throw new Error('Could not open Google Play');
      }
    } catch (error) {
      console.error('Update failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Update failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const retryUpdate = () => {
    setErrorMessage('');
    startUpdate();
  };

  if (!update) return null;

  return (
    <Dialog open={isOpen} onOpenChange={update.isMandatory ? undefined : handleDismiss}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              App Update Available
            </DialogTitle>
            {!update.isMandatory && !isDownloading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Version Header */}
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold text-primary">
              Version {update.versionName}
            </h2>
            <div className="flex justify-center gap-2 flex-wrap">
              {update.isMandatory && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Required Update
                </Badge>
              )}
              <Badge variant="secondary" className="flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                {formatFileSize(update.fileSize)}
              </Badge>
            </div>
          </div>

          {/* Update Sections */}
          <div className="space-y-4">
            {/* Release Notes */}
            {update.releaseNotes && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 font-semibold text-sm">
                  <FileText className="h-4 w-4 text-blue-500" />
                  What's New
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {update.releaseNotes}
                </p>
              </div>
            )}

            {/* Bug Fixes */}
            {update.bugFixes && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 font-semibold text-sm">
                  <Bug className="h-4 w-4 text-red-500" />
                  Bug Fixes
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {update.bugFixes}
                </p>
              </div>
            )}

            {/* New Features */}
            {update.newFeatures && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 font-semibold text-sm">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  New Features
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {update.newFeatures}
                </p>
              </div>
            )}
          </div>

          {/* Download Progress */}
          {isDownloading && (
            <div className="space-y-2 p-4 bg-muted rounded-lg text-center">
              <h4 className="font-semibold text-sm">Opening Google Play…</h4>
              <p className="text-xs text-muted-foreground">
                Tap Update on the Play Store page to install the latest version.
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-destructive">
                    Download Failed
                  </h4>
                  <p className="text-sm text-destructive/80 mt-1">
                    {errorMessage}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!update.isMandatory && !isDownloading && (
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="w-full sm:w-auto"
            >
              Later
            </Button>
          )}
          
          {!isDownloading && !errorMessage && (
            <Button
              onClick={startUpdate}
              disabled={isDownloading}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              {update.isMandatory ? 'Update on Google Play' : 'Update on Google Play'}
            </Button>
          )}

          {errorMessage && (
            <Button
              onClick={retryUpdate}
              className="w-full sm:w-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Download
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}