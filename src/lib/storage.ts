import { AppState, Subject } from "@/types/exam";
import { supabase } from "@/integrations/supabase/client";
import {
  saveAppStateToCloud,
  saveHistoryEntryToCloud,
  saveStreakToCloud,
} from "@/services/cloudSyncService";

const STORAGE_KEY = "scoretarget_state";
const HISTORY_KEY = "scoretarget_history";
const STREAK_KEY  = "scoretarget_streak";

export interface HistoryEntry {
  id: string;
  date: string;
  subjectName: string;
  markType: "interro" | "dev" | "compo";
  value: number;
}

export interface StreakData {
  currentStreak: number;
  lastEntryDate: string | null;
  totalEntries: number;
  bestStreak: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCurrentUserId(): string | null {
  // Synchronous read from the persisted session in localStorage
  try {
    const raw = localStorage.getItem(
      `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`
    );
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.user?.id ?? null;
    }
  } catch {}
  return null;
}

// ─── App State ────────────────────────────────────────────────────────────────

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  // Fire-and-forget cloud write
  const userId = getCurrentUserId();
  if (userId) {
    saveAppStateToCloud(userId, state).catch((err) =>
      console.warn("Cloud state sync failed:", err)
    );
  }
}

export function loadState(): AppState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppState;
    // Migration: old class levels
    const CLASS_MAPPINGS: Record<string, string> = {
      "6ème": "Sixième", "5ème": "Cinquième", "4ème": "Quatrième", "3ème": "Troisième",
    };
    if (parsed.classLevel && CLASS_MAPPINGS[parsed.classLevel]) {
      parsed.classLevel = CLASS_MAPPINGS[parsed.classLevel];
    }
    // Migration: targetMin from old targetAverage
    if (parsed.targetMin === undefined || parsed.targetMin === null) {
      parsed.targetMin = parsed.targetAverage ?? 16;
    }
    // Safety: reset malformed nigerianState
    if (parsed.nigerianState !== undefined) {
      const ns = parsed.nigerianState;
      if (!ns || !Array.isArray(ns.semesters)) {
        parsed.nigerianState = {
          semesters: [],
          cgpa: 0,
          classOfDegree: "Fail",
          targetCGPA: null,
          remainingCreditUnits: 0,
        };
      }
    }
    saveState(parsed);
    return parsed;
  } catch {
    return null;
  }
}

// ─── History ──────────────────────────────────────────────────────────────────

export function addHistoryEntry(entry: Omit<HistoryEntry, "id">) {
  const full: HistoryEntry = { ...entry, id: crypto.randomUUID() };
  const history = getHistory();
  history.push(full);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  updateStreak();

  // Fire-and-forget cloud write
  const userId = getCurrentUserId();
  if (userId) {
    saveHistoryEntryToCloud(userId, full).catch((err) =>
      console.warn("Cloud history sync failed:", err)
    );
  }
}

export function getHistory(): HistoryEntry[] {
  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

// ─── Streak ───────────────────────────────────────────────────────────────────

function updateStreak() {
  const streak = getStreak();
  const today = new Date().toISOString().split("T")[0];

  if (streak.lastEntryDate === today) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (streak.lastEntryDate === yesterday) {
    streak.currentStreak += 1;
  } else if (streak.lastEntryDate !== today) {
    streak.currentStreak = 1;
  }

  streak.lastEntryDate = today;
  streak.totalEntries += 1;
  streak.bestStreak = Math.max(streak.bestStreak, streak.currentStreak);

  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));

  // Fire-and-forget cloud write
  const userId = getCurrentUserId();
  if (userId) {
    saveStreakToCloud(userId, streak).catch((err) =>
      console.warn("Cloud streak sync failed:", err)
    );
  }
}

export function getStreak(): StreakData {
  const raw = localStorage.getItem(STREAK_KEY);
  if (!raw) return { currentStreak: 0, lastEntryDate: null, totalEntries: 0, bestStreak: 0 };
  try {
    return JSON.parse(raw) as StreakData;
  } catch {
    return { currentStreak: 0, lastEntryDate: null, totalEntries: 0, bestStreak: 0 };
  }
}
