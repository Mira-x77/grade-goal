import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const isNative = Capacitor.isNativePlatform();

const KEYS = [
  "scoretarget_state",
  "scoretarget_history",
  "scoretarget_streak",
  "gostudy_accent",
  "scoretarget_tour_seen",
  "guest_mode",
];

/**
 * On native Android, localStorage can be wiped by the OS.
 * This module mirrors critical keys to Capacitor Preferences (native SharedPreferences)
 * which survives cache clears and background kills.
 *
 * Call `restoreFromNative()` once on app startup before anything reads localStorage.
 * Call `mirrorToNative(key, value)` whenever a critical key is written.
 */

export async function restoreFromNative(): Promise<void> {
  if (!isNative) return;
  for (const key of KEYS) {
    const localVal = localStorage.getItem(key);
    if (!localVal) {
      // localStorage is empty — restore from native storage
      const { value } = await Preferences.get({ key });
      if (value) localStorage.setItem(key, value);
    }
  }
  // Also restore any intro_seen keys
  const { keys } = await Preferences.keys();
  for (const key of keys) {
    if (key.startsWith("scoretarget_intro_seen_") && !localStorage.getItem(key)) {
      const { value } = await Preferences.get({ key });
      if (value) localStorage.setItem(key, value);
    }
  }
}

export async function mirrorToNative(key: string, value: string | null): Promise<void> {
  if (!isNative) return;
  if (value === null) {
    await Preferences.remove({ key });
  } else {
    await Preferences.set({ key, value });
  }
}
