import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';

// Lazy load admin panel routes for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Upload = lazy(() => import('./pages/Upload'));
const Papers = lazy(() => import('./pages/Papers'));
const Courses = lazy(() => import('./pages/Courses'));
const Analytics = lazy(() => import('./pages/Analytics'));
const SubscriptionCodes = lazy(() => import('./pages/SubscriptionCodes'));
const Debug = lazy(() => import('./pages/Debug'));
const AppSettings = lazy(() => import('./pages/AppSettings'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Feedback = lazy(() => import('./pages/Feedback'));
const AppUpdates = lazy(() => import('./pages/AppUpdates'));
const Users = lazy(() => import('./pages/Users'));

// Loading fallback for lazy-loaded routes
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="upload" element={<Upload />} />
              <Route path="papers" element={<Papers />} />
              <Route path="courses" element={<Courses />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="subscription-codes" element={<SubscriptionCodes />} />
              <Route path="users" element={<Users />} />
              <Route path="debug" element={<Debug />} />
              <Route path="app-settings" element={<AppSettings />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="feedback" element={<Feedback />} />
              <Route path="app-updates" element={<AppUpdates />} />
            </Route>
            {/* No sign-in screen: old /login links (bookmarks, the previous
                logout button) land on the dashboard instead. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
