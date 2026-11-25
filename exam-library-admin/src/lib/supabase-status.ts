import { useEffect, useState } from 'react';
import { getSupabaseAdmin, hasServiceRoleKey } from './supabaseClient';

/**
 * Whether the Supabase project can serve database requests.
 *
 * The free project is currently restricted (HTTP 402
 * `exceed_storage_size_quota`), so every table read fails while Storage and the
 * public HTTP API stay partially reachable. The admin probes once per session
 * and shows this state instead of pretending the library is empty.
 */
export type SupabaseStatus = 'checking' | 'ok' | 'restricted' | 'unavailable';

let cached: SupabaseStatus | null = null;
let inflight: Promise<SupabaseStatus> | null = null;

export const SUPABASE_RESTRICTED_MESSAGE =
  'Supabase is restricted (402 exceed_storage_size_quota), so database-backed features ' +
  '(students, subscription codes, feeds, app-usage analytics) are unavailable. ' +
  'Library content is read from the R2 catalogue instead.';

export function checkSupabaseStatus(force = false): Promise<SupabaseStatus> {
  if (force) {
    cached = null;
    inflight = null;
  }
  if (cached) return Promise.resolve(cached);
  if (!inflight) inflight = probe();
  return inflight;
}

async function probe(): Promise<SupabaseStatus> {
  if (!hasServiceRoleKey()) {
    cached = 'unavailable';
    return cached;
  }
  try {
    const { error, status } = await getSupabaseAdmin()
      .from('exam_papers')
      .select('id', { head: true, count: 'exact' })
      .limit(1);

    if (!error) {
      cached = 'ok';
    } else if (status === 402 || /exceed_storage_size_quota/i.test(error.message)) {
      cached = 'restricted';
    } else {
      cached = 'unavailable';
    }
  } catch {
    cached = 'unavailable';
  }
  return cached;
}

export function useSupabaseStatus(): SupabaseStatus {
  const [status, setStatus] = useState<SupabaseStatus>(cached ?? 'checking');

  useEffect(() => {
    let mounted = true;
    checkSupabaseStatus().then((value) => {
      if (mounted) setStatus(value);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return status;
}
