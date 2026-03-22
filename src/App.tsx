import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
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

            {/* Protected */}
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/planner" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/simulator" element={<ProtectedRoute><Simulator /></ProtectedRoute>} />
            <Route path="/library" element={<ProtectedRoute><LibraryDirect /></ProtectedRoute>} />
            <Route path="/library/:paperId" element={<ProtectedRoute><PaperDetail /></ProtectedRoute>} />
            <Route path="/subject/:subjectName" element={<ProtectedRoute><SubjectDashboard /></ProtectedRoute>} />
            <Route path="/exam-prep" element={<ProtectedRoute><ExamPrep /></ProtectedRoute>} />
            <Route path="/my-downloads" element={<ProtectedRoute><MyDownloads /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
