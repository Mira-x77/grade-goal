import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const isNative = Capacitor.isNativePlatform();

/**
 * Storage adapter for Supabase auth that uses Capacitor Preferences on native
 * (survives WebView kills on Android) and falls back to localStorage on web.
 */
export const capacitorStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (!isNative) return localStorage.getItem(key);
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (!isNative) { localStorage.setItem(key, value); return; }
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string): Promise<void> => {
    if (!isNative) { localStorage.removeItem(key); return; }
    await Preferences.remove({ key });
  },
};
