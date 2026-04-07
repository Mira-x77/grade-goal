import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import Mascot from "@/components/Mascot";
import { CheckCircle2, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AuthPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const browserClosedRef = useRef(false);
  const pendingSessionRef = useRef(false);

  // Track when the in-app browser closes
  useEffect(() => {
    const handleBrowserFinished = () => {
      browserClosedRef.current = true;
      setOauthLoading(null);
      // If a session already arrived while browser was open, show success now
      if (pendingSessionRef.current) {
        setSignedIn(true);
      }
    };
    Browser.addListener("browserFinished", handleBrowserFinished);
    return () => { Browser.removeAllListeners(); };
  }, []);

  // Listen for auth state — only show success AFTER browser has closed
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        if (browserClosedRef.current) {
          // Browser already closed, show success immediately
          setSignedIn(true);
          setOauthLoading(null);
        } else {
          // Browser still open — queue it, show after browser closes
          pendingSessionRef.current = true;
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const getRedirectUrl = () => {
    if (Capacitor.getPlatform() !== 'web') {
      return "com.scoretarget.app://auth/callback";
    }
    return `${window.location.origin}/auth/callback`;
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setError("");
    setOauthLoading(provider);
    try {
      const isNative = Capacitor.getPlatform() !== 'web';

      if (isNative) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: "com.scoretarget.app://auth/callback",
            skipBrowserRedirect: true,
          },
        });
        if (error) throw error;
        if (data?.url) {
          await Browser.open({
            url: data.url,
            windowName: "_self",
            presentationStyle: "popover",
          });
          // Keep loading state — the browser will redirect back via deep link
          // Don't reset oauthLoading here so the button stays in loading state
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: getRedirectUrl() },
        });
        if (error) throw error;
        // Web redirect — keep loading
        return;
      }
    } catch (e: any) {
      setError(e.message ?? t("somethingWentWrong"));
      setOauthLoading(null);
    }
  };

  const handleGuest = async () => {
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      navigate("/onboarding");
    } catch (e: any) {
      setError(e.message ?? t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = () => {
    localStorage.setItem("dev_bypass", "true");
    localStorage.setItem("scoretarget_state", JSON.stringify({
      step: "results",
      studentName: "Dev",
      targetAverage: 16,
      subjects: [
        { id: "1", name: "Mathematics", coefficient: 5, isOptional: false, marks: [], average: 15 },
        { id: "2", name: "Physics", coefficient: 4, isOptional: false, marks: [], average: 12 }
      ],
      targetDate: null,
      settings: { gradingSystem: "apc" }
    }));
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto flex flex-col">
      {/* Success overlay */}
      <AnimatePresence>
        {signedIn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-5 px-8"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15 border-2 border-success"
            >
              <CheckCircle2 className="h-10 w-10 text-success" />
            </motion.div>
            <div className="text-center">
              <p className="text-2xl font-black text-foreground">{t("signedIn")}</p>
              <p className="text-sm font-semibold text-muted-foreground mt-1">{t("settingUpExperience")}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex justify-center pb-0 safe-area-top relative pt-12">
        <div className="absolute top-4 right-6 z-10">
          <button 
            onClick={() => setLang(language === 'fr' ? 'en' : 'fr')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-foreground bg-card font-black text-xs text-foreground card-shadow active:translate-y-[2px] active:shadow-none transition-all"
          >
            <Globe className="h-3.5 w-3.5" />
            {language === 'fr' ? 'FR' : 'EN'}
          </button>
        </div>
        <Mascot pose="pointing" size={120} animate />
      </div>

      <div className="flex-1 flex flex-col px-6 pt-6 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-7"
        >
          <div>
            <h1 className="text-4xl font-black text-foreground leading-tight">{t("welcome")}</h1>
            <p className="mt-1 text-sm font-bold text-muted-foreground">{t("signInTo")}</p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleOAuth("google")}
              disabled={!!oauthLoading}
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-card border-2 border-foreground py-3.5 text-sm font-black text-foreground active:scale-[0.98] transition-transform card-shadow disabled:opacity-60 disabled:pointer-events-none"
            >
              {oauthLoading === "google" ? (
                <span className="h-5 w-5 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {oauthLoading === "google" ? t("signingIn") : t("continueWithGoogle")}
            </button>

            <button
              onClick={() => handleOAuth("apple")}
              disabled={!!oauthLoading}
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-foreground border-2 border-foreground py-3.5 text-sm font-black text-background active:scale-[0.98] transition-transform card-shadow disabled:opacity-60 disabled:pointer-events-none"
            >
              {oauthLoading === "apple" ? (
                <span className="h-5 w-5 rounded-full border-2 border-background border-t-transparent animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 3.99zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
              )}
              {oauthLoading === "apple" ? t("signingIn") : t("continueWithApple")}
            </button>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-0.5 bg-foreground/20" />
              <span className="text-xs font-black text-muted-foreground">{t("orDivider")}</span>
              <div className="flex-1 h-0.5 bg-foreground/20" />
            </div>

            <button
              onClick={handleGuest}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-card border-2 border-foreground/30 py-3.5 text-sm font-black text-muted-foreground active:scale-[0.98] transition-transform disabled:opacity-40 disabled:pointer-events-none"
            >
              {loading ? t("pleaseWait") : t("continueAsGuest")}
            </button>

            {error && (
              <p className="text-xs font-bold text-danger bg-danger/10 border-2 border-danger/30 rounded-xl px-4 py-3">{error}</p>
            )}

            <p className="text-center text-xs text-muted-foreground mt-2">
              {t("guestLimitedFeatures")}{" "}
              <br />{t("signInForFullExperience")}
            </p>

            {import.meta.env.DEV && (
              <button
                onClick={handleDevBypass}
                className="w-full mt-4 py-2 text-xs font-bold text-muted-foreground/50 border border-dashed border-muted-foreground/20 rounded-xl hover:border-muted-foreground/40 transition-colors"
              >
                {t("devBypass")}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}