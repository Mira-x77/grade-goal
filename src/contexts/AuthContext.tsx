import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Handle deep links (Android/iOS) — catches com.scoretarget.app://auth/callback
    let deepLinkListener: { remove: () => void } | null = null;

    App.addListener("appUrlOpen", async ({ url }) => {
      if (!url.includes("auth/callback") && !url.includes("access_token") && !url.includes("code=")) return;

      // Close the in-app browser overlay first
      await Browser.close().catch(() => {});

      const urlObj = new URL(url);

      // PKCE flow — code in query params
      const code = urlObj.searchParams.get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(url);
        return;
      }

      // Implicit flow — tokens in hash
      const hashParams = new URLSearchParams(urlObj.hash.replace("#", ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
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
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
