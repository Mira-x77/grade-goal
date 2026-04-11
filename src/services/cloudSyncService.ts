/**
 * Cloud Sync Service
 * Handles all user-scoped data persistence with Supabase.
 * Local storage is used as a cache; Supabase is the source of truth.
 */

import { supabase } from '@/integrations/supabase/client';
import { AppState } from '@/types/exam';
import { HistoryEntry, StreakData } from '@/lib/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CloudUserData {
  appState: AppState | null;
  history: HistoryEntry[];
  streak: StreakData;
}

// ─── Timeout helper ───────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Supabase call timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// ─── App State ────────────────────────────────────────────────────────────────

export async function saveAppStateToCloud(userId: string, state: AppState): Promise<void> {
  const { error } = await withTimeout(supabase.rpc('upsert_user_app_state', {
    p_user_id: userId,
    p_state: state as unknown as Record<string, unknown>,
  }));
  if (error) throw error;
}

export async function loadAppStateFromCloud(userId: string): Promise<AppState | null> {
  const { data, error } = await withTimeout(supabase
    .from('user_app_state')
    .select('state_json')
    .eq('user_id', userId)
    .maybeSingle());

  if (error) throw error;
  if (!data) return null;
  return data.state_json as unknown as AppState;
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function saveHistoryEntryToCloud(
  userId: string,
  entry: HistoryEntry
): Promise<void> {
  try {
    // Use upsert instead of insert to avoid 409 conflicts
    const { error } = await withTimeout(supabase.from('user_history').upsert({
      id: entry.id,
      user_id: userId,
      subject_name: entry.subjectName,
      mark_type: entry.markType,
      value: entry.value,
      date: entry.date,
    }, {
      onConflict: 'id',
      ignoreDuplicates: false
    }));
    
    if (error) {
      // Log but don't throw - we don't want to block the app
      console.warn('Failed to save history entry:', error);
    }
  } catch (err) {
    // Catch any errors including 403 Forbidden
    console.warn('Failed to save history entry:', err);
  }
}

export async function loadHistoryFromCloud(userId: string): Promise<HistoryEntry[]> {
  const { data, error } = await withTimeout(supabase
    .from('user_history')
    .select('id, subject_name, mark_type, value, date')
    .eq('user_id', userId)
    .order('date', { ascending: true }));

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    subjectName: row.subject_name,
    markType: row.mark_type as HistoryEntry['markType'],
    value: Number(row.value),
    date: row.date,
  }));
}

// ─── Streak ───────────────────────────────────────────────────────────────────

export async function saveStreakToCloud(userId: string, streak: StreakData): Promise<void> {
  const { error } = await withTimeout(supabase.rpc('upsert_user_streak', {
    p_user_id: userId,
    p_current: streak.currentStreak,
    p_best: streak.bestStreak,
    p_total: streak.totalEntries,
    p_last_date: streak.lastEntryDate ?? null,
  }));
  if (error) throw error;
}

export async function loadStreakFromCloud(userId: string): Promise<StreakData> {
  const { data, error } = await withTimeout(supabase
    .from('user_streak')
    .select('current_streak, best_streak, total_entries, last_entry_date')
    .eq('user_id', userId)
    .maybeSingle());

  if (error) throw error;
  if (!data) return { currentStreak: 0, lastEntryDate: null, totalEntries: 0, bestStreak: 0 };

  return {
    currentStreak: data.current_streak,
    bestStreak: data.best_streak,
    totalEntries: data.total_entries,
    lastEntryDate: data.last_entry_date ?? null,
  };
}

// ─── Full Restore (on login / new device) ─────────────────────────────────────

/**
 * Fetches all user data from Supabase and hydrates localStorage.
 * Returns the full cloud data so callers can update React state.
 */
export async function restoreUserDataFromCloud(userId: string): Promise<CloudUserData> {
  const [appState, history, streak] = await Promise.all([
    loadAppStateFromCloud(userId),
    loadHistoryFromCloud(userId),
    loadStreakFromCloud(userId),
  ]);

  // Hydrate localStorage cache
  if (appState) {
    localStorage.setItem('scoretarget_state', JSON.stringify(appState));
  }
  if (history.length > 0) {
    localStorage.setItem('scoretarget_history', JSON.stringify(history));
  }
  localStorage.setItem('scoretarget_streak', JSON.stringify(streak));

  return { appState, history, streak };
}

// ─── Full Push (upload local data to cloud, e.g. after offline session) ───────

/**
 * Pushes all local data to Supabase. Used when coming back online
 * or when a user logs in with existing local data.
 */
export async function pushLocalDataToCloud(userId: string): Promise<void> {
  const rawState = localStorage.getItem('scoretarget_state');
  const rawHistory = localStorage.getItem('scoretarget_history');
  const rawStreak = localStorage.getItem('scoretarget_streak');

  const promises: Promise<void>[] = [];

  if (rawState) {
    try {
      const state = JSON.parse(rawState) as AppState;
      promises.push(saveAppStateToCloud(userId, state));
    } catch { /* ignore parse errors */ }
  }

  if (rawStreak) {
    try {
      const streak = JSON.parse(rawStreak) as StreakData;
      promises.push(saveStreakToCloud(userId, streak));
    } catch { /* ignore parse errors */ }
  }

  if (rawHistory) {
    try {
      const history = JSON.parse(rawHistory) as HistoryEntry[];
      // Push each entry individually (duplicates are ignored via 23505)
      for (const entry of history) {
        promises.push(saveHistoryEntryToCloud(userId, entry));
      }
    } catch { /* ignore parse errors */ }
  }

  await Promise.allSettled(promises);
}
