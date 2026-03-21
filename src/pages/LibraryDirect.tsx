import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Download, Search, Eye, Filter, X } from 'lucide-react';
import { cacheService } from '@/services/cacheService';
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge';
import { SubscriptionDetailDialog } from '@/components/subscription/SubscriptionDetailDialog';
import { PremiumCodeDialog } from '@/components/subscription/PremiumCodeDialog';
import { Loader } from '@/components/ui/loader';

const supabaseUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function LibraryDirect() {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [downloadedPaperIds, setDownloadedPaperIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    classLevel: '',
    subject: '',
    year: '',
    examType: ''
  });
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);

  useEffect(() => {
    loadPapers();
    loadDownloadedPapers();
  }, []);

  const loadDownloadedPapers = async () => {
    const cachedPapers = await cacheService.getCachedPapers();
    const downloaded = new Set(
      cachedPapers.filter(p => p.isDownloaded).map(p => p.id)
    );
    setDownloadedPaperIds(downloaded);
  };

  const loadPapers = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 Fetching from Supabase...');

      const { data, error: fetchError } = await supabase
        .from('exam_papers')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📊 Response:', { data, error: fetchError });

      if (fetchError) {
        setError(`Error: ${fetchError.message}`);
        console.error('❌ Fetch error:', fetchError);
        return;
      }

      if (!data || data.length === 0) {
        setError('No papers found in database');
        setPapers([]);
        return;
      }

      console.log('✅ Loaded papers:', data);
      setPapers(data);
    } catch (err) {
      console.error('❌ Exception:', err);
      setError(`Exception: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredPapers = papers.filter(p => {
    // Hide downloaded papers - they should only appear in MyDownloads
    if (downloadedPaperIds.has(p.id)) return false;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        p.title?.toLowerCase().includes(query) ||
        p.subject?.toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }

    // Class level filter
    if (filters.classLevel && p.class_level !== filters.classLevel) return false;

    // Subject filter
    if (filters.subject && p.subject !== filters.subject) return false;

    // Year filter
    if (filters.year && p.year.toString() !== filters.year) return false;

    // Exam type filter
    if (filters.examType && p.exam_type !== filters.examType) return false;

    return true;
  });

  const uniqueSubjects = Array.from(new Set(papers.map(p => p.subject))).sort();
  const uniqueYears = Array.from(new Set(papers.map(p => p.year))).sort((a, b) => b - a);
  const uniqueClassLevels = Array.from(new Set(papers.map(p => p.class_level))).sort();
  const uniqueExamTypes = Array.from(new Set(papers.map(p => p.exam_type))).sort();

  const hasActiveFilters = filters.classLevel || filters.subject || filters.year || filters.examType;

  const clearFilters = () => {
    setFilters({
      classLevel: '',
      subject: '',
      year: '',
      examType: ''
    });
  };

  return (
    <div className="flex-1">
      <div className="max-w-md mx-auto">
        {/* Sticky Header Section */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md px-6 pt-8 pb-4 border-b border-border/50">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-foreground">Exam Library</h1>
              <p className="text-sm font-semibold text-muted-foreground">
                Browse and download past papers
              </p>
            </div>
            <button
              onClick={() => navigate("/my-downloads")}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 active:scale-95 transition-transform"
            >
              <Download className="h-5 w-5 text-primary" />
            </button>
          </div>
          <div className="mt-4">
            <SubscriptionBadge onClick={() => setShowDetailDialog(true)} />
          </div>

          {/* Search and Filters moved inside sticky header */}
          {!loading && papers.length > 0 && (
            <div className="mt-6 space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search papers..."
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-card text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                />
              </div>

              {/* Filter Toggle Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors shadow-sm ${hasActiveFilters
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-card text-foreground'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="font-semibold text-sm">
                    Filters {hasActiveFilters && `(${Object.values(filters).filter(Boolean).length})`}
                  </span>
                </div>
                <X className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-0' : 'rotate-45'}`} />
              </button>
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div className="px-6 mb-4">
          <div className="bg-muted/50 rounded-xl p-3 text-xs">
            <p><strong>Status:</strong> {loading ? 'Loading...' : error ? 'Error' : `${papers.length} papers loaded`}</p>
            <p><strong>Supabase:</strong> Connected</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 mb-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
              <p className="text-sm font-bold text-destructive mb-2">Error:</p>
              <p className="text-xs text-destructive">{error}</p>
              <button
                onClick={loadPapers}
                className="mt-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="px-6 py-12 text-center">
            <Loader size="lg" text="Loading papers..." />
          </div>
        )}

        {/* Filters Panel (shows below sticky header but still within regular flow) */}
        {!loading && papers.length > 0 && showFilters && (
          <div className="px-6 mt-3">
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-md animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm">Filter Papers</h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-semibold text-destructive"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Class Level */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Class Level
                  </label>
                  <select
                    value={filters.classLevel}
                    onChange={(e) => setFilters({ ...filters, classLevel: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  >
                    <option value="">All</option>
                    {uniqueClassLevels.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Subject
                  </label>
                  <select
                    value={filters.subject}
                    onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  >
                    <option value="">All</option>
                    {uniqueSubjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                {/* Year */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Year
                  </label>
                  <select
                    value={filters.year}
                    onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  >
                    <option value="">All</option>
                    {uniqueYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {/* Exam Type */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Exam Type
                  </label>
                  <select
                    value={filters.examType}
                    onChange={(e) => setFilters({ ...filters, examType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  >
                    <option value="">All</option>
                    {uniqueExamTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Papers Grid - 3 columns */}
        {!loading && !error && filteredPapers.length > 0 && (
          <div className="px-4">
            <div className="grid grid-cols-3 gap-2">
              {filteredPapers.map((paper) => (
                <div
                  key={paper.id}
                  className="bg-card rounded-lg border border-border overflow-hidden cursor-pointer active:scale-95 transition-transform"
                  onClick={() => navigate(`/library/${paper.id}`)}
                >
                  {/* Preview Image Thumbnail */}
                  <div className="relative h-32 bg-muted/50 overflow-hidden">
                    {paper.preview_url ? (
                      <img
                        src={paper.preview_url}
                        alt={`Preview of ${paper.title}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Eye className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Paper Info */}
                  <div className="p-2">
                    <h3 className="font-bold text-foreground text-xs mb-1 line-clamp-2 leading-tight">
                      {paper.title}
                    </h3>
                    <div className="flex flex-col gap-1 text-[10px]">
                      <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded font-semibold truncate">
                        {paper.subject}
                      </span>
                      <span className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-semibold truncate">
                        {paper.class_level}
                      </span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1 truncate">
                      {paper.year} • {paper.downloads || 0}↓
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground font-medium">
                {filteredPapers.length} of {papers.length} papers
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && papers.length === 0 && (
          <div className="px-4 py-12 text-center">
            <div className="bg-muted/50 rounded-2xl p-8">
              <p className="text-lg font-bold text-foreground mb-2">No papers yet</p>
              <p className="text-sm text-muted-foreground">
                Upload papers from the admin panel to get started
              </p>
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && papers.length > 0 && filteredPapers.length === 0 && (
          <div className="px-4 py-12 text-center">
            <div className="bg-muted/50 rounded-2xl p-8">
              <p className="text-lg font-bold text-foreground mb-2">No papers match your search</p>
              <p className="text-sm text-muted-foreground">
                Try a different search term
              </p>
            </div>
          </div>
        )}
      </div>

      <SubscriptionDetailDialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        onUpgrade={() => {
          setShowDetailDialog(false);
          setShowCodeDialog(true);
        }}
      />

      <PremiumCodeDialog
        open={showCodeDialog}
        onClose={() => setShowCodeDialog(false)}
        onSuccess={() => setShowCodeDialog(false)}
      />
    </div>
  );
}
