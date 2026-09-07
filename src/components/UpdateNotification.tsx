import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  X, 
  Bell,
  Smartphone
} from 'lucide-react';
import { type AppUpdate } from '@/services/UpdateService';

interface UpdateNotificationProps {
  update: AppUpdate | null;
  onInstallNow: () => void;
  onDismiss: () => void;
}

export function UpdateNotification({ 
  update, 
  onInstallNow, 
  onDismiss 
}: UpdateNotificationProps) {
  if (!update) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-background border border-border rounded-lg shadow-lg p-4 animate-in slide-in-from-top-2 duration-300">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Update Available</h4>
              <p className="text-xs text-muted-foreground">Version {update.versionName}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        <div className="space-y-3">
          {/* Quick preview of release notes */}
          <p className="text-xs text-muted-foreground line-clamp-2">
            {update.releaseNotes}
          </p>

          {/* Badges */}
          <div className="flex gap-1 flex-wrap">
            {update.isMandatory && (
              <Badge variant="destructive" className="text-xs">
                Required
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {formatFileSize(update.fileSize)}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onInstallNow}
              className="flex-1 h-8 text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              Install
            </Button>
            {!update.isMandatory && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDismiss}
                className="h-8 text-xs"
              >
                Later
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}