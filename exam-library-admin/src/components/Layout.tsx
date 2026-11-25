import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, LayoutDashboard, Upload, FileText, BarChart3, Ticket, Bell, Settings, Sparkles, GraduationCap, Lightbulb, Smartphone, Users, AlertTriangle, Cloud, Database } from 'lucide-react';
import { hasServiceRoleKey } from '../lib/supabaseClient';
import { getR2Diagnostics } from '../lib/r2Client';
import { useStorageTarget } from '../lib/storage-target';
import { useSupabaseStatus } from '../lib/supabase-status';
import SupabaseNotice from './SupabaseNotice';

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSubscriptionPage = location.pathname === '/subscription-codes';
  const r2 = getR2Diagnostics();
  const [target] = useStorageTarget();
  const supabaseStatus = useSupabaseStatus();
  const pageHasOwnNotice =
    location.pathname === '/' ||
    location.pathname === '/papers' ||
    location.pathname === '/analytics';

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/upload', icon: Upload, label: 'Upload' },
    { path: '/papers', icon: FileText, label: 'Library' },
    { path: '/courses', icon: GraduationCap, label: 'Feeds / Actus' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/notifications', icon: Bell, label: 'Notifications' },
    { path: '/feedback', icon: Lightbulb, label: 'Feedback' },
    { path: '/app-updates', icon: Smartphone, label: 'App Updates' },
    { path: '/subscription-codes', icon: Ticket, label: 'Subscriptions' },
    { path: '/users', icon: Users, label: 'Students' },
    { path: '/app-settings', icon: Settings, label: 'App Settings' },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-[#1a1d2e] border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 p-2 rounded-lg">
              <BookOpen className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">Exam Library</h1>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isSubscription = item.path === '/subscription-codes';
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  isSubscription
                    ? `flex items-center gap-3 px-4 py-3 rounded-lg transition-all transform hover:scale-105 ${
                        isActive
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
                          : 'bg-gradient-to-r from-yellow-500/80 to-orange-500/80 text-white hover:from-yellow-500 hover:to-orange-500 shadow-md'
                      }`
                    : `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="font-semibold">{item.label}</span>
                {isSubscription && (
                  <Sparkles className="h-4 w-4 ml-auto animate-pulse" />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <span className="text-sm font-bold text-indigo-400">
                {user?.email?.[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-200 truncate">{user?.email}</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
          <p className="px-4 py-2 text-xs text-gray-500">
            Local admin tool — no sign-in required
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64">
        {/* Top Header */}
        <div className="sticky top-0 z-40 bg-[#1a1d2e] border-b border-gray-800 px-8 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {location.pathname === '/' && 'Dashboard'}
            {location.pathname === '/upload' && 'Upload Papers'}
            {location.pathname === '/papers' && 'Manage Library'}
            {location.pathname === '/courses' && 'Feeds / Actus'}
            {location.pathname === '/analytics' && 'Analytics'}
            {location.pathname === '/notifications' && 'Notifications'}
            {location.pathname === '/feedback' && 'Feedback Management'}
            {location.pathname === '/app-updates' && 'App Updates'}
            {location.pathname === '/subscription-codes' && 'Subscription Codes'}
            {location.pathname === '/users' && 'Students & Accounts'}
            {location.pathname === '/app-settings' && 'App Settings'}
          </h2>

          {!isSubscriptionPage && (
            <button
              onClick={() => navigate('/subscription-codes')}
              className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <Sparkles className="h-5 w-5" />
              <span>Premium Codes</span>
              <Ticket className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="p-8">
          {!hasServiceRoleKey() && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-100">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-400" />
              <div className="text-sm">
                <p className="font-semibold text-amber-200">Service role key missing</p>
                <p className="mt-1 text-amber-100/90">
                  Add <code className="rounded bg-black/30 px-1">VITE_SUPABASE_SERVICE_ROLE_KEY</code> to{' '}
                  <code className="rounded bg-black/30 px-1">exam-library-admin/.env</code> (Supabase → Settings → API → service_role), then restart the dev server. Without it, Students and device counts won&apos;t load.
                </p>
              </div>
            </div>
          )}

          <div
            className={`mb-6 flex items-start gap-3 rounded-lg border px-4 py-3 ${
              !r2.configured
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                : target === 'r2'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                  : 'border-sky-500/40 bg-sky-500/10 text-sky-100'
            }`}
          >
            {!r2.configured ? (
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-400" />
            ) : target === 'r2' ? (
              <Cloud className="h-5 w-5 shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <Database className="h-5 w-5 shrink-0 mt-0.5 text-sky-400" />
            )}
            <div className="text-sm">
              <p className="font-semibold">
                Upload destination: {!r2.configured ? 'Supabase Storage' : target === 'r2' ? 'Cloudflare R2' : 'Supabase Storage'}
              </p>
              <p
                className={`mt-1 ${
                  !r2.configured
                    ? 'text-amber-100/90'
                    : target === 'r2'
                      ? 'text-emerald-100/90'
                      : 'text-sky-100/90'
                }`}
              >
                {!r2.configured ? (
                  <>
                    R2 is not configured yet. Add{' '}
                    <code className="rounded bg-black/30 px-1">VITE_R2_ACCOUNT_ID</code>,{' '}
                    <code className="rounded bg-black/30 px-1">VITE_R2_ACCESS_KEY_ID</code>,{' '}
                    <code className="rounded bg-black/30 px-1">VITE_R2_SECRET_ACCESS_KEY</code> and{' '}
                    <code className="rounded bg-black/30 px-1">VITE_R2_PUBLIC_URL</code> to{' '}
                    <code className="rounded bg-black/30 px-1">exam-library-admin/.env</code>, then restart the dev server.
                  </>
                ) : (
                  <>
                    You can switch destination before each upload. Bucket{' '}
                    <code className="rounded bg-black/30 px-1">{r2.bucket}</code> · public base{' '}
                    <code className="rounded bg-black/30 px-1">{r2.publicUrl}</code>
                  </>
                )}
              </p>
              {supabaseStatus === 'restricted' && (
                <p className="mt-1 font-semibold text-amber-200">
                  New uploads are blocked: the PDF can be stored in R2, but the database
                  row cannot be created until Supabase is upgraded.
                </p>
              )}
            </div>
          </div>

          {!pageHasOwnNotice && <SupabaseNotice status={supabaseStatus} className="mb-6" />}

          <Outlet />
        </div>

        {!isSubscriptionPage && (
          <button
            onClick={() => navigate('/subscription-codes')}
            className="fixed bottom-8 right-8 z-50 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 hover:from-yellow-500 hover:via-yellow-600 hover:to-orange-600 text-white p-4 rounded-full shadow-2xl transition-all transform hover:scale-110 group"
            title="Manage Subscription Codes"
          >
            <div className="relative">
              <Ticket className="h-7 w-7" />
              <Sparkles className="h-4 w-4 absolute -top-1 -right-1 text-yellow-200 animate-pulse" />
            </div>
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Premium Codes
            </span>
          </button>
        )}
      </main>
    </div>
  );
}
