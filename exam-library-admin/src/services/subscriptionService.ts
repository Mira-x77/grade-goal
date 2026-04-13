import { supabase } from '../lib/supabaseClient';

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

export interface CodeStats {
  total: number;
  unused: number;
  used: number;
  byDuration: Record<string, { total: number; used: number; unused: number }>;
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
  async getCodeStats(): Promise<CodeStats> {
    const codes = await this.getAllCodes();
    
    const stats: CodeStats = {
      total: codes.length,
      unused: codes.filter(c => !c.is_used).length,
      used: codes.filter(c => c.is_used).length,
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
