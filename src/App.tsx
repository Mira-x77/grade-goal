import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppConfigProvider } from "@/contexts/AppConfigContext";
// AppConfigProvider must wrap routes inside AuthProvider (uses useAuth)
import ProtectedRoute from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import SplashScreen from "@/components/SplashScreen";
import { UpdateDialog } from "@/components/UpdateDialog";
import { ExternalPdfViewerHost } from "@/components/pdf/ExternalPdfViewerHost";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { useAppUpdates } from "@/composables/useAppUpdates";
import { useEffect, useRef, useState } from "react";
import { restoreFromNative } from "@/lib/nativeStorage";
import { Capacitor } from "@capacitor/core";
import { loadState } from "@/lib/storage";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import WelcomePage from "./pages/WelcomePage";
import SignInSuccess from "./pages/SignInSuccess";
import Home from "./pages/Home";
import Index from "./pages/Index";
import ExamPrep from "./pages/ExamPrep";
import Simulator from "./pages/Simulator";
import Settings from "./pages/Settings";
import LibraryDirect from "./pages/LibraryDirect";
import PaperDetail from "./pages/PaperDetail";
import BookDetail from "./pages/BookDetail";
import MyDownloads from "./pages/MyDownloads";
import BooksLibrary from "./pages/BooksLibrary";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import FeedbackBoard from "./pages/FeedbackBoard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import Debug from "./pages/Debug";
import FixState from "./pages/FixState";
import Courses from "./pages/Courses";
import HowToGetCode from "./pages/HowToGetCode";
import ScheduleManager from "./pages/ScheduleManager";

const queryClient = new QueryClient();

/** HashRouter is required on Capacitor Android — BrowserRouter breaks with https://localhost */
const AppRouter = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

/** Refresh book-packing reminders on native app open (rolling 4-week window). */
function ReminderRefreshInitializer() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    import("@/lib/notification-scheduler")
      .then(({ refreshRemindersIfNeeded }) => refreshRemindersIfNeeded())
      .catch(() => {});
  }, []);
  return null;
}

/** Analytics Initializer - Lazy load to not block app startup */
function AnalyticsInitializer() {
  const { user } = useAuth();

  useEffect(() => {
    // Delay analytics initialization slightly to not block app startup
    const timer = setTimeout(() => {
      import('@/services/analyticsService')
        .then(({ analyticsService }) => {
          const state = loadState();
          const gradingSystem = state?.settings?.gradingSystem || 'apc';
          
          analyticsService.initialize(user?.id || null, gradingSystem)
            .then(() => {
              console.log('📊 Analytics initialized');
            })
            .catch((error) => {
              console.warn('Analytics init failed (non-critical):', error);
            });

          // Cleanup on unmount
          return () => {
            analyticsService.endSession().catch(() => {});
          };
        })
        .catch((error) => {
          console.warn('Failed to load analytics module (non-critical):', error);
        });
    }, 500); // Reduced from 2000ms to 500ms

    return () => clearTimeout(timer);
  }, [user?.id]);

  return null; // No UI
}

/** First launch → Welcome. Guest/sign-in without data → Onboarding. Returning users → Home. */
function LandingRoute() {
  const { session, loading } = useAuth();
  const hasLocalData = !!localStorage.getItem("scoretarget_state");
  const isGuest = localStorage.getItem("guest_mode") === "true";

  if (loading && !hasLocalData && !isGuest) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Brand-new install — welcome / sign-up screen
  if (!hasLocalData && !isGuest && !session) {
    return <Navigate to="/welcome" replace />;
  }

  // Chose guest or signed in but hasn't finished setup yet
  if (!hasLocalData) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <ProtectedRoute requireOnboarding>
      <Home />
    </ProtectedRoute>
  );
}

