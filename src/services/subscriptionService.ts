import { createClient } from '@supabase/supabase-js';
import {
  LocalSubscription,
  DEFAULT_SUBSCRIPTION_LIMITS,
  isSubscriptionActive,
  canUserDownload,
  getRemainingDownloads,
  formatDownloadsDisplay
} from '@/types/subscription';
import { getDeviceId } from '@/lib/device-id';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';
const supabase = createClient(supabaseUrl, supabaseKey);

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
      downloadsThisMonth: 0,
      maxDownloads: DEFAULT_SUBSCRIPTION_LIMITS.free.downloadsPerMonth,
      lastResetDate: now,
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
   * Check if user can download
   */
  async canDownload(): Promise<{
    allowed: boolean;
    reason?: string;
    remaining: number;
  }> {
    const subscription = await this.getSubscription();

    if (!isSubscriptionActive(subscription)) {
      return {
        allowed: false,
        reason: 'expired',
        remaining: 0
      };
    }

    const remaining = getRemainingDownloads(subscription);

    if (!canUserDownload(subscription)) {
      return {
        allowed: false,
        reason: 'limit_reached',
        remaining: 0
      };
    }

    return {
      allowed: true,
      remaining
    };
  }

  /**
   * Increment download count
   */
  async incrementDownload(): Promise<void> {
    const subscription = await this.getSubscription();
    subscription.downloadsThisMonth += 1;
    await this.saveSubscription(subscription);
  }


  /**
   * Activate premium with code
   */
  async activatePremiumCode(code: string): Promise<void> {
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
      subscription.subscriptionCode = code.toUpperCase();
      subscription.activatedAt = now;
      subscription.expiresAt = result.expires_at;

      if (result.product_type === 'premium_subscription' || result.product_type === 'full_access' || !result.product_type) {
        subscription.tier = 'premium';
        subscription.maxDownloads = -1;
      }

      await this.saveSubscription(subscription);

      console.log('Product activated successfully:', result.product_type);
    } catch (error) {
      console.error('Failed to activate product:', error);
      throw error;
    }
  }

  /**
   * Check and reset monthly downloads
   */
  async checkMonthlyReset(): Promise<void> {
    const subscription = await this.getSubscription();
    const lastReset = new Date(subscription.lastResetDate);
    const now = new Date();

    // Check if month changed
    const needsReset = 
      lastReset.getMonth() !== now.getMonth() ||
      lastReset.getFullYear() !== now.getFullYear();

    if (needsReset) {
      subscription.downloadsThisMonth = 0;
      subscription.lastResetDate = now.toISOString();
      await this.saveSubscription(subscription);
      console.log('Monthly downloads reset');
    }
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
      // Downgrade to free
      subscription.tier = 'free';
      subscription.status = 'expired';
      subscription.maxDownloads = DEFAULT_SUBSCRIPTION_LIMITS.free.downloadsPerMonth;
      subscription.downloadsThisMonth = 0;
      
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
    downloads: string;
    expires?: string;
    daysRemaining?: number;
    isUnlimited: boolean;
  }> {
    const subscription = await this.getSubscription();
    const isUnlimited = subscription.tier === 'premium' && subscription.maxDownloads === -1;

    let daysRemaining: number | undefined;
    if (subscription.expiresAt) {
      const now = new Date();
      const expires = new Date(subscription.expiresAt);
      daysRemaining = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      tier: subscription.tier,
      downloads: formatDownloadsDisplay(subscription),
      expires: subscription.expiresAt,
      daysRemaining,
      isUnlimited
    };
  }

  /**
   * Get remaining downloads
   */
  async getRemainingDownloads(): Promise<number> {
    const subscription = await this.getSubscription();
    return getRemainingDownloads(subscription);
  }
}

export const subscriptionService = new SubscriptionService();
