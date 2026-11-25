import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { mirrorToNative } from "@/lib/nativeStorage";

export const HAS_ACCOUNT_KEY = "scoretarget_has_account";
export const LAST_USER_ID_KEY = "scoretarget_last_user_id";

function writeLocal(key: string, value: string | null) {
  if (typeof localStorage === "undefined") return;
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
  void mirrorToNative(key, value);
}

/** Persist that this device has a real (Google/Apple/email) account. Survives offline session loss. */
export function persistSignedInAccount(user: User): void {
  if (user.is_anonymous) return;
  writeLocal(HAS_ACCOUNT_KEY, "true");
  writeLocal(LAST_USER_ID_KEY, user.id);
  writeLocal("guest_mode", null);
}

export function clearSignedInAccount(): void {
  writeLocal(HAS_ACCOUNT_KEY, null);
  writeLocal(LAST_USER_ID_KEY, null);
}

export function hasPersistedAccount(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(HAS_ACCOUNT_KEY) === "true";
}

export function getPersistedUserId(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(LAST_USER_ID_KEY);
}

/** True when the user has not signed in with Google/Apple (guest or anonymous). */
export function isGuestUser(user: User | null | undefined): boolean {
  if (hasPersistedAccount()) return false;
  if (user && !user.is_anonymous) return false;
  if (typeof localStorage !== "undefined" && localStorage.getItem("guest_mode") === "true") {
    return true;
  }
  if (!user?.id) return true;
  return user.is_anonymous === true;
}

/**
 * Ensures a Supabase session exists for app-only (non-Google) users.
 * Uses anonymous auth so progress can sync to the cloud and appear in user_profile.
 */
export async function ensureGuestSession(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;

    if (!navigator.onLine) return null;

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn("[guest-auth] Anonymous sign-in failed:", error.message);
      return null;
    }
    return data.user?.id ?? null;
  } catch (err) {
    console.warn("[guest-auth] ensureGuestSession error:", err);
    return null;
  }
}
