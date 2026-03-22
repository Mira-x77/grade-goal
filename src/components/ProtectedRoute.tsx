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

  if (!session) return <Navigate to="/auth" replace />;

  // If this route requires onboarding to be complete, check for app data
  if (requireOnboarding) {
    const hasAppData = !!localStorage.getItem("scoretarget_state");
    if (!hasAppData) return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
