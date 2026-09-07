import { supabase } from '@/integrations/supabase/client';
import {
  LocalSubscription,
  isSubscriptionActive,
  hasSubjectAccess,
  getUnlockedSubjects,
  UnlockedSubject,
  PremiumAccessType
} from '@/types/subscription';
import { getDeviceId } from '@/lib/device-id';
import { PREMIUM_DEV_BYPASS } from '@/config/premium';
import type { CodeSource } from '@/lib/subscription-profile';

const SUBSCRIPTION_KEY = 'scoretarget_subscription';

class SubscriptionService {
  private subscription: LocalSubscription | null = null;
  private deviceId: string | null = null;

  /**
   * Initialize subscription on app launch (local + optional cloud merge)
   */
  async initialize(userId?: string | null): Promise<void> {
    try {
      this.deviceId = await getDeviceId();
      this.subscription = await this.loadSubscription();

      if (userId) {
        await this.syncFromCloud(userId);
      }

      await this.checkMonthlyReset();
      await this.checkExpiration();

      if (userId && this.subscription) {
        await this.syncToCloud(userId);
      }
    } catch (error) {
      console.error('Failed to initialize subscription:', error);
      throw error;
    }
  }

  private async syncFromCloud(userId: string): Promise<void> {
    try {
      const { data } = await supabase
        .from('user_profile')
        .select('metadata')
        .eq('user_id', userId)
        .maybeSingle();

      const meta = (data?.metadata as Record<string, unknown>) ?? null;
      if (!meta || meta.premiumTier !== 'premium') return;

      const expiresAt = typeof meta.premiumExpiresAt === 'string' ? meta.premiumExpiresAt : undefined;
      if (!expiresAt || new Date(expiresAt) <= new Date()) return;

      const local = this.subscription ?? this.createFreeSubscription();
      const localExpires = local.expiresAt ? new Date(local.expiresAt) : null;
      const localActive = local.tier === 'premium' && isSubscriptionActive(local);

      if (!localActive || !localExpires || localExpires < new Date(expiresAt)) {
        local.tier = 'premium';
        local.status = 'active';
        local.expiresAt = expiresAt;
        local.activatedAt = typeof meta.premiumActivatedAt === 'string' ? meta.premiumActivatedAt : local.activatedAt;
        local.subscriptionCode = typeof meta.premiumSubscriptionCode === 'string' ? meta.premiumSubscriptionCode : local.subscriptionCode;
        local.accessType = 'all_subjects';
        local.unlockedSubjects = [];
        await this.saveSubscription(local);
      }
    } catch (err) {
      console.warn('Premium cloud sync (pull) failed:', err);
    }
  }

  private async syncToCloud(userId: string): Promise<void> {
    try {
      const sub = this.subscription ?? await this.loadSubscription();
      const active = sub.tier === 'premium' && isSubscriptionActive(sub);

      const { data: existing } = await supabase
        .from('user_profile')
        .select('metadata, academic_system, student_name')
        .eq('user_id', userId)
        .maybeSingle();

      const prevMeta = (existing?.metadata as Record<string, unknown>) ?? {};
      await supabase.from('user_profile').upsert({
        user_id: userId,
        metadata: {
          ...prevMeta,
          premiumTier: active ? 'premium' : 'free',
          premiumExpiresAt: sub.expiresAt ?? null,
          premiumActivatedAt: sub.activatedAt ?? null,
          premiumSubscriptionCode: sub.subscriptionCode ?? null,
        },
        academic_system: existing?.academic_system ?? 'APC',
        student_name: existing?.student_name ?? null,
      }, { onConflict: 'user_id' });
    } catch (err) {
      console.warn('Premium cloud sync (push) failed:', err);
    }
  }

  /**
   * Load subscription from localStorage or create new
   */
  private async loadSubscription(): Promise<LocalSubscription> {
    try {
      const stored = localStorage.getItem(SUBSCRIPTION_KEY);
      
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Create new free subscription
      return this.createFreeSubscription();
    } catch (error) {
      console.error('Failed to load subscription:', error);
      return this.createFreeSubscription();
    }
  }

