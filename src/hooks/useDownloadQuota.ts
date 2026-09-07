import { useState, useEffect, useCallback } from 'react';
import { quotaService, type DownloadQuota } from '@/services/quotaService';
import { quotaEvents } from '@/lib/quotaEvents';
import { usePremium } from '@/hooks/usePremium';

export function useDownloadQuota() {
  const { isPremium: appPremium } = usePremium();
  const [quota, setQuota] = useState<DownloadQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuota = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const quotaStatus = await quotaService.getQuotaStatus();
      setQuota(quotaStatus);
    } catch (err) {
      console.error('Failed to load quota:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quota');
    } finally {
      setLoading(false);
    }
  }, []);

  const applySnapshot = useCallback((snapshot: DownloadQuota) => {
    setQuota(snapshot);
    setLoading(false);
    setError(null);
  }, []);

  const refreshQuota = useCallback(async () => {
    await loadQuota();
  }, [loadQuota]);

  const checkCanDownload = useCallback(async (): Promise<boolean> => {
    try {
      return await quotaService.canDownload();
    } catch (err) {
      console.error('Failed to check download permission:', err);
      return false;
    }
  }, []);

  const getQuotaMessage = useCallback(async (): Promise<string> => {
    try {
      return await quotaService.getQuotaMessage();
    } catch (err) {
      console.error('Failed to get quota message:', err);
      return 'Unable to check download quota';
    }
  }, []);

  useEffect(() => {
    void loadQuota();
    return quotaEvents.subscribe((snapshot) => {
      if (snapshot) {
        applySnapshot(snapshot);
      } else {
        void loadQuota();
      }
    });
  }, [loadQuota, applySnapshot]);

  return {
    quota,
    loading,
    error,
    refreshQuota,
    checkCanDownload,
    getQuotaMessage,
    canDownload: appPremium || (quota?.canDownload ?? false),
    hasPremium: appPremium || (quota?.hasPremium ?? false),
    downloadsRemaining: quota?.downloadsRemaining ?? 0,
    downloadsUsed: quota?.downloadsUsed ?? 0,
    quotaLimit: quota?.quotaLimit ?? 5,
  };
}
