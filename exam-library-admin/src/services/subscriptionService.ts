import { supabase } from '../lib/supabaseClient';
import { isCodePremiumActive, userProfileService } from './userProfileService';

export interface SubscriptionCode {
  id: string;
  code: string;
  duration_months: number;
  is_used: boolean;
  used_by?: string;
  used_at?: string;
  redeemed_by?: string;
  grading_system?: string;
  school?: string;
  code_source?: string;
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

export interface CodeStats {
  total: number;
  unused: number;
  used: number;
  activePremium: number;
  byDuration: Record<string, { total: number; used: number; unused: number }>;
}

export interface EnrichedSubscriptionCode extends SubscriptionCode {
  studentName?: string;
  authMethod?: string;
  isGuest?: boolean;
  deviceCount?: number;
  expiresAt?: string;
  isActivePremium?: boolean;
}

export interface UserPremiumStatus {
  isActive: boolean;
  expiresAt?: string;
  code?: string;
  deviceCount?: number;
}

class SubscriptionService {
  /**
   * Get all subscription codes
   */
  async getAllCodes(): Promise<SubscriptionCode[]> {
    const { data, error } = await supabase
      .from('subscription_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch codes:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get codes by status
   */
  async getCodesByStatus(isUsed: boolean): Promise<SubscriptionCode[]> {
    const { data, error } = await supabase
      .from('subscription_codes')
      .select('*')
      .eq('is_used', isUsed)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch codes:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Search codes
   */
  async searchCodes(query: string): Promise<SubscriptionCode[]> {
    const { data, error } = await supabase
      .from('subscription_codes')
      .select('*')
      .ilike('code', `%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to search codes:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get subscription analytics
   */
  async getAnalytics(): Promise<SubscriptionAnalytics | null> {
    const { data, error } = await supabase
      .from('subscription_analytics')
      .select('*')
      .eq('id', 'main')
      .single();

    if (error) {
      console.error('Failed to fetch analytics:', error);
      return null;
    }

    return data;
  }

  /**
   * Get code statistics
   */
  /** Active premium per account (same logic as student app / migration 019) */
  async getActivePremiumByUserIds(userIds: string[]): Promise<Map<string, UserPremiumStatus>> {
    const map = new Map<string, UserPremiumStatus>();
    if (userIds.length === 0) return map;

    const { data, error } = await supabase
      .from('subscription_codes')
      .select('id, code, redeemed_by, used_at, duration_months, is_used')
      .in('redeemed_by', userIds)
      .eq('is_used', true)
      .order('used_at', { ascending: false });

    if (error) throw error;

    const activeCodeIds: string[] = [];
    for (const row of data ?? []) {
      if (!row.redeemed_by || map.has(row.redeemed_by)) continue;
      const active = isCodePremiumActive(row.used_at, row.duration_months);
      const expiresAt =
        row.used_at && row.duration_months
          ? new Date(new Date(row.used_at).setMonth(new Date(row.used_at).getMonth() + row.duration_months)).toISOString()
          : undefined;
      map.set(row.redeemed_by, {
        isActive: active,
        expiresAt,
        code: row.code,
      });
      if (active) activeCodeIds.push(row.id);
    }

    if (activeCodeIds.length > 0) {
      const devicesByCode = await userProfileService.getDeviceRegistrationsByCodeIds(activeCodeIds);
      for (const [, status] of map) {
        if (!status.isActive || !status.code) continue;
        const codeRow = (data ?? []).find((r) => r.code === status.code);
        if (!codeRow) continue;
        const devices = (devicesByCode.get(codeRow.id) ?? []).filter((d) => new Date(d.expires_at) > new Date());
        status.deviceCount = devices.length;
      }
    }

    return map;
  }

  /** Codes enriched with student profile + device slot info (synced with student app) */
  async getEnrichedCodes(filter?: 'all' | 'unused' | 'used'): Promise<EnrichedSubscriptionCode[]> {
    let codes: SubscriptionCode[];
    if (filter === 'unused') codes = await this.getCodesByStatus(false);
    else if (filter === 'used') codes = await this.getCodesByStatus(true);
    else codes = await this.getAllCodes();

    const userIds = [...new Set(codes.map((c) => c.redeemed_by).filter(Boolean))] as string[];
    const codeIds = codes.map((c) => c.id);

    const [profiles, devicesByCode] = await Promise.all([
      userProfileService.getProfilesByUserIds(userIds),
      userProfileService.getDeviceRegistrationsByCodeIds(codeIds),
    ]);

    return codes.map((code) => {
      const profile = code.redeemed_by ? profiles.get(code.redeemed_by) : undefined;
      const devices = devicesByCode.get(code.id) ?? [];
      const activeDevices = devices.filter((d) => new Date(d.expires_at) > new Date());
      const isActive = isCodePremiumActive(code.used_at, code.duration_months);
      const expiresAt =
        code.used_at && code.duration_months
          ? new Date(new Date(code.used_at).setMonth(new Date(code.used_at).getMonth() + code.duration_months)).toISOString()
          : undefined;

      return {
        ...code,
        studentName: profile?.student_name ?? undefined,
        authMethod: typeof profile?.metadata?.auth_method === 'string' ? profile.metadata.auth_method : undefined,
        isGuest: profile?.metadata?.is_guest === true,
        deviceCount: activeDevices.length,
        expiresAt,
        isActivePremium: isActive,
      };
    });
  }

  async getCodeStats(): Promise<CodeStats> {
    const codes = await this.getAllCodes();

    const stats: CodeStats = {
      total: codes.length,
      unused: codes.filter(c => !c.is_used).length,
      used: codes.filter(c => c.is_used).length,
      activePremium: codes.filter(c => isCodePremiumActive(c.used_at, c.duration_months)).length,
      byDuration: {}
    };

    // Group by duration
    codes.forEach(code => {
      const duration = code.duration_months.toString();
      if (!stats.byDuration[duration]) {
        stats.byDuration[duration] = { total: 0, used: 0, unused: 0 };
      }
      stats.byDuration[duration].total++;
      if (code.is_used) {
        stats.byDuration[duration].used++;
      } else {
        stats.byDuration[duration].unused++;
      }
    });

    return stats;
  }

  /**
   * Get recent activations
   */
  async getRecentActivations(limit: number = 10): Promise<SubscriptionCode[]> {
    const { data, error } = await supabase
      .from('subscription_codes')
      .select('*')
      .eq('is_used', true)
      .order('used_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch recent activations:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Delete a code (admin only, use with caution)
   */
  async deleteCode(codeId: string): Promise<void> {
    const { error } = await supabase
      .from('subscription_codes')
      .delete()
      .eq('id', codeId);

    if (error) {
      console.error('Failed to delete code:', error);
      throw error;
    }
  }

  /**
   * Batch generate codes (for printable sheets)
   */
  async batchGenerateCodes(codes: string[], durationMonths: number): Promise<void> {
    const createdBy = 'admin'; // You can get this from auth context if needed
    
    const codeRecords = codes.map(code => ({
      code,
      duration_months: durationMonths,
      is_used: false,
      created_by: createdBy,
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('subscription_codes')
      .insert(codeRecords);

    if (error) {
      console.error('Failed to batch generate codes:', error);
      throw error;
    }

    // Update analytics
    try {
      await supabase.rpc('update_code_generation_analytics', {
        p_count: codes.length,
        p_duration: durationMonths
      });
    } catch (analyticsError) {
      console.warn('Failed to update analytics:', analyticsError);
      // Don't throw - codes were created successfully
    }
  }
}

export const subscriptionService = new SubscriptionService();
