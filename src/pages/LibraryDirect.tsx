import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Download, Search, Eye, X, LayoutGrid, List, FileText, ChevronDown, Check, Crown } from 'lucide-react';
import { cacheService } from '@/services/cacheService';
import { loadState } from '@/lib/storage';
import { SubscriptionDetailDialog } from '@/components/subscription/SubscriptionDetailDialog';
import { PremiumCodeDialog } from '@/components/subscription/PremiumCodeDialog';
import { PaymentSheet } from '@/components/subscription/PaymentSheet';
import { PlanSelectSheet } from '@/components/subscription/PlanSelectSheet';
import { PremiumIntroSheet } from '@/components/subscription/PremiumIntroSheet';
import { SubjectPackSheet } from '@/components/subscription/SubjectPackSheet';
import { Loader } from '@/components/ui/loader';
import TaskBar from '@/components/TaskBar';
import { useLanguage } from '@/contexts/LanguageContext';

const supabaseUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function LibraryDirect() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // User profile — class level and subject names from onboarding
  const userState = loadState();
  const userClassLevel = userState?.classLevel ?? null;
  const userSubjectNames = userState?.subjects?.map(s => s.name) ?? [];

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
    classLevel: userClassLevel ?? '',
    subject: initialSubject,
    year: '',
    examType: ''
  });
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showPlanSelect, setShowPlanSelect] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [showPremiumIntro, setShowPremiumIntro] = useState(false);
  const [showSubjectPack, setShowSubjectPack] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [paymentPlan, setPaymentPlan] = useState<"all">("all");

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
    // Filter by selected class level
    if (filters.classLevel && p.class_level?.toLowerCase() !== filters.classLevel.toLowerCase()) return false;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (!p.title?.toLowerCase().includes(query) && !p.subject?.toLowerCase().includes(query)) return false;
    }

    // Subject filter
    if (filters.subject && p.subject !== filters.subject) return false;

    // Year filter
    if (filters.year && p.year.toString() !== filters.year) return false;

    // Exam type filter
    if (filters.examType && p.exam_type !== filters.examType) return false;

    return true;
  });

  // Papers matching selected class level (defaults to user's class)
  const activeClassLevel = filters.classLevel || null;
  const classPapers = activeClassLevel
    ? papers.filter(p => p.class_level?.toLowerCase() === activeClassLevel.toLowerCase())
    : papers;

  // Use all papers as fallback if class filter yields nothing
  const effectivePapers = classPapers.length > 0 ? classPapers : papers;

  // Subjects: user's own subjects that exist in the library
  const availableSubjectsInLib = new Set(effectivePapers.map((p: any) => p.subject));
  const availableSubjectsArr = Array.from(availableSubjectsInLib).sort() as string[];
  const userMatched = userSubjectNames.length > 0
    ? userSubjectNames.filter(s =>
        Array.from(availableSubjectsInLib).some(
          (a: any) => a.toLowerCase() === s.toLowerCase()
        )
      )
    : [];
  const uniqueSubjects = userMatched.length > 0 ? userMatched : availableSubjectsArr;

  const uniqueYears = Array.from(new Set(effectivePapers.map(p => p.year))).sort((a: number, b: number) => b - a);
  const uniqueExamTypes = Array.from(new Set(effectivePapers.map(p => p.exam_type))).sort();

  const hasActiveFilters = (filters.classLevel && filters.classLevel !== (userClassLevel ?? '')) || filters.subject || filters.year || filters.examType;

  const clearFilters = () => {
    setFilters({ classLevel: userClassLevel ?? '', subject: '', year: '', examType: '' });
  };

  return (
    <div className="flex-1 pb-20">
      <div className="max-w-md mx-auto">
        {/* Sticky Header Section */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md px-6 pb-4 border-b border-border/50 overflow-visible safe-area-top">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-foreground">{t("library")}</h1>
              <p className="text-sm font-semibold text-muted-foreground">
                {t("browseDownloadPapers")}
              </p>
            </div>
            <button
              onClick={() => setShowPremiumIntro(true)}
              className="flex h-9 items-center gap-1.5 px-3 rounded-xl border-2 border-premium bg-premium text-premium-foreground active:scale-95 transition-all card-shadow text-xs font-black shrink-0 mt-1"
            >
              <Crown className="h-4 w-4" />
              Unlock
            </button>
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
                  placeholder={t("searchByTitle")}
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-card text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                />
              </div>

              {/* Filters row + layout toggle */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex gap-2 overflow-x-auto hide-scrollbar flex-1">
                  <FilterPill
                    label={t("classLevel")}
                    value={filters.classLevel}
                    options={Array.from(new Set(papers.map(p => p.class_level))).filter(Boolean).sort() as string[]}
                    onSelect={(v) => setFilters({ ...filters, classLevel: v })}
                  />
                  <FilterPill
                    label={t("subject")}
                    value={filters.subject}
                    options={uniqueSubjects}
                    onSelect={(v) => setFilters({ ...filters, subject: v })}
                  />
                  <FilterPill
                    label={t("year")}
                    value={filters.year}
                    options={uniqueYears.map(String)}
                    onSelect={(v) => setFilters({ ...filters, year: v })}
                  />
                  <FilterPill
                    label={t("examType")}
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
              {filteredPapers.map((paper) => {
                const isSaved = downloadedPaperIds.has(paper.id);
                return viewLayout === 'grid' ? (
                  // Grid View Item
                  <div
                    key={paper.id}
                    className="bg-card rounded-xl border-2 border-foreground overflow-hidden cursor-pointer active:scale-95 transition-transform flex flex-col card-shadow"
                    onClick={() => navigate(`/library/${paper.id}`)}
                  >
                    {/* Preview Image with overlay tags */}
                    <div className="relative h-32 bg-muted/50 overflow-hidden shrink-0">
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
                      {/* Overlay tags on image — Downloaded only */}
                      {isSaved && (
                        <div className="absolute top-1.5 right-1.5">
                          <span className="px-1.5 py-0.5 bg-secondary border border-foreground/30 text-foreground rounded text-[8px] font-black">
                            Downloaded
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Title only — no truncation limit */}
                    <div className="p-2">
                      <h3 className="font-bold text-foreground text-[10px] leading-tight">
                        {paper.title || `${paper.subject} ${paper.year}`}
                      </h3>
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
                      {downloadedPaperIds.has(paper.id) && (
                        <span className="text-[10px] font-black bg-secondary border border-foreground/20 text-foreground px-2 py-0.5 rounded-full">Downloaded</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground font-medium">
                {filteredPapers.length} {t("of")} {papers.length} {t("papersFound")}
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

        {/* No papers for this class yet */}
        {!loading && !error && papers.length > 0 && classPapers.length === 0 && effectivePapers === papers && (
          <div className="px-4 py-12 text-center">
            <div className="bg-muted/50 rounded-2xl p-8">
              <p className="text-lg font-bold text-foreground mb-2">No papers for your class yet</p>
              <p className="text-sm text-muted-foreground">
                Papers for {userClassLevel ?? "your class"} will appear here once they're added
              </p>
            </div>
          </div>
        )}

        {/* No results from search/filter */}
        {!loading && !error && classPapers.length > 0 && filteredPapers.length === 0 && (
          <div className="px-4 py-12 text-center">
            <div className="bg-muted/50 rounded-2xl p-8">
              <p className="text-lg font-bold text-foreground mb-2">No papers match your filters</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting or clearing your filters
              </p>
            </div>
          </div>
        )}
      </div>

      <PremiumIntroSheet
        open={showPremiumIntro}
        onClose={() => setShowPremiumIntro(false)}
        onContinue={() => { setShowPremiumIntro(false); setShowPlanSelect(true); }}
      />
      <PlanSelectSheet
        open={showPlanSelect}
        onClose={() => setShowPlanSelect(false)}
        onBack={() => { setShowPlanSelect(false); setShowPremiumIntro(true); }}
        onSelectPack={() => { setShowPlanSelect(false); setShowSubjectPack(true); }}
        onSelectAll={() => { setShowPlanSelect(false); setShowPaymentSheet(true); }}
      />
      <SubjectPackSheet
        open={showSubjectPack}
        onClose={() => setShowSubjectPack(false)}
        onBack={() => { setShowSubjectPack(false); setShowPlanSelect(true); }}
        subjects={uniqueSubjects}
        onConfirm={(subs, amount) => {
          setSelectedSubjects(subs);
          setShowSubjectPack(false);
          (window as any).__packAmount = amount;
          setShowPaymentSheet(true);
        }}
      />
      <PaymentSheet
        open={showPaymentSheet}
        onClose={() => setShowPaymentSheet(false)}
        onBack={() => {
          setShowPaymentSheet(false);
          if (selectedSubjects.length === 0) setShowPlanSelect(true);
          else setShowSubjectPack(true);
        }}
        onSuccess={() => setShowPaymentSheet(false)}
        subjectName={selectedSubjects.length === 1 ? selectedSubjects[0] : undefined}
        amount={(window as any).__packAmount ?? undefined}
      />

      <TaskBar action={
        downloadedPaperIds.size > 0 ? (
          <button
            onClick={() => navigate("/my-downloads")}
            className="h-12 w-12 rounded-full bg-primary border-2 border-foreground card-shadow flex flex-col items-center justify-center active:scale-95 transition-transform"
          >
            <Download className="h-4 w-4 text-primary-foreground" />
            <span className="text-[9px] font-black text-primary-foreground leading-none mt-0.5">
              {downloadedPaperIds.size}
            </span>
          </button>
        ) : undefined
      } />
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
  const active = !!value;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold border-2 transition-all active:scale-95 shrink-0 ${
          active
            ? "bg-primary/10 border-primary text-primary"
            : "bg-card border-border text-foreground"
        }`}
      >
        {active ? value : label}
        {active ? (
          <X
            className="h-3 w-3 opacity-70"
            onClick={(e) => { e.stopPropagation(); onSelect(""); }}
          />
        ) : (
          <ChevronDown className="h-3 w-3 opacity-60" />
        )}
      </button>

      {open && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[200] bg-black/40"
            onClick={() => setOpen(false)}
          />
          {/* Centered modal */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center px-8 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-xs rounded-2xl bg-card border border-border shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-black text-foreground text-center">{label}</p>
              </div>
              <div className="max-h-72 overflow-y-auto">
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
          </div>
        </>,
        document.body
      )}
    </>
  );
}
