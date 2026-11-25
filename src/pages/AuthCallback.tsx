import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  completeOAuthFromCallback,
  navigateAfterAuthSession,
  waitForSupabaseSession,
} from "@/lib/auth-config";

const CALLBACK_TIMEOUT_MS = 20_000;

const AuthCallback = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const fail = (message: string) => {
      console.error("Auth callback error:", message);
      setErrorMessage(message);
      setHasError(true);
      setTimeout(() => navigate("/welcome", { replace: true }), 4000);
    };

    const handleCallback = async () => {
      timeoutId = setTimeout(() => {
        void (async () => {
          const session = await waitForSupabaseSession(500);
          if (session) {
            await navigateAfterAuthSession(navigate, session.user.id);
            return;
          }
          fail("Sign-in is taking too long. Please try again.");
        })();
      }, CALLBACK_TIMEOUT_MS);

      try {
        const result = await completeOAuthFromCallback();

        let session = result.ok ? result.session : null;
        if (!session) {
          // Native deep link may have exchanged the code before this page mounted
          session = await waitForSupabaseSession(5000);
        }

        if (!session) {
          fail(result.ok ? "No session after sign-in" : result.error);
          return;
        }

        // Cloud restore runs in AuthContext.syncOnLogin on SIGNED_IN — avoid duplicate work here
        await navigateAfterAuthSession(navigate, session.user.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign-in failed";
        fail(message);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    void handleCallback();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6">
      {hasError ? (
        <>
          <div className="h-16 w-16 rounded-full bg-amber-100 border-2 border-amber-500 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="text-center max-w-sm">
            <p className="text-lg font-black text-foreground">Sign in failed</p>
            <p className="text-xs font-semibold text-muted-foreground mt-2 break-words">
              {errorMessage}
            </p>
            <p className="text-sm font-semibold text-muted-foreground mt-3">
              Redirecting you back...
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm font-bold text-muted-foreground">{t("signingIn")}</p>
        </>
      )}
    </div>
  );
};

export default AuthCallback;
