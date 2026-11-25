import { useCallback } from 'react';
import { usePremium } from '@/contexts/AppConfigContext';
import { useDownloadQuota } from '@/hooks/useDownloadQuota';

/** Freemium: view + download allowed while monthly quota remains; premium is unlimited. */
export function useLibraryContentGate() {
  const { isPremium, openDownloadLimitGate } = usePremium();
  const { canDownload } = useDownloadQuota();
  const canView = isPremium || canDownload;

  const requireViewAccess = useCallback((opts?: { alreadyOnDevice?: boolean; onSuccess?: () => void }): boolean => {
    if (opts?.alreadyOnDevice) return true;
    if (canView) return true;
    openDownloadLimitGate(opts?.onSuccess);
    return false;
  }, [canView, openDownloadLimitGate]);

  return { canView, requireViewAccess, isPremium, canDownload };
}
