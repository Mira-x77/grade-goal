import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { useNavigate } from "react-router-dom";
import { restoreUserData as restoreUserDataFromCloud, pushLocalData as pushLocalDataToCloud } from "@/services/hybridSyncService";
import {
  handleNativeOAuthRedirect,
  navigateAfterAuthSession,
  withTimeout,
} from "@/lib/auth-config";
import { Capacitor } from "@capacitor/core";
import { loadState } from "@/lib/storage";
import { clearLocalSubscription } from "@/services/subscriptionService";
import { persistSignedInAccount, clearSignedInAccount } from "@/lib/guest-auth";

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
  const explicitSignOutRef = useRef(false);
  const navigate = useNavigate();

  const navigateAfterAuth = async (userId?: string) => {
    await navigateAfterAuthSession(navigate, userId);
  };

  const handleAuthDeepLink = async (url: string) => {
    await Browser.close().catch(() => {});

    const { handled, session, error } = await handleNativeOAuthRedirect(url);
    if (!handled) return false;

    if (!session) {
      console.error("[AuthContext] OAuth redirect failed:", error);
      navigate("/welcome", { replace: true });
      return true;
    }

    const userId = session.user.id;
    await syncOnLogin(userId);
    await navigateAfterAuth(userId);
    return true;
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
          return await withTimeout(
            loadAppStateFromCloud(userId),
            5000,
            "loadAppStateFromCloud",
          );
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
      if (session?.user && !session.user.is_anonymous) {
        persistSignedInAccount(session.user);
        syncInBackground(session.user.id);
      } else if (session?.user) {
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
      // Token refresh can fail offline and emit SIGNED_OUT. Keep the local account
      // so downloaded files and tracker still work until they are online again.
      if (event === "SIGNED_OUT" && !explicitSignOutRef.current && !navigator.onLine) {
        console.warn("[AuthContext] Ignoring offline SIGNED_OUT");
        return;
      }

      setSession(session);
      if (session?.user && !session.user.is_anonymous) {
        persistSignedInAccount(session.user);
      }
      if (event === "SIGNED_IN" && session?.user) {
        if (initialSessionRestoredRef.current) {
          await syncOnLogin(session.user.id);
        }
      }
      if (event === "SIGNED_OUT") {
        explicitSignOutRef.current = false;
        clearSignedInAccount();
        localStorage.removeItem("scoretarget_state");
        localStorage.removeItem("scoretarget_history");
        localStorage.removeItem("scoretarget_streak");
        clearLocalSubscription();
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
    explicitSignOutRef.current = true;
    clearSignedInAccount();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, syncing, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
