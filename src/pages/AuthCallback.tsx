import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const hasAppData = !!localStorage.getItem("scoretarget_state");
        navigate(hasAppData ? "/" : "/onboarding", { replace: true });
      } else {
        navigate("/auth", { replace: true });
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
}
