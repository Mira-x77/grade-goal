import { AppState, Subject } from "@/types/exam";
import { supabase } from "@/integrations/supabase/client";
import {
  saveAppState as saveAppStateToCloud,
  saveHistoryEntryToCloud,
  saveStreakToCloud,
} from "@/services/hybridSyncService";
import { ensureNigerianAssessments } from "@/lib/nigerian-defaults";
import { mirrorToNative } from "@/lib/nativeStorage";

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
  const json = JSON.stringify(state);
  localStorage.setItem(STORAGE_KEY, json);
  void mirrorToNative(STORAGE_KEY, json);

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
  console.log("loadState called, raw data:", raw ? raw.substring(0, 100) + "..." : null);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppState;
    console.log("loadState parsed successfully, step:", parsed.step);
    // Migration: old class levels
    const CLASS_MAPPINGS: Record<string, string> = {
      "6ème": "Sixième", "5ème": "Cinquième", "4ème": "Quatrième", "3ème": "Troisième",
    };
    if (parsed.classLevel && CLASS_MAPPINGS[parsed.classLevel]) {
      parsed.classLevel = CLASS_MAPPINGS[parsed.classLevel];
    }
    // Migration: normalize old "results" / "done" step — treat as completed onboarding
    if ((parsed.step as string) === "results" || (parsed.step as string) === "done") {
      parsed.step = "marks";
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
    
    // Safety: ensure Nigerian subjects have customAssessments
    if (parsed.settings?.gradingSystem === "nigerian_university" && parsed.subjects) {
      parsed.subjects = parsed.subjects.map(ensureNigerianAssessments);
    }

    // Sync accent color from AppState to localStorage so ThemeContext picks it up
    if (parsed.settings?.accentColor) {
      localStorage.setItem("gostudy_accent", parsed.settings.accentColor);
    }
    
    saveState(parsed);
    return parsed;
  } catch (error) {
    console.error("loadState error:", error);
    return null;
  }
}

// ─── History ──────────────────────────────────────────────────────────────────

export function addHistoryEntry(entry: Omit<HistoryEntry, "id">) {
  const full: HistoryEntry = { ...entry, id: crypto.randomUUID() };
  const history = getHistory();
  history.push(full);
  const historyJson = JSON.stringify(history);
  localStorage.setItem(HISTORY_KEY, historyJson);
  void mirrorToNative(HISTORY_KEY, historyJson);
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

  const streakJson = JSON.stringify(streak);
  localStorage.setItem(STREAK_KEY, streakJson);
  void mirrorToNative(STREAK_KEY, streakJson);

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
