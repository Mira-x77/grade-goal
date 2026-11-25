import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X, Lightbulb, Loader2, ArrowLeft, Trash2, MoreVertical, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsTablet } from "@/hooks/useIsTablet";
import VoteButton from "@/components/feedback/VoteButton";
import TaskBar from "@/components/TaskBar";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { fr as frLocale, enGB } from "date-fns/locale";
import { format } from "date-fns";

function getGradingSystem(): string {
  try {
    const raw = localStorage.getItem("scoretarget_state");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.settings?.gradingSystem ?? "apc";
  } catch { return "apc"; }
}

type Status = "under_review" | "planned" | "in_progress" | "completed";

interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  user_id: string;
  status: Status;
  created_at: string;
  vote_count: number;
  user_voted: boolean;
}

// Status colors stay the same regardless of language
const STATUS_COLORS: Record<Status, string> = {
  under_review: "bg-warning/15 text-warning border-warning/30",
  planned:      "bg-primary/15 text-primary border-primary/30",
  in_progress:  "bg-secondary/80 text-foreground border-foreground/20",
  completed:    "bg-success/15 text-success border-success/30",
};

// Status label keys map to i18n keys
const STATUS_LABEL_KEYS: Record<Status, "statusUnderReview" | "statusPlanned" | "statusInProgress" | "statusCompleted"> = {
  under_review: "statusUnderReview",
  planned:      "statusPlanned",
  in_progress:  "statusInProgress",
  completed:    "statusCompleted",
};