// Runs inside router so hooks have full context
function AppInner() {
  useServiceWorkerUpdate();
  
  // Initialize app updates
  const {
    showUpdateDialog,
    availableUpdate,
    onUpdateDialogDismiss,
    onUpdateStarted,
    onUpdateCompleted
  } = useAppUpdates();

  return (
    <>
      <AuthProvider>
        <AnalyticsInitializer />
        <ReminderRefreshInitializer />
        <AppConfigProvider>
        <ErrorBoundary>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingRoute />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/success" element={<SignInSuccess />} />

            {/* Onboarding — open to guests and new sign-ins (no auth gate) */}
            <Route path="/onboarding" element={<Index />} />

            {/* Quiz / Exam Prep */}
            <Route path="/quiz" element={<ProtectedRoute requireOnboarding><ExamPrep /></ProtectedRoute>} />

            {/* Protected — requires auth + completed onboarding */}
            <Route path="/planner" element={<ProtectedRoute requireOnboarding><Index /></ProtectedRoute>} />
            <Route path="/simulator" element={<ProtectedRoute requireOnboarding><Simulator /></ProtectedRoute>} />
            <Route path="/library" element={<ProtectedRoute requireOnboarding><LibraryDirect /></ProtectedRoute>} />
            <Route path="/library/papers" element={<ProtectedRoute requireOnboarding><LibraryDirect /></ProtectedRoute>} />
            <Route path="/library/books" element={<ProtectedRoute requireOnboarding><BooksLibrary /></ProtectedRoute>} />
            <Route path="/library/:paperId" element={<ProtectedRoute requireOnboarding><PaperDetail /></ProtectedRoute>} />
            <Route path="/book/:bookId" element={<ProtectedRoute requireOnboarding><BookDetail /></ProtectedRoute>} />
            {/* Deep link entry point — /paper/:id redirects to /library/:id */}
            <Route path="/paper/:paperId" element={<ProtectedRoute requireOnboarding><PaperDetail /></ProtectedRoute>} />
            <Route path="/my-downloads" element={<ProtectedRoute requireOnboarding><MyDownloads /></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute requireOnboarding><Courses /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute requireOnboarding><Settings /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute requireOnboarding><Profile /></ProtectedRoute>} />
            <Route path="/schedule" element={<ProtectedRoute requireOnboarding><ScheduleManager /></ProtectedRoute>} />
            <Route path="/feedback" element={<ProtectedRoute requireOnboarding><FeedbackBoard /></ProtectedRoute>} />
            <Route path="/feedback-board" element={<ProtectedRoute requireOnboarding><FeedbackBoard /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
            {/* Public legal pages */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/premium/how-to-get-code" element={<HowToGetCode />} />
            {/* Debug page */}
            <Route path="/debug" element={<Debug />} />
            <Route path="/fix" element={<FixState />} />
          </Routes>
        </ErrorBoundary>
        {/* Must live inside Auth + AppConfig: phone PDFs are not library quota. */}
        <ExternalPdfViewerHost />
        </AppConfigProvider>
      </AuthProvider>

      {/* Update Dialog */}
      <UpdateDialog
        isOpen={showUpdateDialog}
        update={availableUpdate}
        onDismiss={onUpdateDialogDismiss}
        onUpdateStarted={onUpdateStarted}
        onUpdateCompleted={onUpdateCompleted}
      />
    </>
  );
}

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const nativeRestoreDoneRef = useRef(!Capacitor.isNativePlatform());

  // Kick off native storage restore immediately. The splash screen stays up
  // until both the animation finishes AND this completes, so routes never
  // read an empty localStorage because Preferences hadn't been copied yet.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    restoreFromNative()
      .catch((error) => {
        console.error("Failed to restore native storage:", error);
      })
      .finally(() => {
        nativeRestoreDoneRef.current = true;
      });
  }, []);

  // Dismiss splash only after both conditions are met.
  // If the animation finishes before restore, poll every 50ms (restore is
  // typically <200ms; worst case the splash lingers a fraction of a second).
  const handleSplashComplete = () => {
    if (nativeRestoreDoneRef.current) {
      setShowSplash(false);
    } else {
      const interval = setInterval(() => {
        if (nativeRestoreDoneRef.current) {
          clearInterval(interval);
          setShowSplash(false);
        }
      }, 50);
    }
  };

  if (showSplash) {
    return (
      <AppThemeProvider>
        <SplashScreen
          onComplete={handleSplashComplete}
          isFirstLaunch={false} // Use quick splash
        />
      </AppThemeProvider>
    );
  }

  return (
    <AppThemeProvider>
      <LanguageProvider>
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
              <Sonner 
                position="top-center" 
                offset={0}
                style={{
                  top: 'calc(env(safe-area-inset-top) + 8px)'
                }}
              />
              <AppRouter>
                <AppInner />
              </AppRouter>
            </TooltipProvider>
          </QueryClientProvider>
      </LanguageProvider>
    </AppThemeProvider>
  );
};

export default App;
