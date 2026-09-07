import { useState, useEffect } from 'react';
import { BarChart3, Users, Clock, Eye, Download, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { format, subDays } from 'date-fns';

interface DailyStats {
  date: string;
  sessions: number;
  unique_users: number;
  total_hours: number;
  page_views: number;
  events: number;
  downloads: number;
}

interface PageStats {
  page_name: string;
  views: number;
  avg_duration: number;
}

interface EventStats {
  event_type: string;
  event_name: string;
  count: number;
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(7); // Last 7 days
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [pageStats, setPageStats] = useState<PageStats[]>([]);
  const [eventStats, setEventStats] = useState<EventStats[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalSessions: 0,
    totalUsers: 0,
    totalHours: 0,
    avgSessionDuration: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch daily stats
      const startDate = format(subDays(new Date(), dateRange), 'yyyy-MM-dd');
      
      const { data: daily } = await supabase.rpc('get_analytics_summary', {
        start_date: startDate,
        end_date: format(new Date(), 'yyyy-MM-dd')
      });

      if (daily) {
        setDailyStats(daily);
        
        // Calculate totals
        const totals = daily.reduce((acc: any, day: any) => {
          acc.totalSessions += day.sessions || 0;
          acc.totalUsers = Math.max(acc.totalUsers, day.unique_users || 0);
          acc.totalHours += day.total_hours || 0;
          return acc;
        }, { totalSessions: 0, totalUsers: 0, totalHours: 0 });
        
        totals.avgSessionDuration = totals.totalSessions > 0 
          ? (totals.totalHours * 60) / totals.totalSessions 
          : 0;
        
        setTotalStats(totals);
      }

      // Fetch page stats
      const { data: pages } = await supabase
        .from('page_views')
        .select('page_name, view_duration_seconds')
        .gte('viewed_at', startDate);

      if (pages) {
        const pageMap = new Map<string, { count: number; totalDuration: number }>();
        
        pages.forEach((view: any) => {
          const existing = pageMap.get(view.page_name) || { count: 0, totalDuration: 0 };
          pageMap.set(view.page_name, {
            count: existing.count + 1,
            totalDuration: existing.totalDuration + (view.view_duration_seconds || 0)
          });
        });

        const pageStatsArray = Array.from(pageMap.entries()).map(([page_name, stats]) => ({
          page_name,
          views: stats.count,
          avg_duration: stats.count > 0 ? stats.totalDuration / stats.count : 0
        }));

        setPageStats(pageStatsArray.sort((a, b) => b.views - a.views));
      }

      // Fetch event stats
      const { data: events } = await supabase
        .from('event_tracking')
        .select('event_type, event_name')
        .gte('occurred_at', startDate);

      if (events) {
        const eventMap = new Map<string, number>();
        
        events.forEach((event: any) => {
          const key = `${event.event_type}:${event.event_name}`;
          eventMap.set(key, (eventMap.get(key) || 0) + 1);
        });

        const eventStatsArray = Array.from(eventMap.entries()).map(([key, count]) => {
          const [event_type, event_name] = key.split(':');
          return { event_type, event_name, count };
        });

        setEventStats(eventStatsArray.sort((a, b) => b.count - a.count).slice(0, 10));
      }

    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-400" />
            Analytics Dashboard
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            App usage statistics and user behavior
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex gap-2">
          {[7, 14, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setDateRange(days)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                dateRange === days
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#1a1d29] text-gray-300 hover:bg-[#22252f]'
              }`}
            >
              Last {days}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-8 w-8 text-blue-400" />
                <TrendingUp className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {totalStats.totalUsers}
              </div>
              <div className="text-sm text-blue-200">Unique Users</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="h-8 w-8 text-purple-400" />
                <TrendingUp className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {totalStats.totalSessions}
              </div>
              <div className="text-sm text-purple-200">Total Sessions</div>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-8 w-8 text-green-400" />
                <TrendingUp className="h-4 w-4 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {totalStats.totalHours.toFixed(1)}h
              </div>
              <div className="text-sm text-green-200">Total Time Spent</div>
            </div>

            <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="h-8 w-8 text-orange-400" />
                <TrendingUp className="h-4 w-4 text-orange-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {totalStats.avgSessionDuration.toFixed(0)}m
              </div>
              <div className="text-sm text-orange-200">Avg Session Duration</div>
            </div>
          </div>

          {/* Daily Chart */}
          <div className="bg-[#1a1d29] border border-gray-700 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-400" />
              Daily Activity
            </h2>
            <div className="space-y-3">
              {dailyStats.map((day) => (
                <div key={day.date} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-gray-400">
                    {format(new Date(day.date), 'MMM dd')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div 
                        className="h-8 bg-indigo-600 rounded"
                        style={{ width: `${(day.sessions / Math.max(...dailyStats.map(d => d.sessions))) * 100}%` }}
                      />
                      <span className="text-sm font-semibold text-white">{day.sessions} sessions</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {day.unique_users} users • {day.total_hours.toFixed(1)}h total
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Visited Pages */}
            <div className="bg-[#1a1d29] border border-gray-700 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Eye className="h-5 w-5 text-purple-400" />
                Most Visited Pages
              </h2>
              <div className="space-y-3">
                {pageStats.slice(0, 10).map((page, index) => (
                  <div key={page.page_name} className="flex items-center gap-3">
                    <div className="w-6 text-sm font-bold text-gray-500">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-white capitalize">
                          {page.page_name}
                        </span>
                        <span className="text-sm text-gray-400">{page.views} views</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Avg duration: {formatDuration(page.avg_duration)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Events */}
            <div className="bg-[#1a1d29] border border-gray-700 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Download className="h-5 w-5 text-green-400" />
                Top Events
              </h2>
              <div className="space-y-3">
                {eventStats.map((event, index) => (
                  <div key={`${event.event_type}:${event.event_name}`} className="flex items-center gap-3">
                    <div className="w-6 text-sm font-bold text-gray-500">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold text-white">
                            {event.event_name}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({event.event_type})
                          </span>
                        </div>
                        <span className="text-sm text-gray-400">{event.count}×</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
