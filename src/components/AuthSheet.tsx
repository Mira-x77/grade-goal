import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AuthSheet({ open, onClose }: Props) {
  const { t, language } = useLanguage();
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState("");
  const browserClosedRef = useRef(false);
  const pendingSessionRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const handleBrowserFinished = () => {
      browserClosedRef.current = true;
      setOauthLoading(null);
    };
    Browser.addListener("browserFinished", handleBrowserFinished);
    return () => { Browser.removeAllListeners(); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setOauthLoading(null);
        onClose();
      }
    });
    return () => subscription.unsubscribe();
  }, [open, onClose]);

  const getRedirectUrl = () => {
    if (Capacitor.getPlatform() !== "web") return "com.scoretarget.app://auth/callback";
    return `${window.location.origin}/auth/callback`;
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setError("");
    setOauthLoading(provider);
    try {
      const isNative = Capacitor.getPlatform() !== "web";
      if (isNative) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: "com.scoretarget.app://auth/callback", skipBrowserRedirect: true },
        });
        if (error) throw error;
        if (data?.url) {
          await Browser.open({ url: data.url, windowName: "_self", presentationStyle: "popover" });
        }
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: getRedirectUrl(),
            skipBrowserRedirect: false,
            queryParams: { access_type: "offline", prompt: "consent" },
          },
        });
        if (error) throw error;
      }
    } catch (e: any) {
      setError(e.message ?? t("somethingWentWrong"));
      setOauthLoading(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/50"
          />

          {/* Sheet wrapper — handles centering */}
          <div className="fixed bottom-0 left-0 right-0 z-[61] flex justify-center md:bottom-8">
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-md bg-card rounded-t-3xl md:rounded-3xl px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] md:pb-10 pt-4"
          >
            {/* Handle */}
            <div className="w-10 h-1.5 rounded-full bg-foreground/20 mx-auto mb-6" />

            {/* Close */}
            <button onClick={onClose} className="absolute top-5 right-5 text-muted-foreground active:scale-90 transition-transform">
              <X className="h-5 w-5" />
            </button>

            {/* Title */}
            <div className="text-center mb-8">
              <p className="text-sm font-semibold text-muted-foreground mt-1">
                {language === "fr" ? "Connectez-vous pour continuer" : "Sign in to continue"}
              </p>
            </div>

            {/* Social buttons — centered */}
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button
                onClick={() => handleOAuth("google")}
                disabled={!!oauthLoading}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-background border-2 border-foreground py-3.5 text-sm font-black text-foreground active:scale-[0.98] transition-transform card-shadow disabled:opacity-60 disabled:pointer-events-none"
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

              {error && (
                <p className="text-xs font-bold text-danger bg-danger/10 border-2 border-danger/30 rounded-xl px-4 py-3 text-center">{error}</p>
              )}
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
