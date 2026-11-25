import { Capacitor } from "@capacitor/core";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Must match Supabase Auth redirect URLs and Android intent filters. */
export const NATIVE_AUTH_REDIRECT = "com.gostudy.student://auth/callback";

/** Set after OAuth succeeds so ProtectedRoute waits for React session state. */
export const AUTH_JUST_COMPLETED_KEY = "auth_just_completed";

/** Prevents duplicate navigateAfterAuthSession from deep link + callback + onAuthStateChange. */
const OAUTH_NAV_LOCK_KEY = "oauth_nav_lock";

export function getAuthRedirectUrl(): string {
  if (Capacitor.getPlatform() === "web") {
    const url = `${window.location.origin}/auth/callback`;
    if (import.meta.env.DEV) {
      console.info(
        "[auth] Web OAuth redirect URL:",
        url,
        "— add this to Supabase Redirect URLs if sign-in fails.",
      );
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

function tryAcquireOAuthNavLock(): boolean {
  if (sessionStorage.getItem(OAUTH_NAV_LOCK_KEY) === "1") return false;
  sessionStorage.setItem(OAUTH_NAV_LOCK_KEY, "1");
  return true;
}

export function releaseOAuthNavLock(): void {
  sessionStorage.removeItem(OAUTH_NAV_LOCK_KEY);
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export async function resolveSupabaseSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/** Poll until session is persisted (native Preferences can lag after exchange). */
export async function waitForSupabaseSession(maxMs = 5000): Promise<Session | null> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const session = await resolveSupabaseSession();
    if (session && !session.user.is_anonymous) return session;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

export function isOAuthCallbackUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("auth/callback") ||
    lower.includes("access_token") ||
    lower.includes("code=")
  );
}

function parseOAuthUrl(rawUrl: string): URL {
  try {
    return new URL(rawUrl);
  } catch {
    return new URL(rawUrl.replace(/^([a-z0-9.+-]+):\/\//i, "https://"));
  }
}

export async function navigateAfterAuthSession(
  navigate: (path: string, options?: { replace?: boolean }) => void,
  userId?: string,
): Promise<void> {
  if (!tryAcquireOAuthNavLock()) {
    console.info("[auth] navigateAfterAuthSession skipped — already navigating");
    return;
  }

  try {
    markAuthJustCompleted();
    localStorage.removeItem("guest_mode");
    localStorage.setItem("scoretarget_has_account", "true");
    if (userId) localStorage.setItem("scoretarget_last_user_id", userId);

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
            : Array.isArray(parsed.subjects) && parsed.subjects.length > 0;
        }
      }
    } catch {
      hasAppData = false;
    }

    let hasCloudData = false;
    if (userId) {
      try {
        const { data: profile } = await withTimeout(
          supabase.from("user_profile").select("id").eq("user_id", userId).maybeSingle(),
          5000,
          "Profile lookup",
        );
        hasCloudData = !!profile;
      } catch (err) {
        console.warn("[auth] Profile lookup failed or timed out:", err);
        hasCloudData = false;
      }
    }

    navigate(hasAppData || hasCloudData ? "/auth/success" : "/onboarding", { replace: true });
  } finally {
    // Release after navigation is queued so rapid duplicate calls still dedupe
    setTimeout(releaseOAuthNavLock, 1500);
  }
}

/** Strip OAuth params from the address bar after a successful exchange. */
export function cleanOAuthUrlFromHistory(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  url.searchParams.delete("state");
  // HashRouter may store tokens in hash route — only strip OAuth token fragments
  const hash = url.hash.replace(/^#/, "");
  if (hash.includes("access_token=")) {
    url.hash = hash.includes("/") ? `#${hash.split("?")[0]}` : "";
  }
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}

export type OAuthCallbackResult =
  | { ok: true; session: Session }
  | { ok: false; error: string };

async function exchangeOAuthParams(params: {
  code?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  urlError?: string | null;
  urlErrorDescription?: string | null;
}): Promise<OAuthCallbackResult> {
  if (params.urlError) {
    return {
      ok: false,
      error: params.urlErrorDescription ?? params.urlError,
    };
  }

  const existing = await waitForSupabaseSession(800);
  if (existing) {
    return { ok: true, session: existing };
  }

  if (params.accessToken && params.refreshToken) {
    const { data, error } = await withTimeout(
      supabase.auth.setSession({
        access_token: params.accessToken,
        refresh_token: params.refreshToken,
      }),
      15000,
      "setSession",
    );
    if (error) return { ok: false, error: error.message };
    if (!data.session) return { ok: false, error: "No session returned" };
    const session = (await waitForSupabaseSession(3000)) ?? data.session;
    return { ok: true, session };
  }

  if (!params.code) {
    const lateSession = await waitForSupabaseSession(4000);
    if (lateSession) return { ok: true, session: lateSession };
    return { ok: false, error: "No authorization code in callback URL" };
  }

  const { data, error } = await withTimeout(
    supabase.auth.exchangeCodeForSession(params.code),
    15000,
    "exchangeCodeForSession",
  );
  if (error) {
    if (error.message.includes("code verifier") || error.message.includes("invalid")) {
      const recovered = await waitForSupabaseSession(2000);
      if (recovered) return { ok: true, session: recovered };
      await supabase.auth.signOut().catch(() => {});
    }
    return { ok: false, error: error.message };
  }
  if (!data.session) {
    return { ok: false, error: "Sign-in succeeded but no session was created" };
  }

  const session = (await waitForSupabaseSession(3000)) ?? data.session;
  return { ok: true, session };
}

function extractOAuthParamsFromUrl(rawUrl: string) {
  const url = parseOAuthUrl(rawUrl);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, "").split("?").pop() ?? "");
  // HashRouter: #/auth/callback?code=... puts query after route in hash
  const routeHashQuery = url.hash.includes("?")
    ? new URLSearchParams(url.hash.split("?")[1] ?? "")
    : new URLSearchParams();

  const code =
    url.searchParams.get("code") ??
    routeHashQuery.get("code") ??
    hashParams.get("code");

  return {
    code,
    accessToken: hashParams.get("access_token") ?? routeHashQuery.get("access_token"),
    refreshToken: hashParams.get("refresh_token") ?? routeHashQuery.get("refresh_token"),
    urlError: url.searchParams.get("error") ?? routeHashQuery.get("error"),
    urlErrorDescription:
      url.searchParams.get("error_description") ?? routeHashQuery.get("error_description"),
  };
}

/**
 * Complete OAuth from a deep-link URL (native) or the current page URL (web callback).
 */
export async function completeOAuthFromUrl(rawUrl: string): Promise<OAuthCallbackResult> {
  return exchangeOAuthParams(extractOAuthParamsFromUrl(rawUrl));
}

/**
 * Complete OAuth on /auth/callback (web BrowserRouter or native HashRouter route).
 */
export async function completeOAuthFromCallback(): Promise<OAuthCallbackResult> {
  const result = await completeOAuthFromUrl(window.location.href);
  if (result.ok) cleanOAuthUrlFromHistory();
  return result;
}

/**
 * Handle native deep-link return from Google/Apple OAuth in Capacitor Browser.
 * Returns true if the URL was an OAuth callback (handled or failed).
 */
export async function handleNativeOAuthRedirect(
  rawUrl: string,
): Promise<{ handled: boolean; session: Session | null; error?: string }> {
  if (!isOAuthCallbackUrl(rawUrl)) {
    return { handled: false, session: null };
  }

  const result = await completeOAuthFromUrl(rawUrl);
  if (!result.ok) {
    return { handled: true, session: null, error: result.error };
  }
  return { handled: true, session: result.session };
}
