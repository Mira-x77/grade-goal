import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X, Lightbulb, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsTablet } from "@/hooks/useIsTablet";
import VoteButton from "@/components/feedback/VoteButton";
import TaskBar from "@/components/TaskBar";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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

const STATUS_META: Record<Status, { label: string; labelFr: string; color: string }> = {
  under_review: { label: "Under Review", labelFr: "En examen",  color: "bg-warning/15 text-warning border-warning/30" },
  planned:      { label: "Planned",      labelFr: "Planifié",   color: "bg-primary/15 text-primary border-primary/30" },
  in_progress:  { label: "In Progress",  labelFr: "En cours",   color: "bg-secondary/80 text-foreground border-foreground/20" },
  completed:    { label: "Completed",    labelFr: "Terminé",    color: "bg-success/15 text-success border-success/30" },
};

export default function FeedbackBoard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isTablet = useIsTablet();
  const navigate = useNavigate();
  const gradingSystem = getGradingSystem();
  const sheetVariants = {
    hidden:  isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: "100%" },
    visible: isTablet ? { x: "-50%", y: "-50%", scale: 1,    opacity: 1 } : { y: 0 },
    exit:    isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: "100%" },
  };
  const fr = language === "fr";

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sort, setSort] = useState<"votes" | "newest">("votes");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [reqTitle, setReqTitle] = useState("");
  const [reqDesc, setReqDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
      setFetchError(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

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
      toast.success(fr ? "Idée soumise !" : "Request submitted!");
    } catch (e: any) {
      setSubmitError(e.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmitRequest = reqTitle.trim().length >= 3 && reqDesc.trim().length >= 10;

  const actionBtn = (
    <motion.button
      onClick={() => setShowForm(true)}
      initial={{ opacity: 0, scale: 0.5, x: -16 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.5, x: -16 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="flex items-center gap-2 rounded-full bg-secondary border-2 border-foreground px-5 h-12 font-black text-foreground card-shadow active:scale-95 transition-transform"
    >
      <Plus className="h-5 w-5" />
      {fr ? "Idée" : "Idea"}
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
              {fr ? "Idées & Fonctionnalités" : "Ideas & Feature Requests"}
            </h1>
            <p className="text-[10px] font-semibold text-muted-foreground">
              {fr ? "Votez ou proposez une idée" : "Vote on ideas or suggest your own"}
            </p>
          </div>
        </div>

        {/* Search + sort */}
        <div className="header-inner flex gap-2 pb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={fr ? "Rechercher..." : "Search..."}
              className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-border bg-muted text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex rounded-xl border-2 border-border overflow-hidden bg-muted">
            {(["votes", "newest"] as const).map(s => (
              <button key={s} onClick={() => setSort(s)}
                className={`px-3 py-2 text-xs font-black transition-colors ${sort === s ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
              >
                {s === "votes" ? (fr ? "Votes" : "Top") : (fr ? "Récent" : "New")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="content-col pb-4 flex flex-col gap-3" style={{ paddingTop: headerHeight + 16 }}>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : fetchError ? (
          <div className="text-center py-16">
            <p className="text-sm font-bold text-danger">{fetchError}</p>
            <button onClick={fetchItems} className="mt-3 text-xs font-black text-primary">{fr ? "Réessayer" : "Retry"}</button>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 py-20 text-center px-8"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/30 border-2 border-foreground/10">
              <Lightbulb className="h-8 w-8 text-secondary" />
            </div>
            <p className="text-lg font-black text-foreground">{fr ? "Aucune idée pour l'instant" : "No ideas yet"}</p>
            <p className="text-sm font-semibold text-muted-foreground leading-relaxed">
              {fr ? "Soyez le premier à proposer une fonctionnalité." : "Be the first to suggest a feature."}
            </p>
            <button onClick={() => setShowForm(true)}
              className="mt-2 rounded-2xl bg-secondary border-2 border-foreground px-6 py-3 font-black text-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all"
            >
              {fr ? "Proposer une idée" : "Submit an idea"}
            </button>
          </motion.div>
        ) : (
          filtered.map((item, i) => {
            const meta = STATUS_META[item.status] ?? STATUS_META.under_review;
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="flex gap-3 bg-card border-2 border-border rounded-2xl p-4"
              >
                <VoteButton feedbackId={item.id} initialCount={item.vote_count} initialVoted={item.user_voted} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-black text-foreground text-sm leading-snug">{item.title}</p>
                    <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full border ${meta.color}`}>
                      {fr ? meta.labelFr : meta.label}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground leading-relaxed line-clamp-2">{item.description}</p>
                  <p className="text-[10px] font-bold text-muted-foreground/60 mt-1.5">
                    {new Date(item.created_at).toLocaleDateString(fr ? "fr-FR" : "en-GB", { day: "numeric", month: "short" })}
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
                <h2 className="text-lg font-black text-foreground">{fr ? "Proposer une idée" : "Submit a Request"}</h2>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground"><X className="h-5 w-5" /></button>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    {fr ? "Titre" : "Title"} <span className="text-danger">*</span>
                  </label>
                  <input value={reqTitle} onChange={e => setReqTitle(e.target.value)} maxLength={120}
                    placeholder={fr ? "Ex: Rappels de révision quotidiens" : "e.g. Daily revision reminders"}
                    className="w-full rounded-2xl border-2 border-border bg-card px-4 py-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                  />
                  <p className="text-[10px] font-bold text-muted-foreground mt-1 text-right">{reqTitle.length}/120</p>
                </div>
                <div>
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    {fr ? "Description" : "Description"} <span className="text-danger">*</span>
                  </label>
                  <textarea value={reqDesc} onChange={e => setReqDesc(e.target.value)} maxLength={2000} rows={4}
                    placeholder={fr ? "Décrivez la fonctionnalité et pourquoi elle serait utile..." : "Describe the feature and why it would be useful..."}
                    className="w-full rounded-2xl border-2 border-border bg-card px-4 py-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                  <p className="text-[10px] font-bold text-muted-foreground mt-1 text-right">{reqDesc.length}/2000</p>
                </div>
                {submitError && <p className="text-xs font-bold text-danger">{submitError}</p>}
                <button onClick={handleSubmitRequest} disabled={!canSubmitRequest || submitting}
                  className="w-full rounded-2xl bg-secondary border-2 border-foreground py-4 font-black text-foreground flex items-center justify-center gap-2 card-shadow active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {fr ? "Soumettre" : "Submit"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <TaskBar action={items.length > 0 ? <AnimatePresence mode="wait">{actionBtn}</AnimatePresence> : undefined} />
    </div>
  );
}
