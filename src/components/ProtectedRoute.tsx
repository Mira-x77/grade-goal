import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { loadState } from "@/lib/storage";

export default function ProtectedRoute({
  children,
  requireOnboarding = false,
}: {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}) {
  const { session, loading, syncing } = useAuth();

  const isDevBypass = import.meta.env.DEV && localStorage.getItem("dev_bypass") === "true";
  const isGuestMode = localStorage.getItem("guest_mode") === "true";
  const hasLocalData = !!localStorage.getItem("scoretarget_state");

  // If we have local data or guest mode, render immediately — don't wait for session.
  // Session check happens in background (WhatsApp-style).
  const canPassThrough = hasLocalData || isGuestMode || isDevBypass;

  // Only show loading spinner if we have no local data AND session is still loading
  if (!canPassThrough && (loading || syncing)) {
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

  // No local data, not guest, session check done — redirect to welcome
  if (!canPassThrough && !session) return <Navigate to="/welcome" replace />;

  if (requireOnboarding) {
    const raw = localStorage.getItem("scoretarget_state");
    let hasAppData = false;
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed) {
        const isNigerian = parsed?.settings?.gradingSystem === "nigerian_university";
        if (isNigerian) {
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
