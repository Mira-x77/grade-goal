import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({
  children,
  requireOnboarding = false,
}: {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}) {
  const { session, loading, syncing } = useAuth();

  console.log("ProtectedRoute state:", { loading, syncing, hasSession: !!session });

  if (loading || syncing) {
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

  const isDevBypass = import.meta.env.DEV && localStorage.getItem("dev_bypass") === "true";
  const isGuestMode = localStorage.getItem("guest_mode") === "true";

  if (!session && !isDevBypass && !isGuestMode) return <Navigate to="/welcome" replace />;

  if (requireOnboarding) {
    const raw = localStorage.getItem("scoretarget_state");
    let hasAppData = false;
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed) {
        const isNigerian = parsed?.settings?.gradingSystem === "nigerian_university";
        if (isNigerian) {
          // Nigerian users pass if: they have subjects, OR they have a studentName (completed basic info)
          hasAppData = (Array.isArray(parsed.subjects) && parsed.subjects.length > 0)
            || !!parsed.studentName;
        } else {
          hasAppData = Array.isArray(parsed.subjects) && parsed.subjects.length > 0;
        }
      }
    } catch {
      hasAppData = false;
    }
    if (!hasAppData) return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
