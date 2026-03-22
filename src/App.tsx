import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Simulator from "./pages/Simulator";
import Settings from "./pages/Settings";
import LibraryDirect from "./pages/LibraryDirect";
import PaperDetail from "./pages/PaperDetail";
import MyDownloads from "./pages/MyDownloads";
import SubjectDashboard from "./pages/SubjectDashboard";
import ExamPrep from "./pages/ExamPrep";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Onboarding — authenticated but no app data yet */}
            <Route path="/onboarding" element={<ProtectedRoute><Index /></ProtectedRoute>} />

            {/* Protected — requires auth + completed onboarding */}
            <Route path="/" element={<ProtectedRoute requireOnboarding><Home /></ProtectedRoute>} />
            <Route path="/planner" element={<ProtectedRoute requireOnboarding><Index /></ProtectedRoute>} />
            <Route path="/simulator" element={<ProtectedRoute requireOnboarding><Simulator /></ProtectedRoute>} />
            <Route path="/library" element={<ProtectedRoute requireOnboarding><LibraryDirect /></ProtectedRoute>} />
            <Route path="/library/:paperId" element={<ProtectedRoute requireOnboarding><PaperDetail /></ProtectedRoute>} />
            <Route path="/subject/:subjectName" element={<ProtectedRoute requireOnboarding><SubjectDashboard /></ProtectedRoute>} />
            <Route path="/exam-prep" element={<ProtectedRoute requireOnboarding><ExamPrep /></ProtectedRoute>} />
            <Route path="/my-downloads" element={<ProtectedRoute requireOnboarding><MyDownloads /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute requireOnboarding><Settings /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute requireOnboarding><Profile /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
