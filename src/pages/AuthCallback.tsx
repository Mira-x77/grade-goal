import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { completeOAuthFromCallback, navigateAfterAuthSession } from "@/lib/auth-config";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isRestoring, setIsRestoring] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const checkUserData = async (userId: string): Promise<boolean> => {
      try {
        const { data: profile, error } = await supabase
          .from("user_profile")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) {
          console.error("Error checking user profile:", error);
          return false;
        }

        return !!profile;
      } catch (err) {
        console.error("Error checking user data:", err);
        return false;
      }
    };

    const restoreUserData = async (userId: string): Promise<void> => {
      try {
        setIsRestoring(true);
        const { restoreUserData: restore } = await import("@/services/hybridSyncService");
        await restore(userId);
      } catch (err) {
        console.error("AuthCallback: Failed to restore user data:", err);
      } finally {
        setIsRestoring(false);
      }
    };

    const handleCallback = async () => {
      const result = await completeOAuthFromCallback();

      if (!result.ok) {
        console.error("Auth callback error:", result.error);
        setErrorMessage(result.error);
        setHasError(true);
        setTimeout(() => navigate("/welcome", { replace: true }), 4000);
        return;
      }

      const userId = result.session.user.id;
      const hasLocalData = !!localStorage.getItem("scoretarget_state");
      const hasCloudData = await checkUserData(userId);

      if (hasCloudData && !hasLocalData) {
        await restoreUserData(userId);
      }

      await navigateAfterAuthSession(navigate, userId);
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
          <p className="text-sm font-bold text-muted-foreground">
            {isRestoring ? t("restoringYourData") : t("signingIn")}
          </p>
        </>
      )}
    </div>
  );
};

export default AuthCallback;
