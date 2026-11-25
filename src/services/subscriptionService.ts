import { supabase } from '@/integrations/supabase/client';
import {
  LocalSubscription,
  isSubscriptionActive,
  hasPaidPremiumAccess,
  applyPremiumGrant,
  hasSubjectAccess,
  getUnlockedSubjects,
  PremiumAccessType
} from '@/types/subscription';
import { getDeviceId } from '@/lib/device-id';
import { PREMIUM_DEV_BYPASS } from '@/config/premium';
import type { CodeSource } from '@/lib/subscription-profile';
import { quotaEvents } from '@/lib/quotaEvents';

const SUBSCRIPTION_KEY = 'scoretarget_subscription';

export function clearLocalSubscription(): void {
  try {
    localStorage.removeItem(SUBSCRIPTION_KEY);
  } catch {
    /* ignore */
  }
}

class SubscriptionService {
  private subscription: LocalSubscription | null = null;
  private deviceId: string | null = null;
  private lastInitializedUserId: string | null = null;

  /**
   * Initialize subscription on app launch (server sync per account + optional cloud merge)
   */
  async initialize(userId?: string | null): Promise<void> {
    try {
      this.deviceId = await getDeviceId();

      // Only reset local premium when switching between two real accounts.
      // Missing userId (offline / session not restored) must not wipe the device.
      if (userId && this.lastInitializedUserId && userId !== this.lastInitializedUserId) {
        await this.saveSubscription(this.createFreeSubscription());
      }
      if (userId) {
        this.lastInitializedUserId = userId;
      }

      this.subscription = await this.loadSubscription();

      if (userId) {
        await this.syncPremiumFromServer(userId);
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

  /** Server authority: account premium + max 2 devices, preserves expiry */
  private async syncPremiumFromServer(userId: string): Promise<void> {
    try {
      const deviceId = await getDeviceId();
      const { data, error } = await supabase.rpc('sync_premium_device', {
        p_device_id: deviceId,
      });

      if (error) {
        console.warn('sync_premium_device failed:', error.message);
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;
      const sub = this.subscription ?? this.createFreeSubscription();
      sub.ownerUserId = userId;
      sub.deviceId = deviceId;

      if (row?.has_premium && row.expires_at) {
        const granted = applyPremiumGrant(sub, {
          expiresAt: row.expires_at,
          userId,
          deviceId,
        });
        // Sold codes are full premium. Do not keep a one-subject pack
        // that an older screen wrote when the popup passed a subject name.
        granted.accessType = 'all_subjects';
        await this.saveSubscription(granted);
        return;
      }

      // Never wipe a paid grant that is still in date. Sync can lag or report
      // "2 devices" right after a successful redeem on this phone.
      if (hasPaidPremiumAccess(sub)) {
        await this.saveSubscription(sub);
        return;
      }

      sub.tier = 'free';
      sub.status = 'active';
      sub.expiresAt = undefined;
      sub.subscriptionCode = undefined;
      sub.accessType = undefined;
      sub.unlockedSubjects = [];

      await this.saveSubscription(sub);
    } catch (err) {
      console.warn('Premium server sync failed:', err);
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
        local.ownerUserId = userId;
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
      const active = hasPaidPremiumAccess(sub);

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

  private async loadSubscription(): Promise<LocalSubscription> {
    try {
      const stored = localStorage.getItem(SUBSCRIPTION_KEY);

      if (stored) {
        return JSON.parse(stored);
      }

      return this.createFreeSubscription();
    } catch (error) {
      console.error('Failed to load subscription:', error);
      return this.createFreeSubscription();
    }
  }

  private createFreeSubscription(): LocalSubscription {
    const now = new Date().toISOString();

    return {
      deviceId: this.deviceId ?? '',
      tier: 'free',
      status: 'active',
      unlockedSubjects: [],
      createdAt: now,
      updatedAt: now
    };
  }

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

  async getSubscription(): Promise<LocalSubscription> {
    if (!this.subscription) {
      await this.initialize();
    }
    return this.subscription!;
  }

  async hasSubjectAccess(subjectName: string): Promise<boolean> {
    if (PREMIUM_DEV_BYPASS) {
      return true;
    }

    const subscription = await this.getSubscription();
    return hasSubjectAccess(subscription, subjectName);
  }

  async getUnlockedSubjects(): Promise<string[]> {
    const subscription = await this.getSubscription();
    return getUnlockedSubjects(subscription);
  }

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
      if (!options?.userId) {
        throw new Error('Please sign in to activate premium on your account');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || session.user.is_anonymous) {
        throw new Error('Please sign in to activate premium on your account');
      }

      const deviceId = await getDeviceId();
      const normalizedCode = code.toUpperCase().trim();

      const { data, error } = await supabase.rpc('use_subscription_code', {
        p_code: normalizedCode,
        p_device_id: deviceId,
        p_user_id: options.userId,
        p_grading_system: options.gradingSystem ?? null,
        p_school: options.school ?? null,
        p_code_source: options.codeSource ?? null,
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
        const msg = row?.message || 'Invalid code';
        if (/already used/i.test(msg)) {
          await this.syncPremiumFromServer(options.userId);
          const restored = this.subscription ?? await this.loadSubscription();
          if (hasPaidPremiumAccess(restored) && restored.expiresAt) {
            quotaEvents.emit();
            await this.syncToCloud(options.userId);
            const remainingMs = new Date(restored.expiresAt).getTime() - Date.now();
            return {
              durationMonths: Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60 * 24 * 30))),
              expiresAt: restored.expiresAt,
            };
          }
        }
        throw new Error(msg);
      }

      if (!row.expires_at) {
        throw new Error('Premium activated but expiry is missing. Please reopen the app.');
      }

      // Apply the paid grant immediately. Do not wait on a second RPC that can
      // still report "free" and would otherwise ask for another code.
      let subscription = this.subscription ?? await this.loadSubscription();
      subscription = applyPremiumGrant(subscription, {
        expiresAt: row.expires_at,
        userId: options.userId,
        deviceId,
        code: normalizedCode,
      });
      subscription.activatedAt = new Date().toISOString();
      subscription.accessType = 'all_subjects';

      await this.saveSubscription(subscription);
      await this.syncPremiumFromServer(options.userId);
      await this.syncToCloud(options.userId);
      quotaEvents.emit();

      const confirmed = await this.getSubscription();
      if (!hasPaidPremiumAccess(confirmed)) {
        await this.saveSubscription(applyPremiumGrant(confirmed, {
          expiresAt: row.expires_at,
          userId: options.userId,
          deviceId,
          code: normalizedCode,
        }));
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

  async checkMonthlyReset(): Promise<void> {
    return;
  }

  async checkExpiration(): Promise<boolean> {
    const subscription = await this.getSubscription();

    if (hasPaidPremiumAccess(subscription)) {
      if (subscription.status !== 'active') {
        subscription.status = 'active';
        subscription.tier = 'premium';
        await this.saveSubscription(subscription);
      }
      return false;
    }

    if (subscription.tier !== 'premium') {
      return false;
    }

    subscription.tier = 'free';
    subscription.status = 'expired';
    subscription.unlockedSubjects = [];
    subscription.accessType = undefined;

    await this.saveSubscription(subscription);
    return true;
  }

  async getStatus(): Promise<{
    tier: string;
    accessType?: PremiumAccessType;
    unlockedSubjects: string[];
    expires?: string;
    daysRemaining?: number;
    hasPremiumAccess: boolean;
  }> {
    const subscription = await this.getSubscription();

    if (PREMIUM_DEV_BYPASS) {
      return {
        tier: 'premium',
        accessType: 'all_subjects',
        unlockedSubjects: [],
        hasPremiumAccess: true,
      };
    }

    if (hasPaidPremiumAccess(subscription)) {
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
      hasPremiumAccess: hasPaidPremiumAccess(subscription)
    };
  }
}

export const subscriptionService = new SubscriptionService();
