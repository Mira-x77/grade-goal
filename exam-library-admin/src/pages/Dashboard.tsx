import { useEffect, useState } from 'react';
import { FileText, Download, HardDrive, TrendingUp, Upload, BarChart3, AlertTriangle, Ticket, Sparkles } from 'lucide-react';
import { ExamPaper } from '../types';
import { adminService } from '../services/adminService';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalPapers: 0, totalDownloads: 0, storageUsed: 0, todayDownloads: 0 });
  const [recentUploads, setRecentUploads] = useState<ExamPaper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const papers = await adminService.getAllPapers();
      const downloadData = await adminService.getDownloadAnalytics();
      const storageData = await adminService.getStorageAnalytics();
      const today = new Date().toISOString().split('T')[0];
      const bandwidthData = await adminService.getBandwidthUsage(today);
      setStats({
        totalPapers: papers.length,
        totalDownloads: downloadData.totalDownloads,
        storageUsed: storageData.totalSizeBytes,
        todayDownloads: bandwidthData.downloadCount,
      });
      setRecentUploads(papers.slice(0, 5));
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const storagePercentage = (stats.storageUsed / (1024 * 1024 * 1024)) * 100;

  const statCards = [
    { title: 'Total Papers', value: stats.totalPapers, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: 'Total Downloads', value: stats.totalDownloads, icon: Download, color: 'text-green-400', bg: 'bg-green-500/10' },
    { title: 'Storage Used', value: formatBytes(stats.storageUsed), subtitle: '/ 1 GB', icon: HardDrive, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { title: "Today's Downloads", value: stats.todayDownloads, icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of your exam library</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <div key={card.title} className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-6 card-shadow">
            <div className={`${card.bg} p-3 rounded-lg w-fit mb-4`}>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
            <h3 className="text-gray-400 text-sm font-semibold mb-1">{card.title}</h3>
            <p className="text-3xl font-bold text-white">
              {card.value}
              {'subtitle' in card && card.subtitle && (
                <span className="text-lg text-gray-500 ml-1">{card.subtitle}</span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Premium Codes Feature */}
      <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="bg-yellow-500/20 p-3 rounded-xl">
            <Sparkles className="h-8 w-8 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Premium Subscription Codes</h2>
            <p className="text-gray-400 mb-4">Generate codes to sell premium subscriptions. Track usage and manage all codes in one place.</p>
            <a
              href="/subscription-codes"
              className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              <Ticket className="h-5 w-5" />
              Manage Subscription Codes
            </a>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { href: '/upload', icon: Upload, title: 'Upload Paper', desc: 'Add new exam paper' },
            { href: '/papers', icon: FileText, title: 'Manage Papers', desc: 'View and edit papers' },
            { href: '/analytics', icon: BarChart3, title: 'View Analytics', desc: 'Check statistics' },
          ].map(({ href, icon: Icon, title, desc }) => (
            <a key={href} href={href} className="flex items-center gap-3 p-4 border border-gray-700 rounded-lg hover:border-indigo-500 hover:bg-indigo-500/5 transition-colors">
              <Icon className="h-6 w-6 text-indigo-400" />
              <div>
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Recent Uploads */}
      <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Recent Uploads</h2>
        {recentUploads.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No recent uploads</p>
        ) : (
          <div className="space-y-3">
            {recentUploads.map((paper) => (
              <div key={paper.id} className="flex items-center justify-between p-3 border border-gray-800 rounded-lg hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <div>
                    <h3 className="font-medium text-white">{paper.title}</h3>
                    <p className="text-sm text-gray-500">{paper.subject} • {paper.classLevel}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">{formatTimeAgo(paper.uploadDate)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Storage Warning */}
      {storagePercentage >= 80 && (
        <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-300">Storage Warning</h3>
              <p className="text-sm text-orange-400/80 mt-1">
                You are at {storagePercentage.toFixed(1)}% of the 1GB storage limit.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
