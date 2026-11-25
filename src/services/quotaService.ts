import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/lib/device-id';
import {
  bumpLifetimeDownloadPeak,
  readLifetimeDownloadPeak,
} from '@/lib/download-quota-lifetime';
import { subscriptionService } from '@/services/subscriptionService';

export interface DownloadQuota {
  downloadsUsed: number;
  quotaLimit: number;
  downloadsRemaining: number;
  hasPremium: boolean;
  premiumExpiresAt?: string;
  monthYear: string;
  canDownload: boolean;
}

export interface QuotaCheckResult {
  success: boolean;
  message: string;
  downloadsUsed: number;
  quotaLimit: number;
  hasPremium: boolean;
}

const LOCAL_QUOTA_KEY = 'scoretarget_local_quota_used';

function currentMonthYear(): string {
  return new Date().toISOString().slice(0, 7);
}

function readLocalUsed(): number {
  try {
    const raw = localStorage.getItem(LOCAL_QUOTA_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { month?: string; used?: number };
    if (parsed.month !== currentMonthYear()) return 0;
    return typeof parsed.used === 'number' ? parsed.used : 0;
  } catch {
    return 0;
  }
}

function writeLocalUsed(used: number): void {
  localStorage.setItem(
    LOCAL_QUOTA_KEY,
    JSON.stringify({ month: currentMonthYear(), used })
  );
}

class QuotaService {
  /** Build UI quota from increment_download_with_quota RPC row */
  fromIncrementResult(row: {
    downloads_used?: number;
    quota_limit?: number;
    has_premium?: boolean;
  }): DownloadQuota {
    const downloadsUsed = row.downloads_used ?? 0;
    const quotaLimit = row.quota_limit ?? 5;
    const hasPremium = row.has_premium ?? false;
    writeLocalUsed(downloadsUsed);
    bumpLifetimeDownloadPeak(downloadsUsed);
    return {
      downloadsUsed,
      quotaLimit,
      downloadsRemaining: hasPremium
        ? 999999
        : Math.max(0, quotaLimit - downloadsUsed),
      hasPremium,
      monthYear: currentMonthYear(),
      canDownload: hasPremium || downloadsUsed < quotaLimit,
    };
  }

  async getQuotaStatus(): Promise<DownloadQuota> {
    try {
      const deviceId = await getDeviceId();
      
      const { data, error } = await supabase.rpc('get_download_quota_status', {
        p_device_id: deviceId
      });

      if (error) {
        console.error('Error getting quota status:', error);
        return await this.fallbackQuota();
      }

      const quota = Array.isArray(data) ? data[0] : data;
      const serverUsed = quota.downloads_used ?? 0;
      const localUsed = readLocalUsed();
      const lifetimePeak = readLifetimeDownloadPeak();
      const downloadsUsed = Math.max(serverUsed, localUsed, lifetimePeak);
      bumpLifetimeDownloadPeak(downloadsUsed);
      const quotaLimit = quota.quota_limit ?? 5;
      const paidLocal = (await subscriptionService.getStatus()).hasPremiumAccess;
      const hasPremium = paidLocal || (quota.has_premium ?? false);
      const atOrOverLimit = downloadsUsed >= quotaLimit;

      return {
        downloadsUsed,
        quotaLimit,
        downloadsRemaining: hasPremium
          ? 999999
          : Math.max(0, quotaLimit - downloadsUsed),
        hasPremium,
        monthYear: quota.month_year ?? currentMonthYear(),
        canDownload: hasPremium || (!atOrOverLimit && (quota.can_download ?? downloadsUsed < quotaLimit)),
      };
    } catch (error) {
      console.error('Error getting quota status:', error);
      return await this.fallbackQuota();
    }
  }

  private async fallbackQuota(): Promise<DownloadQuota> {
    const paid = (await subscriptionService.getStatus()).hasPremiumAccess;
    const localUsed = readLocalUsed();
    const lifetimePeak = readLifetimeDownloadPeak();
    const downloadsUsed = Math.max(localUsed, lifetimePeak);
    bumpLifetimeDownloadPeak(downloadsUsed);
    const quotaLimit = 5;
    return {
      downloadsUsed,
      quotaLimit,
      downloadsRemaining: paid ? 999999 : Math.max(0, quotaLimit - downloadsUsed),
      hasPremium: paid,
      monthYear: currentMonthYear(),
      canDownload: paid || downloadsUsed < quotaLimit,
    };
  }

  /**
   * Check if user can download (without incrementing count)
   */
  async canDownload(): Promise<boolean> {
    const quota = await this.getQuotaStatus();
    return quota.canDownload;
  }

  /**
   * Get downloads remaining for current month
   */
  async getDownloadsRemaining(): Promise<number> {
    const quota = await this.getQuotaStatus();
    return quota.downloadsRemaining;
  }

  /**
   * Check if user has premium access
   */
  async hasPremiumAccess(): Promise<boolean> {
    const quota = await this.getQuotaStatus();
    return quota.hasPremium;
  }

  /**
   * Get quota display message
   */
  async getQuotaMessage(): Promise<string> {
    const quota = await this.getQuotaStatus();
    
    if (quota.hasPremium) {
      return 'Premium: Unlimited downloads';
    }
    
    if (quota.downloadsRemaining <= 0) {
      return 'Download limit reached. Upgrade to premium for unlimited downloads.';
    }
    
    return `${quota.downloadsRemaining} downloads remaining this month`;
  }

  /**
   * Get quota progress (0-1)
   */
  async getQuotaProgress(): Promise<number> {
    const quota = await this.getQuotaStatus();
    
    if (quota.hasPremium) {
      return 0; // No limit for premium users
    }
    
    return quota.downloadsUsed / quota.quotaLimit;
  }

  /**
   * Format quota status for display
   */
  async getQuotaDisplay(): Promise<{
    title: string;
    subtitle: string;
    progress: number;
    isPremium: boolean;
    canDownload: boolean;
  }> {
    const quota = await this.getQuotaStatus();
    
    if (quota.hasPremium) {
      return {
        title: 'Premium Active',
        subtitle: 'Unlimited downloads',
        progress: 0,
        isPremium: true,
        canDownload: true
      };
    }
    
    const progress = quota.downloadsUsed / quota.quotaLimit;
    
    return {
      title: `${quota.downloadsUsed}/${quota.quotaLimit} Downloads Used`,
      subtitle: quota.canDownload 
        ? `${quota.downloadsRemaining} remaining this month`
        : 'Limit reached - upgrade for unlimited',
      progress,
      isPremium: false,
      canDownload: quota.canDownload
    };
  }

  /**
   * Refresh quota status (useful after premium activation)
   */
  async refreshQuota(): Promise<DownloadQuota> {
    // The database functions automatically check for premium status
    // so we just need to fetch the latest status
    return this.getQuotaStatus();
  }
}

export const quotaService = new QuotaService();