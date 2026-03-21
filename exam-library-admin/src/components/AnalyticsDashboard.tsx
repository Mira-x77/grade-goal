import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Download, TrendingUp, HardDrive, AlertTriangle } from 'lucide-react';
import { StorageAnalytics, DownloadAnalytics, BandwidthAnalytics } from '../types';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [storageData, setStorageData] = useState<StorageAnalytics | null>(null);
  const [downloadData, setDownloadData] = useState<DownloadAnalytics | null>(null);
  const [bandwidthData, setBandwidthData] = useState<BandwidthAnalytics[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Load storage analytics from exam_papers
      const { data: papers } = await supabase
        .from('exam_papers')
        .select('file_size, id, title, downloads, subject');

      const totalSize = papers?.reduce((sum, p) => sum + (p.file_size || 0), 0) || 0;
      setStorageData({
        id: 'storage',
        totalFiles: papers?.length || 0,
        totalSizeBytes: totalSize,
        lastUpdated: new Date()
      });

      // Build download analytics from papers
      const totalDownloads = papers?.reduce((sum, p) => sum + (p.downloads || 0), 0) || 0;
      const downloadsBySubject: Record<string, number> = {};
      papers?.forEach(p => {
        if (p.subject) downloadsBySubject[p.subject] = (downloadsBySubject[p.subject] || 0) + (p.downloads || 0);
      });
      const topPapers = [...(papers || [])]
        .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
        .slice(0, 10)
        .map(p => ({ paperId: p.id, title: p.title, downloads: p.downloads || 0 }));

      setDownloadData({ id: 'downloads', totalDownloads, downloadsBySubject, topPapers, lastUpdated: new Date() });
      setBandwidthData([]);
    } catch (error) {
      console.error('Failed to load analytics:', error);
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

  const storagePercentage = storageData
    ? (storageData.totalSizeBytes / (5 * 1024 * 1024 * 1024)) * 100
    : 0;

  const todayBandwidth = bandwidthData[0]?.bytesTransferred || 0;
  const bandwidthPercentage = (todayBandwidth / (1024 * 1024 * 1024)) * 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      {(storagePercentage > 90 || bandwidthPercentage > 90) && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-orange-900 mb-1">Resource Warning</h3>
              <ul className="text-sm text-orange-800 space-y-1">
                {storagePercentage > 90 && (
                  <li>• Storage is at {storagePercentage.toFixed(1)}% capacity</li>
                )}
                {bandwidthPercentage > 90 && (
                  <li>• Today's bandwidth is at {bandwidthPercentage.toFixed(1)}% of daily 1GB limit</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-green-50 p-3 rounded-lg">
            <Download className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-white text-xl">Total Downloads</h3>
            <p className="text-3xl font-bold text-white mt-1">
              {downloadData?.totalDownloads || 0}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-50 p-3 rounded-lg">
              <HardDrive className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Storage Usage</h3>
              <p className="text-sm text-gray-400">
                {formatBytes(storageData?.totalSizeBytes || 0)} / 5 GB
              </p>
            </div>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${storagePercentage > 90 ? 'bg-red-500' : 'bg-purple-500'}`}
              style={{ width: `${Math.min(storagePercentage, 100)}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 mt-2">
            {storagePercentage.toFixed(1)}% used • {storageData?.totalFiles || 0} files
          </p>
        </div>

        <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Today's Bandwidth</h3>
              <p className="text-sm text-gray-400">{formatBytes(todayBandwidth)} / 1 GB</p>
            </div>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${bandwidthPercentage > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(bandwidthPercentage, 100)}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 mt-2">
            {bandwidthPercentage.toFixed(1)}% used
          </p>
        </div>
      </div>

      {downloadData?.topPapers && downloadData.topPapers.length > 0 && (
        <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="font-bold text-white text-xl mb-4">Top 10 Most Downloaded Papers</h3>
          <div className="space-y-3">
            {downloadData.topPapers.map((paper, index) => (
              <div key={paper.paperId} className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{paper.title}</p>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Download className="h-4 w-4" />
                  <span className="font-semibold">{paper.downloads}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {downloadData?.downloadsBySubject && Object.keys(downloadData.downloadsBySubject).length > 0 && (
        <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-6">
          <h3 className="font-bold text-white text-xl mb-4">Downloads by Subject</h3>
          <div className="space-y-3">
            {Object.entries(downloadData.downloadsBySubject)
              .sort(([, a], [, b]) => b - a)
              .map(([subject, count]) => {
                const percentage = (count / (downloadData.totalDownloads || 1)) * 100;
                return (
                  <div key={subject}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-300">{subject}</span>
                      <span className="text-sm text-gray-400">{count} downloads</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
