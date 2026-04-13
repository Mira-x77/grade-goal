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
import { PREMIUM_ENABLED } from '@/config/premium';

const SUBSCRIPTION_KEY = 'scoretarget_subscription';

class SubscriptionService {
  private subscription: LocalSubscription | null = null;
  private deviceId: string | null = null;

  /**
   * Initialize subscription on app launch
   */
  async initialize(): Promise<void> {
    try {
      // Get device ID
      this.deviceId = await getDeviceId();
      
      // Load subscription
      this.subscription = await this.loadSubscription();
      
      // Check for monthly reset
      await this.checkMonthlyReset();
      
      // Check for expiration
      await this.checkExpiration();
      
      console.log('Subscription initialized:', this.subscription);
    } catch (error) {
      console.error('Failed to initialize subscription:', error);
      throw error;
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
  async activatePremiumCode(code: string, subjectName?: string): Promise<void> {
    try {
      const deviceId = await getDeviceId();
      
      // Call Supabase function to validate and use code
      const { data, error } = await supabase.rpc('use_subscription_code', {
        p_code: code.toUpperCase(),
        p_device_id: deviceId
      });

      if (error) {
        console.error('Code validation error:', error);
        throw new Error('Failed to validate code. Please try again.');
      }

      const result = data; // Supabase RPC returns the JSONB directly

      if (!result || !result.success) {
        throw new Error(result?.message || 'Invalid code');
      }

      // Update local subscription
      const subscription = await this.getSubscription();
      const now = new Date().toISOString();

      subscription.status = 'active';
      subscription.tier = 'premium';
      subscription.subscriptionCode = code.toUpperCase();
      subscription.activatedAt = now;
      subscription.expiresAt = result.expires_at;

      // Handle different product types
      if (result.product_type === 'all_subjects' || result.product_type === 'full_access') {
        subscription.accessType = 'all_subjects';
        subscription.unlockedSubjects = []; // Empty array means all subjects
      } else if (result.product_type === 'subject_pack') {
        subscription.accessType = 'subject_pack';
        const subject = result.metadata?.subjectName || subjectName;
        if (subject) {
          // Add subject if not already unlocked
          if (!subscription.unlockedSubjects.some(s => s.subjectName === subject)) {
            subscription.unlockedSubjects.push({
              subjectName: subject,
              unlockedAt: now,
              accessType: 'subject_pack'
            });
          }
        }
      }

      await this.saveSubscription(subscription);

      console.log('Product activated successfully:', result.product_type);
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
      
      console.log('Premium subscription expired');
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
    // Premium disabled for this release — always return free
    if (!PREMIUM_ENABLED) {
      return {
        tier: 'free',
        unlockedSubjects: [],
        hasPremiumAccess: false,
      };
    }

    const subscription = await this.getSubscription();

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