export default function FeedbackBoard() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isTablet = useIsTablet();
  const navigate = useNavigate();
  const gradingSystem = getGradingSystem();
  const dateLocale = language === "fr" ? frLocale : enGB;

  // Analytics: Track page view (lazy loaded)
  useEffect(() => {
    import('@/services/analyticsService')
      .then(({ analyticsService }) => {
        analyticsService.trackPageView('feedback', '/feedback').catch(() => {});
      })
      .catch(() => {});
  }, []);

  const sheetVariants = {
    hidden:  isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: "100%" },
    visible: isTablet ? { x: "-50%", y: "-50%", scale: 1,    opacity: 1 } : { y: 0 },
    exit:    isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: "100%" },
  };

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [sort, setSort] = useState<"votes" | "newest">("votes");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [reqTitle, setReqTitle] = useState("");
  const [reqDesc, setReqDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);

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

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from("feedback_with_votes")
        .select("*")
        .eq("grading_system", gradingSystem)
        .order(sort === "votes" ? "vote_count" : "created_at", { ascending: false });
      if (error) throw error;
      setItems((data as FeedbackItem[]) ?? []);
    } catch (e: any) {
      setFetchError(e.message ?? t("errorOccurred"));
    } finally {
      setLoading(false);
    }
  }, [sort, gradingSystem, t]);

  const handleRefresh = async () => {
    console.log('🔄 Refreshing feedback from server...');
    await fetchItems();
    toast.success(t("feedbackRefreshed"));
  };

  useEffect(() => {
    const handleOnline  = () => { setIsOffline(false); fetchItems(); };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => { if (!isOffline) fetchItems(); }, [fetchItems]);

  // Close delete menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowDeleteMenu(null);
    if (showDeleteMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDeleteMenu]);

  // Close detail modal when clicking outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedItem(null);
    };
    if (selectedItem) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [selectedItem]);

  const filtered = search.trim()
    ? items.filter(i =>
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        i.description.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const handleSubmitRequest = async () => {
    if (!user || reqTitle.trim().length < 3 || reqDesc.trim().length < 10) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { error } = await supabase
        .from("feedback")
        .insert({ title: reqTitle.trim(), description: reqDesc.trim(), user_id: user.id, grading_system: gradingSystem });
      if (error) throw error;
      setReqTitle(""); setReqDesc("");
      setShowForm(false);
      fetchItems();
      toast.success(t("feedbackSubmitted"));
    } catch (e: any) {
      setSubmitError(e.message ?? t("errorOccurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!user) return;
    
    // Show confirmation dialog
    const confirmed = window.confirm(t("feedbackDeleteConfirm"));
    
    if (!confirmed) return;
    
    setDeletingId(feedbackId);
    setShowDeleteMenu(null);
    setSelectedItem(null); // Close modal if open
    
    try {
      const { error } = await supabase
        .from("feedback")
        .delete()
        .eq("id", feedbackId)
        .eq("user_id", user.id); // Extra safety check
      
      if (error) throw error;
      
      setItems(prev => prev.filter(item => item.id !== feedbackId));
      toast.success(t("feedbackDeleteSuccess"));
    } catch (e: any) {
      console.error('Delete error:', e);
      toast.error(`${t("feedbackDeleteFailed")}: ${e.message ?? t("errorOccurred")}`);
    } finally {
      setDeletingId(null);
    }
  };

  const canSubmitRequest = reqTitle.trim().length >= 3 && reqDesc.trim().length >= 10;

  const actionBtn = (
    <motion.button
      onClick={() => setShowForm(true)}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="h-12 w-12 rounded-full bg-secondary border-2 border-foreground card-shadow flex items-center justify-center active:scale-95 transition-transform"
    >
      <Plus className="h-6 w-6 text-foreground" />
    </motion.button>
  );

  return (
    <div className="min-h-screen bg-background w-full pb-24">

      {/* Fixed header + search/sort */}
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-10 bg-background/90 backdrop-blur-lg border-b border-border safe-area-top">
        <div className="header-inner flex items-center gap-3 pt-3 pb-3">
          <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border-2 border-foreground card-shadow active:scale-95 transition-transform shrink-0">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black text-foreground">
              {t("feedbackPageTitle")}
            </h1>
            <p className="text-[10px] font-semibold text-muted-foreground">
              {t("feedbackPageSubtitle")}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-card border-2 border-foreground active:scale-95 transition-transform shrink-0 disabled:opacity-50"
            title={t("feedbackRefreshTitle")}
          >
            <RefreshCw className={`h-4 w-4 text-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search + sort */}
        <div className="header-inner flex gap-2 pb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("feedbackSearch")}
              className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-border bg-muted text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex rounded-xl border-2 border-border overflow-hidden bg-muted">
            {(["votes", "newest"] as const).map(s => (
              <button key={s} onClick={() => setSort(s)}
                className={`px-3 py-2 text-xs font-black transition-colors ${sort === s ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
              >
                {s === "votes" ? t("feedbackSortTop") : t("feedbackSortNew")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="content-col pb-4 flex flex-col gap-3" style={{ paddingTop: headerHeight + 16 }}>
        {isOffline ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
            <div className="text-5xl">📡</div>
            <div>
              <p className="text-lg font-black text-foreground">{t("offlineTitle")}</p>
              <p className="text-sm font-semibold text-muted-foreground mt-1">
                {t("feedbackOfflineBody")}
              </p>
              <p className="text-sm font-semibold text-muted-foreground">
                {t("feedbackConnectInternet")}
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : fetchError ? (
          <div className="text-center py-16">
            <p className="text-sm font-bold text-danger">{fetchError}</p>
            <button onClick={fetchItems} className="mt-3 text-xs font-black text-primary">{t("retry")}</button>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 py-20 text-center px-8"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/30 border-2 border-foreground/10">
              <Lightbulb className="h-8 w-8 text-secondary" />
            </div>
            <p className="text-lg font-black text-foreground">{t("feedbackEmpty")}</p>
            <p className="text-sm font-semibold text-muted-foreground leading-relaxed">
              {t("feedbackEmptyDesc")}
            </p>
            <button onClick={() => setShowForm(true)}
              className="mt-2 rounded-2xl bg-secondary border-2 border-foreground px-6 py-3 font-black text-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all"
            >
              {t("feedbackSubmitIdea")}
            </button>
          </motion.div>
        ) : (
          filtered.map((item, i) => {
            const labelKey = STATUS_LABEL_KEYS[item.status] ?? STATUS_LABEL_KEYS.under_review;
            const color = STATUS_COLORS[item.status] ?? STATUS_COLORS.under_review;
            const isOwner = user?.id === item.user_id;
            const isDeleting = deletingId === item.id;
            
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="flex gap-3 bg-card border-2 border-border rounded-2xl p-4 relative cursor-pointer hover:bg-card/80 transition-colors"
                onClick={() => setSelectedItem(item)}
              >
                <VoteButton feedbackId={item.id} initialCount={item.vote_count} initialVoted={item.user_voted} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-black text-foreground text-sm leading-snug">{item.title}</p>
                    <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full border ${color}`}>
                      {t(labelKey)}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground leading-relaxed line-clamp-2">{item.description}</p>
                  <p className="text-[10px] font-bold text-muted-foreground/60 mt-1.5">
                    {format(new Date(item.created_at), "d MMM", { locale: dateLocale })}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Submit request bottom sheet */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 z-[60] bg-black/50"
            />
            <motion.div
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="sheet z-[61] p-6 pb-10"
            >
              <div className="w-10 h-1 rounded-full bg-foreground/20 mx-auto mb-5" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black text-foreground">{t("feedbackSubmitIdea")}</h2>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground"><X className="h-5 w-5" /></button>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    {t("feedbackTitleLabel")} <span className="text-danger">*</span>
                  </label>
                  <input value={reqTitle} onChange={e => setReqTitle(e.target.value)} maxLength={120}
                    placeholder={t("feedbackTitlePlaceholder")}
                    className="w-full rounded-2xl border-2 border-border bg-card px-4 py-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                  />
                  <p className="text-[10px] font-bold text-muted-foreground mt-1 text-right">{reqTitle.length}/120</p>
                </div>
                <div>
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    {t("feedbackDescLabel")} <span className="text-danger">*</span>
                  </label>
                  <textarea value={reqDesc} onChange={e => setReqDesc(e.target.value)} maxLength={2000} rows={4}
                    placeholder={t("feedbackDescPlaceholder")}
                    className="w-full rounded-2xl border-2 border-border bg-card px-4 py-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                  <p className="text-[10px] font-bold text-muted-foreground mt-1 text-right">{reqDesc.length}/2000</p>
                </div>
                {submitError && <p className="text-xs font-bold text-danger">{submitError}</p>}
                <button onClick={handleSubmitRequest} disabled={!canSubmitRequest || submitting}
                  className="w-full rounded-2xl bg-secondary border-2 border-foreground py-4 font-black text-foreground flex items-center justify-center gap-2 card-shadow active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {t("feedbackSubmit")}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Idea Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="fixed inset-0 z-[60] bg-black/50"
            />
            <motion.div
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="sheet z-[61] p-6 pb-10 max-h-[85vh] overflow-y-auto"
            >
              <div className="w-10 h-1 rounded-full bg-foreground/20 mx-auto mb-5" />
              
              {/* Header with delete button */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${STATUS_COLORS[selectedItem.status] ?? STATUS_COLORS.under_review}`}>
                      {t(STATUS_LABEL_KEYS[selectedItem.status] ?? STATUS_LABEL_KEYS.under_review)}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {format(new Date(selectedItem.created_at), "d MMM yyyy", { locale: dateLocale })}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-foreground leading-tight">{selectedItem.title}</h2>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Delete button for owner */}
                  {user?.id === selectedItem.user_id && (
                    <button
                      onClick={() => handleDeleteFeedback(selectedItem.id)}
                      disabled={deletingId === selectedItem.id}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors disabled:opacity-50"
                      title={t("feedbackDeleteTitle")}
                    >
                      {deletingId === selectedItem.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  
                  {/* Close button */}
                  <button 
                    onClick={() => setSelectedItem(null)} 
                    className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-sm font-black text-foreground mb-3 uppercase tracking-widest">
                    {t("descriptionLabel")}
                  </h3>
                  <p className="text-sm font-semibold text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedItem.description}
                  </p>
                </div>

                {/* Vote Section */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-2xl border-2 border-border">
                  <div>
                    <p className="text-sm font-black text-foreground">
                      {t("communityVotes")}
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {selectedItem.vote_count}{" "}
                      {selectedItem.vote_count === 1 ? t("voteSingular") : t("votePlural")}
                    </p>
                  </div>
                  <VoteButton 
                    feedbackId={selectedItem.id} 
                    initialCount={selectedItem.vote_count} 
                    initialVoted={selectedItem.user_voted}
                  />
                </div>

                {/* Status Info */}
                <div className="p-4 bg-card rounded-2xl border-2 border-border">
                  <h3 className="text-sm font-black text-foreground mb-2 uppercase tracking-widest">
                    {t("statusLabel")}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black px-3 py-1.5 rounded-full border ${STATUS_COLORS[selectedItem.status] ?? STATUS_COLORS.under_review}`}>
                      {t(STATUS_LABEL_KEYS[selectedItem.status] ?? STATUS_LABEL_KEYS.under_review)}
                    </span>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {selectedItem.status === 'under_review' && t("feedbackStatusUnderReviewDesc")}
                      {selectedItem.status === 'planned' && t("feedbackStatusPlannedDesc")}
                      {selectedItem.status === 'in_progress' && t("feedbackStatusInProgressDesc")}
                      {selectedItem.status === 'completed' && t("feedbackStatusCompletedDesc")}
                    </p>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="text-center pt-4">
                  <p className="text-xs font-bold text-muted-foreground">
                    {t("feedbackThankYou")}
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <TaskBar action={items.length > 0 ? <AnimatePresence mode="wait">{actionBtn}</AnimatePresence> : undefined} />
    </div>
  );
}
