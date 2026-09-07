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

// Helper to check if subscription is active
export function isSubscriptionActive(subscription: LocalSubscription): boolean {
  if (subscription.status !== 'active') return false;
  
  if (subscription.tier === 'premium' && subscription.expiresAt) {
    return new Date(subscription.expiresAt) > new Date();
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
