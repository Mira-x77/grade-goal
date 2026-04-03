import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({
  children,
  requireOnboarding = false,
}: {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const isDevBypass = import.meta.env.DEV && localStorage.getItem("dev_bypass") === "true";

  if (!session && !isDevBypass) return <Navigate to="/auth" replace />;

  // requireOnboarding routes: redirect to onboarding if not set up
  if (requireOnboarding) {
    const raw = localStorage.getItem("scoretarget_state");
    let hasAppData = false;
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      hasAppData = parsed && Array.isArray(parsed.subjects) && parsed.subjects.length > 0;
    } catch {
      hasAppData = false;
    }
    if (!hasAppData) return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
