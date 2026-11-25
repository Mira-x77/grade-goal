// Subscription types for premium study tools access

export type SubscriptionTier = 'free' | 'premium';
export type SubscriptionStatus = 'active' | 'expired';

// Premium access types
export type PremiumAccessType = 'subject_pack' | 'all_subjects';

export interface UnlockedSubject {
  subjectName: string;
  unlockedAt: string; // ISO date
  accessType: PremiumAccessType;
}

export interface LocalSubscription {
  deviceId: string;
  /** Supabase user id that owns this premium (prevents cross-account bleed on shared phones) */
  ownerUserId?: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  subscriptionCode?: string;
  activatedAt?: string; // ISO date
  expiresAt?: string; // ISO date
  accessType?: PremiumAccessType; // 'subject_pack' or 'all_subjects'
  unlockedSubjects: UnlockedSubject[]; // List of subjects with premium access
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionCode {
  id: string;
  code: string;
  product_type: 'subject_pack' | 'all_subjects' | 'premium_subscription' | 'full_access';
  duration_months: number;
  is_used: boolean;
  used_by?: string;
  used_at?: string;
  created_at: string;
  created_by: string;
  metadata?: {
    subjectName?: string; // For subject_pack codes
  };
}

export interface SubscriptionAnalytics {
  id: string;
  total_codes_generated: number;
  total_codes_used: number;
  active_premium_users: number;
  codes_by_duration: Record<string, number>;
  last_updated: string;
}

export function isExpiryInFuture(expiresAt?: string, now: Date = new Date()): boolean {
  if (!expiresAt) return false;
  const expires = new Date(expiresAt);
  return !Number.isNaN(expires.getTime()) && expires > now;
}

/** Paid premium is defined by a future expiry — not by a stale `status` flag. */
export function hasPaidPremiumAccess(subscription: LocalSubscription, now: Date = new Date()): boolean {
  if (subscription.tier !== 'premium') return false;
  return isExpiryInFuture(subscription.expiresAt, now);
}

export function applyPremiumGrant(
  subscription: LocalSubscription,
  grant: {
    expiresAt: string;
    userId?: string | null;
    deviceId?: string | null;
    code?: string;
    now?: Date;
  }
): LocalSubscription {
  const now = grant.now ?? new Date();
  const previous = subscription.expiresAt ? new Date(subscription.expiresAt) : null;
  const incoming = new Date(grant.expiresAt);
  const keepPrevious =
    previous && !Number.isNaN(previous.getTime()) && previous > incoming;

  return {
    ...subscription,
    ownerUserId: grant.userId ?? subscription.ownerUserId,
    deviceId: grant.deviceId ?? subscription.deviceId,
    tier: 'premium',
    status: 'active',
    expiresAt: keepPrevious ? subscription.expiresAt : grant.expiresAt,
    activatedAt: subscription.activatedAt ?? now.toISOString(),
    subscriptionCode: grant.code ?? subscription.subscriptionCode,
    accessType: subscription.accessType ?? 'all_subjects',
    updatedAt: now.toISOString(),
  };
}

// Helper to check if subscription is active
export function isSubscriptionActive(subscription: LocalSubscription, now: Date = new Date()): boolean {
  if (hasPaidPremiumAccess(subscription, now)) return true;
  if (subscription.status !== 'active') return false;
  if (subscription.tier === 'premium') {
    return isExpiryInFuture(subscription.expiresAt, now);
  }
  return true;
}

// Helper to check if user has access to a specific subject's premium features
export function hasSubjectAccess(subscription: LocalSubscription, subjectName: string): boolean {
  if (!isSubscriptionActive(subscription)) return false;
  
  // All-subjects pass grants access to everything
  if (subscription.accessType === 'all_subjects') {
    return true;
  }
  
  // Check if specific subject is unlocked
  return subscription.unlockedSubjects.some(
    s => s.subjectName.toLowerCase() === subjectName.toLowerCase()
  );
}

// Helper to get list of unlocked subjects
export function getUnlockedSubjects(subscription: LocalSubscription): string[] {
  if (!isSubscriptionActive(subscription)) return [];
  
  // All-subjects pass means everything is unlocked
  if (subscription.accessType === 'all_subjects') {
    return ['all'];
  }
  
  return subscription.unlockedSubjects.map(s => s.subjectName);
}
