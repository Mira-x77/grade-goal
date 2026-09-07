import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { clearAuthJustCompleted, isAuthJustCompleted } from "@/lib/auth-config";

export default function ProtectedRoute({
  children,
  requireOnboarding = false,
}: {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}) {
  const { session, loading, syncing } = useAuth();
  const [directSession, setDirectSession] = useState<boolean | null>(null);

  const isDevBypass = import.meta.env.DEV && localStorage.getItem("dev_bypass") === "true";
  const isGuestMode = localStorage.getItem("guest_mode") === "true";
  const hasLocalData = !!localStorage.getItem("scoretarget_state");
  const authJustCompleted = isAuthJustCompleted();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setDirectSession(!!s);
    });
  }, []);

  useEffect(() => {
    if (session) clearAuthJustCompleted();
  }, [session]);

  const hasSession = !!session || directSession === true;
  const canPassThrough =
    hasLocalData || isGuestMode || isDevBypass || hasSession || authJustCompleted;

  if (!canPassThrough && (loading || syncing || directSession === null)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        {syncing && (
          <p className="text-xs font-bold text-muted-foreground animate-pulse">
            Restoring your data…
          </p>
        )}
      </div>
    );
  }

  if (!canPassThrough) {
    return <Navigate to="/welcome" replace />;
  }

  if (requireOnboarding) {
    const raw = localStorage.getItem("scoretarget_state");
    let hasCompletedOnboarding = false;
    try {
      const parsed = raw ? JSON.parse(raw) : null;

      if (parsed) {
        if (parsed.onboarding_completed === true) {
          hasCompletedOnboarding = true;
        } else if (
          typeof parsed.studentName === "string" &&
          parsed.studentName.trim().length > 0 &&
          parsed.settings?.gradingSystem
        ) {
          hasCompletedOnboarding = true;
        }
      }
    } catch {
      hasCompletedOnboarding = false;
    }

    if (!hasCompletedOnboarding) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return <>{children}</>;
}
