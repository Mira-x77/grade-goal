import { AppState, Subject } from "@/types/exam";

const STORAGE_KEY = "scoretarget_state";
const HISTORY_KEY = "scoretarget_history";
const STREAK_KEY = "scoretarget_streak";

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

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadState(): AppState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppState;
  } catch {
    return null;
  }
}

export function addHistoryEntry(entry: Omit<HistoryEntry, "id">) {
  const history = getHistory();
  history.push({ ...entry, id: crypto.randomUUID() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  updateStreak();
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

function updateStreak() {
  const streak = getStreak();
  const today = new Date().toISOString().split("T")[0];
  
  if (streak.lastEntryDate === today) {
    // Already counted today
    return;
  }
  
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
