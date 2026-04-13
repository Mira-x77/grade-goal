import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    const checkUserData = async (userId: string): Promise<boolean> => {
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

    const restoreUserData = async (userId: string): Promise<void> => {
      try {
        console.log("AuthCallback: Restoring user data from cloud...");
        setIsRestoring(true);
        const { restoreUserData: restore } = await import("@/services/hybridSyncService");
        await restore(userId);
        console.log("AuthCallback: Data restored successfully");
      } catch (err) {
        console.error("AuthCallback: Failed to restore user data:", err);
      } finally {
        setIsRestoring(false);
      }
    };

    const handleCallback = async () => {
      // Check if we have tokens in the hash (implicit flow)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        // Implicit flow - set session directly from hash tokens
        const { error, data } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (error) {
          console.error("Auth callback error:", error.message);
          navigate("/auth", { replace: true });
        } else {
          // Check both local data and cloud data
          const hasLocalData = !!localStorage.getItem('scoretarget_state');
          const hasCloudData = data.session?.user ? await checkUserData(data.session.user.id) : false;
          
          // If user has cloud data but no local data, restore it first
          if (hasCloudData && !hasLocalData && data.session?.user) {
            await restoreUserData(data.session.user.id);
          }
          
          // Now check again after potential restore
          const hasDataNow = !!localStorage.getItem('scoretarget_state');
          
          // Navigate based on whether we have data
          navigate((hasDataNow || hasCloudData) ? "/auth/success" : "/onboarding", { replace: true });
        }
        return;
      }
      
      // Otherwise try PKCE flow with code parameter
      const { error, data } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (error) {
        console.error("Auth callback error:", error.message);
        
        // If PKCE verifier is missing, redirect to retry auth
        if (error.message.includes("code verifier")) {
          await supabase.auth.signOut();
        }
        
        navigate("/auth", { replace: true });
      } else {
        // Check both local data and cloud data
        const hasLocalData = !!localStorage.getItem('scoretarget_state');
        const hasCloudData = data.session?.user ? await checkUserData(data.session.user.id) : false;
        
        // If user has cloud data but no local data, restore it first
        if (hasCloudData && !hasLocalData && data.session?.user) {
          await restoreUserData(data.session.user.id);
        }
        
        // Now check again after potential restore
        const hasDataNow = !!localStorage.getItem('scoretarget_state');
        
        // Navigate based on whether we have data
        navigate((hasDataNow || hasCloudData) ? "/auth/success" : "/onboarding", { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      <p className="text-sm font-bold text-muted-foreground">
        {isRestoring ? t("restoringYourData") : t("signingIn")}
      </p>
    </div>
  );
};

export default AuthCallback;
