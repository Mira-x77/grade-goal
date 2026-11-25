import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Public client for read operations and auth
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

let adminClient: SupabaseClient | null = null;

/** Service-role client for admin reads/writes (bypasses RLS). Lazy — app still loads if key is missing. */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      'VITE_SUPABASE_SERVICE_ROLE_KEY is missing. Add it to exam-library-admin/.env (Supabase → Settings → API → service_role).'
    );
  }
  if (!adminClient) {
    adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  }
  return adminClient;
}

export function hasServiceRoleKey(): boolean {
  return Boolean(supabaseServiceRoleKey);
}

/** @deprecated Prefer getSupabaseAdmin() — kept for modules that already import supabaseAdmin */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(getSupabaseAdmin(), prop);
  },
});
