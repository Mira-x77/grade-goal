import { Capacitor } from "@capacitor/core";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Must match Supabase Auth redirect URLs and Android intent filters. */
export const NATIVE_AUTH_REDIRECT = "com.gostudy.student://auth/callback";

/** Set after OAuth succeeds so ProtectedRoute waits for React session state. */
export const AUTH_JUST_COMPLETED_KEY = "auth_just_completed";

export function getAuthRedirectUrl(): string {
  if (Capacitor.getPlatform() === "web") {
    const url = `${window.location.origin}/auth/callback`;
    if (import.meta.env.DEV) {
      console.info("[auth] Web OAuth redirect URL:", url, "— add this to Supabase Redirect URLs if sign-in fails.");
    }
    return url;
  }
  return NATIVE_AUTH_REDIRECT;
}

export function markAuthJustCompleted(): void {
  sessionStorage.setItem(AUTH_JUST_COMPLETED_KEY, "1");
}

export function clearAuthJustCompleted(): void {
  sessionStorage.removeItem(AUTH_JUST_COMPLETED_KEY);
}

export function isAuthJustCompleted(): boolean {
  return sessionStorage.getItem(AUTH_JUST_COMPLETED_KEY) === "1";
}

export async function resolveSupabaseSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function navigateAfterAuthSession(
  navigate: (path: string, options?: { replace?: boolean }) => void,
  userId?: string,
): Promise<void> {
  markAuthJustCompleted();
  localStorage.removeItem("guest_mode");

  const raw = localStorage.getItem("scoretarget_state");
  let hasAppData = false;
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed) {
      if (parsed.onboarding_completed === true) {
        hasAppData = true;
      } else {
        const isNigerian = parsed?.settings?.gradingSystem === "nigerian_university";
        hasAppData = isNigerian
          ? (!!parsed.studentName || (Array.isArray(parsed.subjects) && parsed.subjects.length > 0))
          : (Array.isArray(parsed.subjects) && parsed.subjects.length > 0);
      }
    }
  } catch {
    hasAppData = false;
  }

  let hasCloudData = false;
  if (userId) {
    try {
      const { data: profile } = await supabase
        .from("user_profile")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      hasCloudData = !!profile;
    } catch {
      hasCloudData = false;
    }
  }

  navigate(hasAppData || hasCloudData ? "/auth/success" : "/onboarding", { replace: true });
}

/** Strip OAuth params from the address bar after a successful exchange. */
export function cleanOAuthUrlFromHistory(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  url.hash = "";
  window.history.replaceState(window.history.state, "", url.pathname + url.search);
}

export type OAuthCallbackResult =
  | { ok: true; session: Session }
  | { ok: false; error: string };

/**
 * Complete OAuth on /auth/callback. Uses the PKCE *code* only — never the full URL.
 */
export async function completeOAuthFromCallback(): Promise<OAuthCallbackResult> {
  const url = new URL(window.location.href);
  const urlError = url.searchParams.get("error");
  if (urlError) {
    return {
      ok: false,
      error: url.searchParams.get("error_description") ?? urlError,
    };
  }

  const { data: { session: existing } } = await supabase.auth.getSession();
  if (existing && !existing.user.is_anonymous) {
    cleanOAuthUrlFromHistory();
    return { ok: true, session: existing };
  }

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) return { ok: false, error: error.message };
    if (!data.session) return { ok: false, error: "No session returned" };
    cleanOAuthUrlFromHistory();
    return { ok: true, session: data.session };
  }

  const code = url.searchParams.get("code");
  if (!code) {
    return { ok: false, error: "No authorization code in callback URL" };
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    if (error.message.includes("code verifier")) {
      await supabase.auth.signOut();
    }
    return { ok: false, error: error.message };
  }
  if (!data.session) {
    return { ok: false, error: "Sign-in succeeded but no session was created" };
  }

  cleanOAuthUrlFromHistory();
  return { ok: true, session: data.session };
}
