/**
 * Quota update events — pass a snapshot after increment for instant UI updates.
 */

import type { DownloadQuota } from '@/services/quotaService';

export type QuotaEventListener = (snapshot?: DownloadQuota) => void;

class QuotaEventEmitter {
  private listeners: Set<QuotaEventListener> = new Set();

  subscribe(listener: QuotaEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Emit optional snapshot from increment RPC; omit to refetch from server */
  emit(snapshot?: DownloadQuota): void {
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error('Error in quota event listener:', error);
      }
    });
  }
}

export const quotaEvents = new QuotaEventEmitter();
