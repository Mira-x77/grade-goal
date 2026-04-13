/**
 * Hybrid Sync Service
 * Handles transition from old JSONB schema to new normalized schema
 * 
 * STRATEGY:
 * 1. Check if user has been migrated
 * 2. If migrated: use normalized schema
 * 3. If not: use old JSONB schema + auto-migrate on save
 * 
 * This allows gradual migration without breaking existing users
 */

import { AppState } from '@/types/exam';
import { HistoryEntry, StreakData } from '@/lib/storage';
import {
  saveAppStateToCloud as saveAppStateOld,
  loadAppStateFromCloud as loadAppStateOld,
  saveHistoryEntryToCloud,
  loadHistoryFromCloud,
  saveStreakToCloud,
  loadStreakFromCloud,
} from './cloudSyncService';
import {
  saveAppStateNormalized,
  loadAppStateNormalized,
  migrateUserToNormalized,
  isUserMigrated,
} from './normalizedSyncService';

// ─── Feature Flag ─────────────────────────────────────────────────────────────

const USE_NORMALIZED_SCHEMA = true; // Set to false to disable new schema

// ─── Unified Save ─────────────────────────────────────────────────────────────

export async function saveAppState(userId: string, state: AppState): Promise<void> {
  if (!USE_NORMALIZED_SCHEMA) {
    return saveAppStateOld(userId, state);
  }

  try {
    // Check if user has been migrated
    const migrated = await isUserMigrated(userId);
    
    if (migrated) {
      // Use new normalized schema
      await saveAppStateNormalized(userId, state);
    } else {
      // Save to old schema AND migrate to new schema
      await Promise.all([
        saveAppStateOld(userId, state),
        saveAppStateNormalized(userId, state),
      ]);
    }
  } catch (error) {
    console.error('Failed to save to normalized schema, falling back to old schema:', error);
    // Fallback to old schema if new schema fails
    await saveAppStateOld(userId, state);
  }
}

// ─── Unified Load ─────────────────────────────────────────────────────────────

export async function loadAppState(userId: string): Promise<AppState | null> {
  if (!USE_NORMALIZED_SCHEMA) {
    return loadAppStateOld(userId);
  }

  try {
    // Check if user has been migrated
    const migrated = await isUserMigrated(userId);
    
    if (migrated) {
      // Load from new normalized schema
      return await loadAppStateNormalized(userId);
    } else {
      // Load from old schema
      const oldState = await loadAppStateOld(userId);
      
      // Auto-migrate on first load
      if (oldState) {
        try {
          await migrateUserToNormalized(userId);
          console.log('User auto-migrated to normalized schema');
        } catch (error) {
          console.warn('Auto-migration failed, will retry on next save:', error);
        }
      }
      
      return oldState;
    }
  } catch (error) {
    console.error('Failed to load from normalized schema, falling back to old schema:', error);
    // Fallback to old schema if new schema fails
    return loadAppStateOld(userId);
  }
}

// ─── History & Streak (unchanged, still use old tables) ──────────────────────

export {
  saveHistoryEntryToCloud,
  loadHistoryFromCloud,
  saveStreakToCloud,
  loadStreakFromCloud,
};

// ─── Full Restore ─────────────────────────────────────────────────────────────

export interface CloudUserData {
  appState: AppState | null;
  history: HistoryEntry[];
  streak: StreakData;
}

export async function restoreUserData(userId: string): Promise<CloudUserData> {
  try {
    // Add a hard timeout of 3 seconds for the entire restore operation
    const restorePromise = Promise.all([
      loadAppState(userId),
      loadHistoryFromCloud(userId),
      loadStreakFromCloud(userId),
    ]);

    const timeoutPromise = new Promise<[AppState | null, HistoryEntry[], StreakData]>((_, reject) =>
      setTimeout(() => reject(new Error('Restore timeout')), 3000)
    );

    const [appState, history, streak] = await Promise.race([restorePromise, timeoutPromise]);

    // Hydrate localStorage cache
    if (appState) {
      localStorage.setItem('scoretarget_state', JSON.stringify(appState));
      // Restore accent color if it was synced
      if (appState.settings?.accentColor) {
        localStorage.setItem('gostudy_accent', appState.settings.accentColor);
      }
    }
    if (history.length > 0) {
      localStorage.setItem('scoretarget_history', JSON.stringify(history));
    }
    localStorage.setItem('scoretarget_streak', JSON.stringify(streak));

    return { appState, history, streak };
  } catch (error) {
    console.warn('Restore failed or timed out, returning empty data:', error);
    // Return empty data on timeout or error
    return {
      appState: null,
      history: [],
      streak: { currentStreak: 0, longestStreak: 0, lastEntryDate: null },
    };
  }
}

// ─── Full Push ────────────────────────────────────────────────────────────────

export async function pushLocalData(userId: string): Promise<void> {
  const rawState = localStorage.getItem('scoretarget_state');
  const rawHistory = localStorage.getItem('scoretarget_history');
  const rawStreak = localStorage.getItem('scoretarget_streak');

  const promises: Promise<void>[] = [];

  if (rawState) {
    try {
      const state = JSON.parse(rawState) as AppState;
      promises.push(saveAppState(userId, state).catch(err => {
        console.warn('Failed to save app state:', err);
      }));
    } catch { /* ignore parse errors */ }
  }

  if (rawStreak) {
    try {
      const streak = JSON.parse(rawStreak) as StreakData;
      promises.push(saveStreakToCloud(userId, streak).catch(err => {
        console.warn('Failed to save streak:', err);
      }));
    } catch { /* ignore parse errors */ }
  }

  if (rawHistory) {
    try {
      const history = JSON.parse(rawHistory) as HistoryEntry[];
      for (const entry of history) {
        promises.push(saveHistoryEntryToCloud(userId, entry).catch(err => {
          console.warn('Failed to save history entry:', err);
        }));
      }
    } catch { /* ignore parse errors */ }
  }

  await Promise.allSettled(promises);
}

// ─── Manual Migration Trigger ─────────────────────────────────────────────────

export async function triggerMigration(userId: string): Promise<void> {
  const migrated = await isUserMigrated(userId);
  if (migrated) {
    console.log('User already migrated');
    return;
  }

  await migrateUserToNormalized(userId);
  console.log('User successfully migrated to normalized schema');
}
