import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { useNavigate } from "react-router-dom";
import { restoreUserData as restoreUserDataFromCloud, pushLocalData as pushLocalDataToCloud } from "@/services/hybridSyncService";
import { navigateAfterAuthSession } from "@/lib/auth-config";
import { Capacitor } from "@capacitor/core";
import { loadState } from "@/lib/storage";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** True while cloud data is being fetched after login */
  syncing: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  syncing: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  // Ref so the onAuthStateChange callback always reads the latest value (no stale closure).
  const initialSessionRestoredRef = useRef(false);
  // Prevents double-sync when handleAuthDeepLink already called syncOnLogin and
  // onAuthStateChange fires SIGNED_IN immediately after for the same session.
  const syncInProgressRef = useRef(false);
  const navigate = useNavigate();

  const navigateAfterAuth = async (userId?: string) => {
    await navigateAfterAuthSession(navigate, userId);
  };

  const handleAuthDeepLink = async (url: string) => {
    if (!url.includes("auth/callback") && !url.includes("access_token") && !url.includes("code=")) {
      return false;
    }

    await Browser.close().catch(() => {});

    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      urlObj = new URL(url.replace(/^([a-z0-9.+-]+):\/\//i, "https://"));
    }

    const code = urlObj.searchParams.get("code");
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("[AuthContext] PKCE exchange failed:", error.message);
        navigate("/welcome", { replace: true });
        return true;
      }
      // Restore cloud data BEFORE navigating so localStorage is populated when
      // navigateAfterAuthSession checks it and when LandingRoute renders.
      const userId = data.session?.user?.id;
      if (userId) await syncOnLogin(userId);
      await navigateAfterAuth(userId);
      return true;
    }

    const hashParams = new URLSearchParams(urlObj.hash.replace("#", ""));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        console.error("[AuthContext] setSession failed:", error.message);
        navigate("/welcome", { replace: true });
        return true;
      }
      // Restore cloud data BEFORE navigating (same reason as above).
      const userId = data.session?.user?.id;
      if (userId) await syncOnLogin(userId);
      await navigateAfterAuth(userId);
      return true;
    }

    return false;
  };

  /**
   * Background sync — pushes local data up to the cloud silently.
   * Never reads from cloud, never touches localStorage.
   * Local storage is always the source of truth while the app is in use.
   */
  const syncInBackground = (userId: string) => {
    void pushLocalDataToCloud(userId).catch((err) =>
      console.warn("Background cloud push failed:", err)
    );
  };

  const syncOnLogin = async (userId: string) => {
    if (syncInProgressRef.current) {
      console.log("[AuthContext] syncOnLogin skipped — already in progress");
      return;
    }
    syncInProgressRef.current = true;
    console.log("syncOnLogin called, userId:", userId);
    const hasLocalData = !!localStorage.getItem('scoretarget_state');
    const localState = hasLocalData ? loadState() : null;
    console.log("hasLocalData:", hasLocalData);
    console.log("localState onboarding_completed:", localState?.onboarding_completed);

    try {
      // Check if user has cloud data
      const cloudState = await (async () => {
        try {
          const { loadAppStateFromCloud } = await import('@/services/cloudSyncService');
          return await loadAppStateFromCloud(userId);
        } catch {
          return null;
        }
      })();
      
      console.log("cloudState exists:", !!cloudState);
      console.log("cloudState onboarding_completed:", cloudState?.onboarding_completed);

      // Decision logic for data restoration
      if (cloudState && cloudState.onboarding_completed) {
        // User has completed onboarding in the cloud - restore it
        console.log("Restoring cloud onboarding data");
        setSyncing(true);
        await restoreUserDataFromCloud(userId);
        setSyncing(false);
      } else if (localState && localState.onboarding_completed) {
        // User completed onboarding locally (guest mode) - upload to cloud
        console.log("Uploading local onboarding data to cloud");
        void pushLocalDataToCloud(userId).catch((err) =>
          console.warn("Failed to push local data:", err)
        );
      } else if (cloudState) {
        // User has partial cloud data but onboarding not complete
        console.log("Restoring partial cloud data");
        setSyncing(true);
        await restoreUserDataFromCloud(userId);
        setSyncing(false);
      } else if (hasLocalData) {
        // User has local data only - upload it
        console.log("Uploading local data to cloud");
        void pushLocalDataToCloud(userId).catch((err) =>
          console.warn("Failed to push local data:", err)
        );
      } else {
        // New user with no data - will go through onboarding
        console.log("New user, no data to sync");
      }
    } catch (err) {
      console.error("Sync on login failed:", err);
      setSyncing(false);
    } finally {
      syncInProgressRef.current = false;
    }
  };

  useEffect(() => {
    // Restore existing session on mount — push local data to cloud silently
    // Fast 600ms timeout so offline/paused Supabase users are never stuck
    const loadingTimeout = setTimeout(() => {
      console.warn("[AuthContext] Supabase session check timed out (paused/offline). Enabling local mode.");
      setLoading(false);
      initialSessionRestoredRef.current = true;
    }, 600);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(loadingTimeout);
      setSession(session);
      if (session?.user) {
        syncInBackground(session.user.id);
      }
      setLoading(false);
      initialSessionRestoredRef.current = true;
    }).catch((err) => {
      console.warn("[AuthContext] getSession error (paused/offline):", err);
      clearTimeout(loadingTimeout);
      setLoading(false);
      initialSessionRestoredRef.current = true;
    });

    // Periodic background push every 30 seconds
    const periodicSync = setInterval(() => {
      const currentSession = supabase.auth.getSession();
      currentSession.then(({ data: { session } }) => {
        if (session?.user) syncInBackground(session.user.id);
      });
    }, 30 * 1000);

    let appStateListener: { remove: () => void } | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session && !session.user.is_anonymous) {
        localStorage.removeItem("guest_mode");
      }
      if (event === "SIGNED_IN" && session?.user && !session.user.is_anonymous) {
        if (initialSessionRestoredRef.current) {
          await syncOnLogin(session.user.id);
        }
      }
      if (event === "SIGNED_OUT") {
        localStorage.removeItem("scoretarget_state");
        localStorage.removeItem("scoretarget_history");
        localStorage.removeItem("scoretarget_streak");
      }
    });

    // Native-only deep link handling (OAuth return on Android/iOS)
    let deepLinkListener: { remove: () => void } | null = null;

    if (Capacitor.isNativePlatform()) {
      App.addListener("appUrlOpen", async ({ url }) => {
        const paperMatch = url.match(/\/paper\/([a-zA-Z0-9_-]+)/);
        if (paperMatch) {
          navigate(`/library/${paperMatch[1]}`);
          return;
        }

        await handleAuthDeepLink(url);
      }).then((handle) => {
        deepLinkListener = handle;
      });

      App.getLaunchUrl()
        .then(({ url }) => {
          if (url) void handleAuthDeepLink(url);
        })
        .catch(() => {});
    }

    if (Capacitor.isNativePlatform()) {
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) syncInBackground(session.user.id);
          });
        }
      }).then((handle) => { appStateListener = handle; });
    }

    return () => {
      subscription.unsubscribe();
      deepLinkListener?.remove();
      appStateListener?.remove();
      clearInterval(periodicSync);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, syncing, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
