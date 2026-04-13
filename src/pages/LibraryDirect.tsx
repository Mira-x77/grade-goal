import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Download, Search, Eye, X, LayoutGrid, List, FileText, ChevronDown, Check, ChevronRight, Sparkles, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cacheService } from '@/services/cacheService';
import { loadState } from '@/lib/storage';
import TaskBar from '@/components/TaskBar';
import ScreenIntro from '@/components/ScreenIntro';
import ScreenTour from '@/components/ScreenTour';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePremiumNudge } from '@/hooks/usePremiumNudge';
import { PREMIUM_ENABLED } from '@/config/premium';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { PaymentSheet } from '@/components/subscription/PaymentSheet';
import { PlanSelectSheet } from '@/components/subscription/PlanSelectSheet';
import { PremiumIntroSheet } from '@/components/subscription/PremiumIntroSheet';
import { SubjectPackSheet } from '@/components/subscription/SubjectPackSheet';

type LibraryTab = 'papers' | 'prep';

const PREP_SUBTEXTS = [
  "focusWhatMatters",
  "premiumStudyTools",
  "top30Questions",
  "topicsLikelyAppear",
  "stepByStepSolutions",
  "whatToStudyGuide",
] as const;

function CyclingSubtext() {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % PREP_SUBTEXTS.length);
        setVisible(true);
      }, 350);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="overflow-hidden relative h-4">
      <motion.p
        key={index}
        initial={{ x: -24, opacity: 0 }}
        animate={visible ? { x: 0, opacity: 1 } : { x: 24, opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="text-xs font-semibold text-muted-foreground/60 absolute inset-0 whitespace-nowrap overflow-hidden text-ellipsis"
        style={{
          background: "linear-gradient(90deg, transparent 0%, hsl(var(--muted-foreground)/0.55) 20%, hsl(var(--muted-foreground)/0.55) 80%, transparent 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {t(PREP_SUBTEXTS[index] as any)}
      </motion.p>
    </div>
  );
}

export default function LibraryDirect() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { premiumEnabled: PREMIUM_ENABLED } = useAppConfig();
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(80);

  useEffect(() => {
    if (!headerRef.current) return;
    const ro = new ResizeObserver(() => {
      setHeaderHeight(headerRef.current?.getBoundingClientRect().height ?? 0);
    });
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

  const userState = loadState();
  const userClassLevel = userState?.classLevel ?? null;
  const userSubjectNames = userState?.subjects?.map(s => s.name) ?? [];

  const [activeTab, setActiveTab] = useState<LibraryTab>('papers');
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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

  const [showPlanSelect, setShowPlanSelect] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [showPremiumIntro, setShowPremiumIntro] = useState(false);
  const [showSubjectPack, setShowSubjectPack] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // Premium nudge (suppressed when PREMIUM_ENABLED = false)
  const [activeNudge, setActiveNudge] = useState<"library_open" | "paper_downloaded" | null>(null);
  const { fire: fireNudge } = usePremiumNudge((trigger) => {
    if (trigger === "library_open" || trigger === "paper_downloaded") setActiveNudge(trigger);
  });

  const prevDownloadCount = useRef(0);

  useEffect(() => {
    loadPapers();
    loadDownloadedPapers();
    // Trigger 4: library_open — fire after screen settles
    const timer = setTimeout(() => fireNudge("library_open"), 4000);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDownloadedPapers = async () => {
    const cachedPapers = await cacheService.getCachedPapers();
    const downloaded = new Set(cachedPapers.filter(p => p.isDownloaded).map(p => p.id));
    const prevCount = prevDownloadCount.current;
    prevDownloadCount.current = downloaded.size;
    setDownloadedPaperIds(downloaded);
    // Trigger 5: paper_downloaded — only when count increases during this session
    if (prevCount === 0 && downloaded.size > 0) {
      setTimeout(() => fireNudge("paper_downloaded"), 1500);
    }
  };

  const loadPapers = async () => {
    try {
      setLoading(true);
      setError('');
      const { data, error: fetchError } = await supabase
        .from('exam_papers')
        .select('*')
        .order('created_at', { ascending: false });
      if (fetchError) { setError(`Error: ${fetchError.message}`); return; }
      if (!data || data.length === 0) { setError('No papers found in database'); setPapers([]); return; }
      setPapers(data);
    } catch (err) {
      setError(`Exception: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredPapers = papers.filter(p => {
    if (filters.classLevel && p.class_level?.toLowerCase() !== filters.classLevel.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (!p.title?.toLowerCase().includes(query) && !p.subject?.toLowerCase().includes(query)) return false;
    }
    if (filters.subject && p.subject !== filters.subject) return false;
    if (filters.year && p.year.toString() !== filters.year) return false;
    if (filters.examType && p.exam_type !== filters.examType) return false;
    return true;
  });

  const activeClassLevel = filters.classLevel || null;
  const classPapers = activeClassLevel
    ? papers.filter(p => p.class_level?.toLowerCase() === activeClassLevel.toLowerCase())
    : papers;
  const effectivePapers = classPapers.length > 0 ? classPapers : papers;

  const availableSubjectsInLib = new Set(effectivePapers.map((p: any) => p.subject));
  const availableSubjectsArr = Array.from(availableSubjectsInLib).sort() as string[];
  const userMatched = userSubjectNames.length > 0
    ? userSubjectNames.filter(s => Array.from(availableSubjectsInLib).some((a: any) => a.toLowerCase() === s.toLowerCase()))
    : [];
  const uniqueSubjects = userMatched.length > 0 ? userMatched : availableSubjectsArr;
  const uniqueYears = Array.from(new Set(effectivePapers.map(p => p.year))).sort((a: number, b: number) => b - a);
  const uniqueExamTypes = Array.from(new Set(effectivePapers.map(p => p.exam_type))).sort();

  const hasActiveFilters = (filters.classLevel && filters.classLevel !== (userClassLevel ?? '')) || filters.subject || filters.year || filters.examType;
  const clearFilters = () => setFilters({ classLevel: userClassLevel ?? '', subject: '', year: '', examType: '' });

  // Subjects to show in Prep tab — user's own subjects first, fallback to all in library
  const prepSubjects = userSubjectNames.length > 0 ? userSubjectNames : availableSubjectsArr;

  return (
    <div className="flex-1 w-full pb-20">
      <div className="w-full">

        {/* Fixed Header — bleeds edge-to-edge, inner content constrained */}
        <div ref={headerRef} className="fixed top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-md pb-3 border-b border-border/50 overflow-visible safe-area-top">
          <div className="header-inner">
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-black text-foreground">{t("library")}</h1>
          </div>

          {/* Tab Switcher — prep tab shows Coming Soon when premium is disabled */}
          <div className="tour-library-tabs flex gap-1 mt-4 bg-muted rounded-xl p-1">
            {(['papers', 'prep'] as LibraryTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-lg py-2 text-xs font-black transition-all ${
                  activeTab === tab
                    ? 'bg-card border border-border/60 text-foreground card-shadow'
                    : 'text-muted-foreground'
                }`}
              >
                {tab === 'papers' ? t("pastPapers") : t("passSmarter")}
              </button>
            ))}
          </div>

          {/* Search + Filters — only on Papers tab */}
          <AnimatePresence initial={false}>
            {activeTab === 'papers' && !loading && papers.length > 0 && (
              <motion.div
                key="filters"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2">
                  <div className="tour-library-search relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("searchByTitle")}
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-card text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar flex-1">
                      <FilterPill label={t("classLevel")} value={filters.classLevel} options={Array.from(new Set(papers.map(p => p.class_level))).filter(Boolean).sort() as string[]} onSelect={(v) => setFilters({ ...filters, classLevel: v })} />
                      <FilterPill label={t("subject")} value={filters.subject} options={uniqueSubjects} onSelect={(v) => setFilters({ ...filters, subject: v })} />
                      <FilterPill label={t("year")} value={filters.year} options={uniqueYears.map(String)} onSelect={(v) => setFilters({ ...filters, year: v })} />
                      <FilterPill label={t("examType")} value={filters.examType} options={uniqueExamTypes} onSelect={(v) => setFilters({ ...filters, examType: v })} />
                      {hasActiveFilters && (
                        <button onClick={clearFilters} className="shrink-0 flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold bg-danger/10 text-danger border-2 border-danger/30 active:scale-95 transition-transform">
                          <X className="h-3 w-3" /> Clear
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setViewLayout(prev => prev === 'grid' ? 'list' : 'grid')}
                      className="tour-library-grid shrink-0 p-2 rounded-xl bg-muted border border-border text-muted-foreground active:scale-95 transition-all"
                    >
                      {viewLayout === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>{/* /header-inner */}
        </div>

        {/* ── PAPERS TAB ── */}
        <AnimatePresence mode="wait">
          {activeTab === 'papers' && (
            <motion.div key="papers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ paddingTop: headerHeight }}>
              {loading && (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <div className="relative h-16 w-16">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                  <p className="text-lg font-bold text-foreground">{t("loadingPapers")}</p>
                </div>
              )}

              {!loading && !error && filteredPapers.length > 0 && (
                <div className="content-col pt-3">
                  <p className="text-xs text-muted-foreground font-bold mb-3">
                    {filteredPapers.length} {filteredPapers.length === 1 ? t("paper") : t("papersFound")}
                  </p>
                  <div className={viewLayout === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2' : 'flex flex-col gap-3'}>
                    {filteredPapers.map((paper) => {
                      const isSaved = downloadedPaperIds.has(paper.id);
                      return viewLayout === 'grid' ? (
                        <div
                          key={paper.id}
                          className="bg-card rounded-xl border-2 border-foreground overflow-hidden cursor-pointer active:scale-95 transition-transform flex flex-col card-shadow"
                          onClick={() => navigate(`/library/${paper.id}`)}
                        >
                          <div className="relative h-32 bg-muted/50 overflow-hidden shrink-0">
                            {paper.preview_url ? (
                              <img src={paper.preview_url} alt={`Preview of ${paper.title}`} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Eye className="h-6 w-6 text-muted-foreground/50" />
                              </div>
                            )}
                            {isSaved && (
                              <div className="absolute top-1.5 right-1.5">
                                <span className="px-1.5 py-0.5 bg-secondary border border-foreground/30 text-foreground rounded text-[8px] font-black">{t("downloaded")}</span>
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <h3 className="font-bold text-foreground text-[10px] leading-tight">
                              {paper.title || `${paper.subject} ${paper.year}`}
                            </h3>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={paper.id}
                          className="bg-card rounded-2xl p-4 border border-border flex items-center gap-4 cursor-pointer card-shadow active:scale-[0.98] transition-all"
                          onClick={() => navigate(`/library/${paper.id}`)}
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0 border border-primary/20 overflow-hidden">
                            {paper.preview_url ? (
                              <img src={paper.preview_url} className="w-full h-full object-cover object-top rounded-xl" alt="" />
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
                              <span>{paper.exam_type}{paper.serie ? ` · Série ${paper.serie}` : ''}</span>
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{paper.year}</span>
                            {isSaved && (
                              <span className="text-[10px] font-black bg-secondary border border-foreground/20 text-foreground px-2 py-0.5 rounded-full">{t("downloaded")}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!loading && !error && papers.length === 0 && (
                <div className="content-col py-12 text-center">
                  <div className="bg-muted/50 rounded-2xl p-8">
                    <p className="text-lg font-bold text-foreground mb-2">{t("noPapersYet")}</p>
                    <p className="text-sm text-muted-foreground">{t("uploadFromAdmin")}</p>
                  </div>
                </div>
              )}

              {!loading && !error && papers.length > 0 && classPapers.length === 0 && effectivePapers === papers && (
                <div className="content-col py-12 text-center">
                  <div className="bg-muted/50 rounded-2xl p-8">
                    <p className="text-lg font-bold text-foreground mb-2">{t("noPapersForClass")}</p>
                    <p className="text-sm text-muted-foreground">{t("papersWillAppear").replace("{class}", userClassLevel ?? "your class")}</p>
                  </div>
                </div>
              )}

              {!loading && !error && classPapers.length > 0 && filteredPapers.length === 0 && (
                <div className="content-col py-12 text-center">
                  <div className="bg-muted/50 rounded-2xl p-8">
                    <p className="text-lg font-bold text-foreground mb-2">{t("noMatchFilters")}</p>
                    <p className="text-sm text-muted-foreground">{t("tryAdjustFilters")}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── PREP TAB ── */}
          {activeTab === 'prep' && (
            <motion.div key="prep" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ paddingTop: headerHeight }}>
              <div className="content-col pt-4 pb-4">
                <>
                    {/* Hero */}
                    <div className="rounded-2xl bg-premium/10 border-2 border-premium/30 px-4 py-4 mb-4 flex items-center gap-3">
                      <Crown className="h-6 w-6 text-premium shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-foreground text-sm">{t("passNotHarder")}</p>
                        <CyclingSubtext />
                      </div>
                    </div>

                    {prepSubjects.length === 0 ? (
                      <div className="py-10 text-center rounded-2xl bg-muted/50">
                        <p className="text-sm font-bold text-muted-foreground">{t("noSubjectsFound")}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t("completeOnboarding")}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">{t("selectSubjectUnlock")}</p>
                        {prepSubjects.map((subject, i) => (
                          <motion.div
                            key={subject}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            onClick={() => navigate(`/subject/${encodeURIComponent(subject)}`)}
                            className="bg-card border-2 border-foreground rounded-2xl p-4 flex items-center gap-4 cursor-pointer card-shadow active:scale-[0.98] active:translate-y-0.5 active:shadow-none transition-all"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-premium/10 border border-premium/20 shrink-0">
                              <Crown className="h-5 w-5 text-premium" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-black text-foreground text-sm">{subject}</h3>
                              <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">{t("unlockSpecificPrep")}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Premium sheets — only rendered when premium is enabled */}
      <>
          <PremiumIntroSheet
            open={showPremiumIntro}
            onClose={() => setShowPremiumIntro(false)}
            onContinue={() => { setShowPremiumIntro(false); setShowPlanSelect(true); }}
          />
          <PremiumIntroSheet
            open={!!activeNudge}
            onClose={() => setActiveNudge(null)}
            onContinue={() => { setActiveNudge(null); setShowPlanSelect(true); }}
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
        </>

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

      <ScreenIntro
        screenKey="library"
        title={t("examLibrary")}
        description={t("browseDownloadPapers")}
        mascotPose="reading"
        ctaLabel={t("browseLibrary")}
      />

      <ScreenTour
        storageKey="scoretarget_tour_library"
        introKey="library"
        delay={1200}
        steps={[
          { target: ".tour-library-tabs", titleKey: "tourLibraryTabsTitle", contentKey: "tourLibraryTabsContent", duration: 4500, actionKey: "tourLibraryTabsAction" },
          { target: ".tour-library-search", titleKey: "tourLibrarySearchTitle", contentKey: "tourLibrarySearchContent", duration: 4500 },
          { target: ".tour-library-grid", titleKey: "tourLibraryGridTitle", contentKey: "tourLibraryGridContent", duration: 4000 },
        ]}
      />
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
          active ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-foreground"
        }`}
      >
        {active ? value : label}
        {active ? (
          <X className="h-3 w-3 opacity-70" onClick={(e) => { e.stopPropagation(); onSelect(""); }} />
        ) : (
          <ChevronDown className="h-3 w-3 opacity-60" />
        )}
      </button>

      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[200] bg-black/40" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-[201] flex items-center justify-center px-8 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-xs rounded-2xl bg-card border border-border shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-black text-foreground text-center">{label}</p>
              </div>
              <div className="max-h-72 overflow-y-auto">
                <button
                  onClick={() => { onSelect(""); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold transition-colors hover:bg-muted/60 ${!value ? "text-primary" : "text-muted-foreground"}`}
                >
                  All {label}s
                  {!value && <Check className="h-3.5 w-3.5" />}
                </button>
                <div className="h-px bg-border mx-3" />
                {options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { onSelect(opt); setOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold transition-colors hover:bg-muted/60 ${value === opt ? "text-primary bg-primary/5" : "text-foreground"}`}
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
