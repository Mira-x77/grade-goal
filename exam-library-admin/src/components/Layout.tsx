import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, LayoutDashboard, Upload, FileText, BarChart3, LogOut, Ticket, Sparkles, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSubscriptionPage = location.pathname === '/subscription-codes';

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/upload', icon: Upload, label: 'Upload' },
    { path: '/papers', icon: FileText, label: 'Papers' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/subscription-codes', icon: Ticket, label: 'Subscriptions' },
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
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-semibold">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64">
        {/* Top Header */}
        <div className="sticky top-0 z-40 bg-[#1a1d2e] border-b border-gray-800 px-8 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {location.pathname === '/' && 'Dashboard'}
            {location.pathname === '/upload' && 'Upload Papers'}
            {location.pathname === '/papers' && 'Manage Papers'}
            {location.pathname === '/analytics' && 'Analytics'}
            {location.pathname === '/subscription-codes' && 'Subscription Codes'}
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
