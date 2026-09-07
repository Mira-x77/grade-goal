import { useState, useEffect } from 'react';
import { Lightbulb, Trash2, Loader2, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, supabaseAdmin } from '../lib/supabaseClient';
import { format } from 'date-fns';

interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  user_id: string;
  status: 'under_review' | 'planned' | 'in_progress' | 'completed';
  grading_system: string;
  created_at: string;
  vote_count: number;
}

const STATUS_OPTIONS = [
  { value: 'under_review', label: 'Under Review', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'planned', label: 'Planned', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500/20 text-green-400' },
];

const GRADING_SYSTEMS = ['All', 'apc', 'french', 'nigerian_university'];

export default function Feedback() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [systemFilter, setSystemFilter] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feedback_with_votes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedback(data || []);
    } catch (err: any) {
      toast.error('Failed to load feedback: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    try {
      // Use service role for admin operations
      const { error } = await supabaseAdmin
        .from('feedback')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      
      setFeedback(prev => prev.filter(item => item.id !== id));
      toast.success('Feedback deleted successfully');
    } catch (err: any) {
      console.error('Failed to delete feedback:', err);
      toast.error('Failed to delete feedback: ' + (err.message || 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabaseAdmin
        .from('feedback')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      setFeedback(prev => prev.map(item => 
        item.id === id ? { ...item, status: newStatus as any } : item
      ));
      toast.success('Status updated successfully');
    } catch (err: any) {
      toast.error('Failed to update status: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
    return statusOption?.color || 'bg-gray-500/20 text-gray-400';
  };

  const getStatusLabel = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
    return statusOption?.label || status;
  };

  const filteredFeedback = feedback.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchesSystem = systemFilter === 'All' || item.grading_system === systemFilter;
    
    return matchesSearch && matchesStatus && matchesSystem;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-yellow-400" />
            Feedback Management
          </h1>
          <p className="text-gray-400 mt-1">Manage user ideas and feature requests</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
        >
          <Filter className="h-5 w-5" />
          Filters
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search feedback..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[#0f1117] border border-gray-700 text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#1a1d2e] rounded-lg border border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Statuses</option>
                {STATUS_OPTIONS.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">System</label>
              <select
                value={systemFilter}
                onChange={(e) => setSystemFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {GRADING_SYSTEMS.map(system => (
                  <option key={system} value={system}>
                    {system === 'All' ? 'All Systems' : system.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATUS_OPTIONS.map(status => {
          const count = feedback.filter(item => item.status === status.value).length;
          return (
            <div key={status.value} className="bg-[#1a1d2e] rounded-xl border border-gray-800 p-4">
              <div className={`inline-flex px-2 py-1 rounded text-xs font-bold ${status.color} mb-2`}>
                {status.label}
              </div>
              <p className="text-2xl font-bold text-white">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Feedback List */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          All Feedback
          <span className="ml-2 text-sm font-normal text-gray-400">({filteredFeedback.length})</span>
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="text-center py-12 bg-[#1a1d2e] rounded-xl border border-gray-800">
            <Lightbulb className="h-10 w-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No feedback found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFeedback.map(item => (
              <div
                key={item.id}
                className="bg-[#1a1d2e] rounded-xl border border-gray-700 p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-white text-lg">{item.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-bold bg-gray-700 text-gray-300">
                        {item.grading_system.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed mb-3">{item.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>👍 {item.vote_count} votes</span>
                      <span>{format(new Date(item.created_at), 'MMM d, yyyy')}</span>
                      <span>ID: {item.user_id.slice(0, 8)}...</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
                  {/* Status Update */}
                  <select
                    value={item.status}
                    onChange={(e) => handleStatusUpdate(item.id, e.target.value)}
                    disabled={updatingId === item.id}
                    className="px-3 py-2 bg-[#0f1117] border border-gray-600 text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>

                  <div className="flex-1" />

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete feedback"
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}