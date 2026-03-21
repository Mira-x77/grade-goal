import AnalyticsDashboard from '../components/AnalyticsDashboard';

export default function Analytics() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Monitor downloads, storage, and bandwidth</p>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}
