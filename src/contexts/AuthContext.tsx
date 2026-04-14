import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { useNavigate } from "react-router-dom";
import { restoreUserData as restoreUserDataFromCloud, pushLocalData as pushLocalDataToCloud } from "@/services/hybridSyncService";

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

  const checkUserHasCloudData = async (userId: string): Promise<boolean> => {
    try {
      // Check if user has profile data in the database
      const { data: profile, error } = await supabase
        .from('user_profile')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.error("Error checking user profile:", error);
        return false;
      }
      
      // User has profile = returning user
      return !!profile;
    } catch (err) {
      console.error("Error checking user data:", err);
      return false;
    }
  };

  const navigateAfterAuth = async (userId?: string) => {
    const raw = localStorage.getItem("scoretarget_state");
    let hasAppData = false;
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed) {
        const isNigerian = parsed?.settings?.gradingSystem === "nigerian_university";
        hasAppData = isNigerian
          ? (!!parsed.studentName || (Array.isArray(parsed.subjects) && parsed.subjects.length > 0))
          : (Array.isArray(parsed.subjects) && parsed.subjects.length > 0);
      }
    } catch {}
    
    // Also check cloud data if userId is provided
    const hasCloudData = userId ? await checkUserHasCloudData(userId) : false;
    
    navigate((hasAppData || hasCloudData) ? "/auth/success" : "/onboarding", { replace: true });
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
    console.log("syncOnLogin called, userId:", userId);
    const hasLocalData = !!localStorage.getItem('scoretarget_state');
    console.log("hasLocalData:", hasLocalData);

    if (hasLocalData) {
      // Device already has data — just push it up silently, no spinner needed
      console.log("Has local data, pushing to cloud silently");
      void pushLocalDataToCloud(userId).catch((err) =>
        console.warn("Login cloud push failed:", err)
      );
      return;
    }

    // No local data — this is a new device, pull from cloud and show spinner
    console.log("No local data, setting syncing=true");
    setSyncing(true);
    try {
      const timeout = new Promise<void>((resolve) => setTimeout(resolve, 5000));
      const restore = async () => {
        try {
          await restoreUserDataFromCloud(userId);
        } catch (err) {
          console.warn("Cloud restore failed, continuing with empty state:", err);
        }
      };
      await Promise.race([restore(), timeout]);
    } catch (err) {
      console.error("Sync on login failed:", err);
    } finally {
      console.log("Setting syncing=false");
      setSyncing(false);
    }
  };

  useEffect(() => {
    // Restore existing session on mount — push local data to cloud silently
    // Add a timeout so offline users aren't stuck on loading screen forever
    const loadingTimeout = setTimeout(() => setLoading(false), 3000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(loadingTimeout);
      setSession(session);
      if (session?.user) {
        syncInBackground(session.user.id);
      }
      setLoading(false);
      initialSessionRestoredRef.current = true;
    }).catch(() => {
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

    // Also push when the app comes back to the foreground
    let appStateListener: { remove: () => void } | null = null;
    App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) syncInBackground(session.user.id);
        });
      }
    }).then((handle) => { appStateListener = handle; });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      // Clear guest mode flag once a real session is established
      if (session) localStorage.removeItem("guest_mode");
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
        const { data } = await supabase.auth.exchangeCodeForSession(url);
        await navigateAfterAuth(data.session?.user?.id);
        return;
      }

      // Implicit flow — tokens in hash
      const hashParams = new URLSearchParams(urlObj.hash.replace("#", ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        const { data } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        await navigateAfterAuth(data.session?.user?.id);
      }
    }).then((handle) => {
      deepLinkListener = handle;
    });

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
