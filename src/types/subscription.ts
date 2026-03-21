// Subscription types for the exam library

export type SubscriptionTier = 'free' | 'premium';
export type SubscriptionStatus = 'active' | 'expired';

export interface LocalSubscription {
  deviceId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  downloadsThisMonth: number;
  maxDownloads: number; // 5 for free, -1 for unlimited
  subscriptionCode?: string;
  activatedAt?: string; // ISO date
  expiresAt?: string; // ISO date
  lastResetDate: string; // ISO date of last monthly reset
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionCode {
  id: string;
  code: string;
  duration_months: number;
  is_used: boolean;
  used_by?: string;
  used_at?: string;
  created_at: string;
  created_by: string;
}

export interface SubscriptionAnalytics {
  id: string;
  total_codes_generated: number;
  total_codes_used: number;
  active_premium_users: number;
  codes_by_duration: Record<string, number>;
  last_updated: string;
}

export interface SubscriptionLimits {
  free: {
    downloadsPerMonth: number;
  };
  premium: {
    downloadsPerMonth: number; // -1 for unlimited
  };
}

// Default limits
export const DEFAULT_SUBSCRIPTION_LIMITS: SubscriptionLimits = {
  free: {
    downloadsPerMonth: 5
  },
  premium: {
    downloadsPerMonth: -1 // Unlimited
  }
};

// Helper to check if subscription is active
export function isSubscriptionActive(subscription: LocalSubscription): boolean {
  if (subscription.status !== 'active') return false;
  
  if (subscription.tier === 'premium' && subscription.expiresAt) {
    return new Date(subscription.expiresAt) > new Date();
  }
  
  return true;
}

// Helper to check if user can download
export function canUserDownload(subscription: LocalSubscription): boolean {
  if (!isSubscriptionActive(subscription)) return false;
  
  // Premium with unlimited downloads
  if (subscription.tier === 'premium' && subscription.maxDownloads === -1) {
    return true;
  }
  
  // Check download limit
  return subscription.downloadsThisMonth < subscription.maxDownloads;
}

// Helper to get remaining downloads
export function getRemainingDownloads(subscription: LocalSubscription): number {
  if (subscription.tier === 'premium' && subscription.maxDownloads === -1) {
    return -1; // Unlimited
  }
  
  return Math.max(0, subscription.maxDownloads - subscription.downloadsThisMonth);
}

// Helper to format downloads display
export function formatDownloadsDisplay(subscription: LocalSubscription): string {
  if (subscription.tier === 'premium' && subscription.maxDownloads === -1) {
    return 'Unlimited';
  }
  
  return `${subscription.downloadsThisMonth}/${subscription.maxDownloads}`;
}
