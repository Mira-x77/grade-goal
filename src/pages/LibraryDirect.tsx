import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Download, Search, Eye, X, LayoutGrid, List, FileText, ChevronDown, Check } from 'lucide-react';
import { cacheService } from '@/services/cacheService';

import { SubscriptionDetailDialog } from '@/components/subscription/SubscriptionDetailDialog';
import { PremiumCodeDialog } from '@/components/subscription/PremiumCodeDialog';
import { Loader } from '@/components/ui/loader';
import TaskBar from '@/components/TaskBar';

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
  const queryParams = new URLSearchParams(window.location.search);
  const initialSubject = queryParams.get('subject') || '';
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');

  const [filters, setFilters] = useState({
    classLevel: '',
    subject: initialSubject,
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
    setFilters({ classLevel: '', subject: '', year: '', examType: '' });
  };

  return (
    <div className="flex-1 pb-20">
      <div className="max-w-md mx-auto">
        {/* Sticky Header Section */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md px-6 pt-8 pb-4 border-b border-border/50">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-foreground">Past Papers Library</h1>
              <p className="text-sm font-semibold text-muted-foreground">
                Browse and download past papers
              </p>
            </div>
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

              {/* Filters row + layout toggle */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex gap-2 overflow-x-auto hide-scrollbar flex-1">
                  <FilterPill
                    label="Class"
                    value={filters.classLevel}
                    options={uniqueClassLevels}
                    onSelect={(v) => setFilters({ ...filters, classLevel: v })}
                  />
                  <FilterPill
                    label="Subject"
                    value={filters.subject}
                    options={uniqueSubjects}
                    onSelect={(v) => setFilters({ ...filters, subject: v })}
                  />
                  <FilterPill
                    label="Year"
                    value={filters.year}
                    options={uniqueYears.map(String)}
                    onSelect={(v) => setFilters({ ...filters, year: v })}
                  />
                  <FilterPill
                    label="Type"
                    value={filters.examType}
                    options={uniqueExamTypes}
                    onSelect={(v) => setFilters({ ...filters, examType: v })}
                  />
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="shrink-0 flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold bg-danger/10 text-danger border-2 border-danger/30 active:scale-95 transition-transform"
                    >
                      <X className="h-3 w-3" /> Clear
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setViewLayout(prev => prev === 'grid' ? 'list' : 'grid')}
                  className="shrink-0 p-2 rounded-xl bg-muted border border-border text-muted-foreground active:scale-95 transition-all"
                >
                  {viewLayout === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Loading papers...</p>
          </div>
        )}

        {!loading && !error && filteredPapers.length > 0 && (
          <div className="px-4 pt-3">

            <div className={viewLayout === 'grid' ? 'grid grid-cols-3 gap-2' : 'flex flex-col gap-3'}>
              {filteredPapers.map((paper) => (
                viewLayout === 'grid' ? (
                  // Grid View Item
                  <div
                    key={paper.id}
                    className="bg-card rounded-lg border border-border overflow-hidden cursor-pointer active:scale-95 transition-transform flex flex-col h-full"
                    onClick={() => navigate(`/library/${paper.id}`)}
                  >
                    {/* Preview Image Thumbnail */}
                    <div className="relative h-32 bg-muted/50 overflow-hidden shrink-0 border-b border-border/50">
                      {paper.preview_url ? (
                        <img
                          src={paper.preview_url}
                          alt={`Preview of ${paper.title}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Eye className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>

                    {/* Paper Info */}
                    <div className="p-2 flex flex-col flex-1">
                      <h3 className="font-bold text-foreground text-xs mb-2 line-clamp-2 leading-tight flex-1">
                        {paper.title || `${paper.subject} ${paper.year}`}
                      </h3>
                      <div className="flex flex-col gap-1.5 mt-auto">
                        <div className="flex gap-1 overflow-hidden">
                          <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-bold truncate">
                            {paper.subject}
                          </span>
                          <span className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[9px] font-bold truncate">
                            {paper.class_level}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black">{paper.year}</span>
                          <span className="text-[9px] font-bold text-muted-foreground">{paper.downloads || 0}↓</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // List View Item
                  <div
                    key={paper.id}
                    className="bg-card rounded-2xl p-4 border border-border flex items-center gap-4 cursor-pointer card-shadow active:scale-[0.98] transition-all"
                    onClick={() => navigate(`/library/${paper.id}`)}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0 border border-primary/20">
                      {paper.preview_url ? (
                        <img src={paper.preview_url} className="w-full h-full object-cover rounded-xl" alt="" />
                      ) : (
                        <FileText className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-foreground text-sm truncate">
                        {paper.title || `${paper.subject} ${paper.year}`}
                      </h3>
                      <p className="text-xs font-bold text-muted-foreground mt-0.5 truncate flex items-center gap-1.5">
                        <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{paper.class_level}</span>
                        <span>{paper.exam_type} {paper.serie ? `· Série ${paper.serie}` : ''}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{paper.year}</span>
                      <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-0.5">{paper.downloads || 0} <Download className="h-3 w-3" /></span>
                    </div>
                  </div>
                )
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

      <TaskBar />

      {/* Downloads FAB */}
      <button
        onClick={() => navigate("/my-downloads")}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground card-shadow-primary active:scale-95 transition-transform"
      >
        <Download className="h-6 w-6" />
      </button>
    </div>
  );
}

// ── FilterPill ──────────────────────────────────────────────────────────────
interface FilterPillProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
}

function FilterPill({ label, value, options, onSelect }: FilterPillProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 8, left: rect.left });
    }
    setOpen((o) => !o);
  };

  const active = !!value;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold border-2 transition-all active:scale-95 ${
          active
            ? "bg-primary/10 border-primary text-primary"
            : "bg-card border-border text-foreground"
        }`}
      >
        {active ? value : label}
        {active ? (
          <X
            className="h-3 w-3 opacity-70"
            onClick={(e) => { e.stopPropagation(); onSelect(""); setOpen(false); }}
          />
        ) : (
          <ChevronDown className={`h-3 w-3 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && (
        <div
          style={{ top: dropPos.top, left: dropPos.left }}
          className="fixed z-[200] min-w-[160px] rounded-2xl bg-card border border-border shadow-xl overflow-hidden"
        >
          <button
            onClick={() => { onSelect(""); setOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold transition-colors hover:bg-muted/60 ${
              !value ? "text-primary" : "text-muted-foreground"
            }`}
          >
            All {label}s
            {!value && <Check className="h-3.5 w-3.5" />}
          </button>
          <div className="h-px bg-border mx-3" />
          <div className="max-h-52 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { onSelect(opt); setOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold transition-colors hover:bg-muted/60 ${
                  value === opt ? "text-primary bg-primary/5" : "text-foreground"
                }`}
              >
                {opt}
                {value === opt && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
