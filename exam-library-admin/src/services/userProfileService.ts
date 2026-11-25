import { getSupabaseAdmin, hasServiceRoleKey } from '../lib/supabaseClient';

export interface AdminUserProfile {
  user_id: string;
  student_name: string | null;
  academic_system: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PremiumDeviceRegistration {
  id: string;
  user_id: string;
  subscription_code_id: string;
  device_id: string;
  expires_at: string;
  registered_at: string;
}

function codeExpiresAt(usedAt: string, durationMonths: number): Date {
  const d = new Date(usedAt);
  d.setMonth(d.getMonth() + durationMonths);
  return d;
}

export function isCodePremiumActive(usedAt?: string, durationMonths?: number): boolean {
  if (!usedAt || !durationMonths) return false;
  return codeExpiresAt(usedAt, durationMonths) > new Date();
}

class UserProfileService {
  async getAllProfiles(limit = 500): Promise<AdminUserProfile[]> {
    if (!hasServiceRoleKey()) return [];
    const { data, error } = await getSupabaseAdmin()
      .from('user_profile')
      .select('user_id, student_name, academic_system, metadata, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map((row) => ({
      ...row,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    }));
  }

  async getProfilesByUserIds(userIds: string[]): Promise<Map<string, AdminUserProfile>> {
    const map = new Map<string, AdminUserProfile>();
    if (userIds.length === 0) return map;

    if (!hasServiceRoleKey()) return map;
    const { data, error } = await getSupabaseAdmin()
      .from('user_profile')
      .select('user_id, student_name, academic_system, metadata, created_at, updated_at')
      .in('user_id', userIds);

    if (error) throw error;
    for (const row of data ?? []) {
      map.set(row.user_id, {
        ...row,
        metadata: (row.metadata as Record<string, unknown>) ?? {},
      });
    }
    return map;
  }

  async getDeviceRegistrationsByCodeIds(codeIds: string[]): Promise<Map<string, PremiumDeviceRegistration[]>> {
    const map = new Map<string, PremiumDeviceRegistration[]>();
    if (codeIds.length === 0) return map;

    if (!hasServiceRoleKey()) return map;
    const { data, error } = await getSupabaseAdmin()
      .from('premium_device_registrations')
      .select('*')
      .in('subscription_code_id', codeIds);

    if (error) {
      // Table may not exist until migration 019 is applied
      if (error.message?.includes('does not exist')) return map;
      throw error;
    }

    for (const row of data ?? []) {
      const list = map.get(row.subscription_code_id) ?? [];
      list.push(row as PremiumDeviceRegistration);
      map.set(row.subscription_code_id, list);
    }
    return map;
  }
}

export const userProfileService = new UserProfileService();