  /**
   * Create a new free subscription
   */
  private createFreeSubscription(): LocalSubscription {
    const now = new Date().toISOString();
    
    return {
      deviceId: this.deviceId!,
      tier: 'free',
      status: 'active',
      unlockedSubjects: [],
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Save subscription to localStorage
   */
  private async saveSubscription(subscription: LocalSubscription): Promise<void> {
    try {
      subscription.updatedAt = new Date().toISOString();
      localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
      this.subscription = subscription;
    } catch (error) {
      console.error('Failed to save subscription:', error);
      throw error;
    }
  }

  /**
   * Get current subscription
   */
  async getSubscription(): Promise<LocalSubscription> {
    if (!this.subscription) {
      await this.initialize();
    }
    return this.subscription!;
  }

  /**
   * Check if user has access to a specific subject's premium features
   */
  async hasSubjectAccess(subjectName: string): Promise<boolean> {
    // Check if premium is globally enabled (bypass all checks)
    if (PREMIUM_DEV_BYPASS) {
      return true;
    }
    
    const subscription = await this.getSubscription();
    return hasSubjectAccess(subscription, subjectName);
  }

  /**
   * Get list of unlocked subjects
   */
  async getUnlockedSubjects(): Promise<string[]> {
    const subscription = await this.getSubscription();
    return getUnlockedSubjects(subscription);
  }


  /**
   * Activate premium with code
   */
  async activatePremiumCode(
    code: string,
    options?: {
      subjectName?: string;
      userId?: string | null;
      gradingSystem?: string;
      school?: string | null;
      codeSource?: CodeSource | null;
    }
  ): Promise<{ durationMonths: number; expiresAt: string }> {
    try {
      const deviceId = await getDeviceId();
      const normalizedCode = code.toUpperCase().trim();

      const { data, error } = await supabase.rpc('use_subscription_code', {
        p_code: normalizedCode,
        p_device_id: deviceId,
        p_user_id: options?.userId ?? null,
        p_grading_system: options?.gradingSystem ?? null,
        p_school: options?.school ?? null,
        p_code_source: options?.codeSource ?? null,
      });

      if (error) {
        console.error('Code validation error:', error);
        const msg =
          (error as { message?: string }).message ||
          (error as { details?: string }).details ||
          'Failed to validate code. Please try again.';
        throw new Error(msg.includes('function') ? 'Subscription service unavailable. Try again later.' : msg);
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.success) {
        throw new Error(row?.message || 'Invalid code');
      }

      const subscription = await this.getSubscription();
      const now = new Date().toISOString();

      subscription.status = 'active';
      subscription.tier = 'premium';
      subscription.subscriptionCode = normalizedCode;
      subscription.activatedAt = now;
      subscription.expiresAt = row.expires_at;
      subscription.accessType = 'all_subjects';
      subscription.unlockedSubjects = [];

      if (options?.subjectName) {
        subscription.accessType = 'subject_pack';
        if (!subscription.unlockedSubjects.some((s) => s.subjectName === options.subjectName)) {
          subscription.unlockedSubjects.push({
            subjectName: options.subjectName,
            unlockedAt: now,
            accessType: 'subject_pack',
          });
        }
      }

      await this.saveSubscription(subscription);

      if (options?.userId) {
        await this.syncToCloud(options.userId);
      }

      return {
        durationMonths: row.duration_months,
        expiresAt: row.expires_at,
      };
    } catch (error) {
      console.error('Failed to activate product:', error);
      throw error;
    }
  }

  /**
   * Check monthly reset (no-op for feature-gating model, kept for compatibility)
   */
  async checkMonthlyReset(): Promise<void> {
    // No monthly reset needed for feature-gating model
    // Downloads are always free, premium gates study tools
    return;
  }

  /**
   * Check and handle expiration
   */
  async checkExpiration(): Promise<boolean> {
    const subscription = await this.getSubscription();

    if (subscription.tier !== 'premium' || !subscription.expiresAt) {
      return false;
    }

    const now = new Date();
    const expires = new Date(subscription.expiresAt);

    if (expires <= now) {
      // Downgrade to free - lose access to premium study tools
      subscription.tier = 'free';
      subscription.status = 'expired';
      subscription.unlockedSubjects = [];
      subscription.accessType = undefined;
      
      await this.saveSubscription(subscription);
      return true;
    }

    return false;
  }

  /**
   * Get subscription status for display
   */
  async getStatus(): Promise<{
    tier: string;
    accessType?: PremiumAccessType;
    unlockedSubjects: string[];
    expires?: string;
    daysRemaining?: number;
    hasPremiumAccess: boolean;
  }> {
    const subscription = await this.getSubscription();

    // Check if premium is globally enabled (bypass all checks)
    if (PREMIUM_DEV_BYPASS) {
      return {
        tier: 'premium',
        accessType: 'all_subjects',
        unlockedSubjects: [],
        hasPremiumAccess: true,
      };
    }

    // Active code redemption always grants access
    if (subscription.tier === 'premium' && isSubscriptionActive(subscription)) {
      let daysRemaining: number | undefined;
      if (subscription.expiresAt) {
        const now = new Date();
        const expires = new Date(subscription.expiresAt);
        daysRemaining = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
      return {
        tier: subscription.tier,
        accessType: subscription.accessType,
        unlockedSubjects: getUnlockedSubjects(subscription),
        expires: subscription.expiresAt,
        daysRemaining,
        hasPremiumAccess: true,
      };
    }

    let daysRemaining: number | undefined;
    if (subscription.expiresAt) {
      const now = new Date();
      const expires = new Date(subscription.expiresAt);
      daysRemaining = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      tier: subscription.tier,
      accessType: subscription.accessType,
      unlockedSubjects: getUnlockedSubjects(subscription),
      expires: subscription.expiresAt,
      daysRemaining,
      hasPremiumAccess: subscription.tier === 'premium' && isSubscriptionActive(subscription)
    };
  }
}

export const subscriptionService = new SubscriptionService();
