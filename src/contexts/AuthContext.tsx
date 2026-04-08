import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { useNavigate } from "react-router-dom";
import { restoreUserDataFromCloud, pushLocalDataToCloud } from "@/services/cloudSyncService";

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
  const navigate = useNavigate();

  const navigateAfterAuth = () => {
    const raw = localStorage.getItem("scoretarget_state");
    let hasAppData = false;
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      hasAppData = parsed && Array.isArray(parsed.subjects) && parsed.subjects.length > 0;
    } catch {}
    navigate(hasAppData ? "/" : "/onboarding", { replace: true });
  };

  /**
   * Background sync — never blocks the UI.
   * Used on session restore (app resume) so the user sees their local data
   * immediately while the cloud quietly reconciles in the background.
   */
  const syncInBackground = (userId: string) => {
    const sync = async () => {
      try {
        const cloudData = await restoreUserDataFromCloud(userId);
        if (!cloudData.appState) {
          await pushLocalDataToCloud(userId);
        }
      } catch (err) {
        console.warn("Cloud sync failed, continuing with local data:", err);
      }
    };
    // Fire and forget — no loading state shown
    void sync();
  };

  /**
   * Foreground sync — shows the "Restoring…" spinner.
   * Only used on an explicit fresh login (SIGNED_IN event) so the user
   * gets their data before seeing the app for the first time on a new device.
   */
  const syncOnLogin = async (userId: string) => {
    setSyncing(true);
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 5000));
    const sync = async () => {
      try {
        const cloudData = await restoreUserDataFromCloud(userId);
        if (!cloudData.appState) {
          await pushLocalDataToCloud(userId);
        }
      } catch (err) {
        console.warn("Cloud sync failed, continuing with local data:", err);
      }
    };
    await Promise.race([sync(), timeout]);
    setSyncing(false);
  };

  useEffect(() => {
    // Restore existing session on mount — sync silently in background
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        syncInBackground(session.user.id); // non-blocking
      }
      setLoading(false);
      initialSessionRestoredRef.current = true;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (event === "SIGNED_IN" && session?.user) {
        // Only show the spinner on a genuine new login.
        // If initial session hasn't been restored yet, getSession() is still running
        // and will handle the background sync — skip here to avoid double sync.
        if (initialSessionRestoredRef.current) {
          await syncOnLogin(session.user.id);
        }
      }
      if (event === "SIGNED_OUT") {
        // Clear local cache on sign-out to prevent data leakage
        localStorage.removeItem("scoretarget_state");
        localStorage.removeItem("scoretarget_history");
        localStorage.removeItem("scoretarget_streak");
      }
    });

    // Handle deep links (Android/iOS) — catches com.scoretarget.app://auth/callback
    let deepLinkListener: { remove: () => void } | null = null;

    App.addListener("appUrlOpen", async ({ url }) => {
      if (!url.includes("auth/callback") && !url.includes("access_token") && !url.includes("code=")) return;

      await Browser.close().catch(() => {});

      const urlObj = new URL(url);

      // PKCE flow — code in query params
      const code = urlObj.searchParams.get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(url);
        navigateAfterAuth();
        return;
      }

      // Implicit flow — tokens in hash
      const hashParams = new URLSearchParams(urlObj.hash.replace("#", ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        navigateAfterAuth();
      }
    }).then((handle) => {
      deepLinkListener = handle;
    });

    return () => {
      subscription.unsubscribe();
      deepLinkListener?.remove();
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
