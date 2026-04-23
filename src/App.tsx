import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppConfigProvider } from "@/contexts/AppConfigContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import React from "react";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { useEffect, useState } from "react";
import { restoreFromNative } from "@/lib/nativeStorage";
import { Capacitor } from "@capacitor/core";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import WelcomePage from "./pages/WelcomePage";
import SignInSuccess from "./pages/SignInSuccess";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Simulator from "./pages/Simulator";
import Settings from "./pages/Settings";
import LibraryDirect from "./pages/LibraryDirect";
import PaperDetail from "./pages/PaperDetail";
import MyDownloads from "./pages/MyDownloads";
import SubjectDashboard from "./pages/SubjectDashboard";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import FeedbackBoard from "./pages/FeedbackBoard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";

const queryClient = new QueryClient();

// Runs inside BrowserRouter so hooks have full context
function AppInner() {
  useServiceWorkerUpdate();
  return null;
}

const App = () => {
  // On web, start ready immediately — restoreFromNative is a no-op on web
  const [ready, setReady] = useState(!Capacitor.isNativePlatform());

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      restoreFromNative().finally(() => setReady(true));
    }
  }, []);

  if (!ready) return null;

  return (
  <AppThemeProvider>
    <LanguageProvider>
      <AppConfigProvider>
      <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* SVG filter for hand-drawn wobbly borders — referenced via CSS filter: url(#sketchy) */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="sketchy">
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="3" result="noise" seed="2" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <Toaster />
      <Sonner position="top-center" style={{ "--offset": "max(3.5rem, calc(env(safe-area-inset-top) + 1rem))" } as React.CSSProperties} />
      <BrowserRouter>
        <AppInner />
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/success" element={<SignInSuccess />} />

            {/* Onboarding — authenticated but no app data yet */}
            <Route path="/onboarding" element={<ProtectedRoute><Index /></ProtectedRoute>} />

            {/* Protected — requires auth + completed onboarding */}
            <Route path="/" element={<ProtectedRoute requireOnboarding><Home /></ProtectedRoute>} />
            <Route path="/planner" element={<ProtectedRoute requireOnboarding><Index /></ProtectedRoute>} />
            <Route path="/simulator" element={<ProtectedRoute requireOnboarding><Simulator /></ProtectedRoute>} />
            <Route path="/library" element={<ProtectedRoute requireOnboarding><LibraryDirect /></ProtectedRoute>} />
            <Route path="/library/:paperId" element={<ProtectedRoute requireOnboarding><PaperDetail /></ProtectedRoute>} />
            {/* Deep link entry point — /paper/:id redirects to /library/:id */}
            <Route path="/paper/:paperId" element={<ProtectedRoute requireOnboarding><PaperDetail /></ProtectedRoute>} />
            <Route path="/subject/:subjectName" element={<ProtectedRoute requireOnboarding><SubjectDashboard /></ProtectedRoute>} />
            <Route path="/my-downloads" element={<ProtectedRoute requireOnboarding><MyDownloads /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute requireOnboarding><Settings /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute requireOnboarding><Profile /></ProtectedRoute>} />
            <Route path="/feedback" element={<ProtectedRoute requireOnboarding><FeedbackBoard /></ProtectedRoute>} />
            <Route path="/feedback-board" element={<ProtectedRoute requireOnboarding><FeedbackBoard /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
            {/* Public legal pages */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsAndConditions />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </QueryClientProvider>
    </AppConfigProvider>
    </LanguageProvider>
  </AppThemeProvider>
  );
};

export default App;
