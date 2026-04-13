import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Lock, X, Loader2, AlertCircle } from "lucide-react";
import TaskBar from "@/components/TaskBar";
import { SubscriptionDetailDialog } from "@/components/subscription/SubscriptionDetailDialog";
import { PremiumCodeDialog } from "@/components/subscription/PremiumCodeDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsTablet } from "@/hooks/useIsTablet";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { ComingSoon } from "@/components/subscription/ComingSoon";
import {
  fetchStudyTools,
  StudyToolContent,
  TopQuestion,
  KeyTopic,
  CheatSheetItem,
  SolutionItem,
  PracticeTest,
  WeakSpot,
} from "@/services/studyToolsService";
import { loadState } from "@/lib/storage";

const TOOLS = [
  { key: "topQuestions",    descKey: "topQuestionsDesc",    emoji: "🎯" },
  { key: "keyTopics",       descKey: "keyTopicsDesc",       emoji: "🗺️" },
  { key: "cheatSheet",      descKey: "cheatSheetDesc",      emoji: "📋" },
  { key: "stepBySolutions", descKey: "stepByStepSolutions", emoji: "✅" },
  { key: "practiceTests",   descKey: "practiceTestsDesc",   emoji: "📝" },
  { key: "weakSpots",       descKey: "weakSpotsDesc",       emoji: "🔍" },
] as const;

type ToolKey = typeof TOOLS[number]["key"];

// ── Per-tool row renderers ────────────────────────────────────────────────

function QuestionRow({ item, index, blurred }: { item: TopQuestion; index: number; blurred: boolean }) {
  return (
    <div
      className="rounded-xl bg-muted/60 px-3 py-2.5 flex items-start gap-3"
      style={blurred ? { filter: "blur(5px)", userSelect: "none", pointerEvents: "none" } : {}}
    >
      <span className="text-xs font-black text-primary shrink-0 mt-0.5">{index + 1}.</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground leading-snug">{item.question}</p>
        <p className="text-[10px] font-bold text-muted-foreground mt-1">{item.frequency}</p>
      </div>
    </div>
  );
}

function TopicRow({ item, index, blurred }: { item: KeyTopic; index: number; blurred: boolean }) {
  const weightColor = item.weight === "High" ? "text-danger" : item.weight === "Medium" ? "text-warning-foreground" : "text-muted-foreground";
  return (
    <div
      className="rounded-xl bg-muted/60 px-3 py-2.5 flex items-start gap-3"
      style={blurred ? { filter: "blur(5px)", userSelect: "none", pointerEvents: "none" } : {}}
    >
      <span className="text-xs font-black text-primary shrink-0 mt-0.5">{index + 1}.</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-black text-foreground">{item.topic}</p>
          <span className={`text-[9px] font-black uppercase ${weightColor}`}>{item.weight}</span>
        </div>
        <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">{item.hint}</p>
      </div>
    </div>
  );
}

function CheatRow({ item, index, blurred }: { item: CheatSheetItem; index: number; blurred: boolean }) {
  return (
    <div
      className="rounded-xl bg-muted/60 px-3 py-2.5 flex items-start gap-3"
      style={blurred ? { filter: "blur(5px)", userSelect: "none", pointerEvents: "none" } : {}}
    >
      <span className="text-xs font-black text-primary shrink-0 mt-0.5">{index + 1}.</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-foreground">{item.item}</p>
        <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">{item.detail}</p>
      </div>
    </div>
  );
}

function SolutionRow({ item, index, blurred }: { item: SolutionItem; index: number; blurred: boolean }) {
  return (
    <div
      className="rounded-xl bg-muted/60 px-3 py-2.5"
      style={blurred ? { filter: "blur(5px)", userSelect: "none", pointerEvents: "none" } : {}}
    >
      <p className="text-xs font-black text-foreground mb-1.5">{index + 1}. {item.question}</p>
      {item.steps.map((step, si) => (
        <p key={si} className="text-[10px] font-semibold text-muted-foreground leading-snug ml-3">• {step}</p>
      ))}
    </div>
  );
}

function PracticeRow({ item, index, blurred }: { item: PracticeTest; index: number; blurred: boolean }) {
  return (
    <div
      className="rounded-xl bg-muted/60 px-3 py-2.5 flex items-start gap-3"
      style={blurred ? { filter: "blur(5px)", userSelect: "none", pointerEvents: "none" } : {}}
    >
      <span className="text-xs font-black text-primary shrink-0 mt-0.5">{index + 1}.</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground leading-snug">{item.question}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded">{item.type}</span>
          <span className="text-[9px] font-bold text-muted-foreground">{item.marks} marks</span>
        </div>
      </div>
    </div>
  );
}

function WeakSpotRow({ item, index, blurred }: { item: WeakSpot; index: number; blurred: boolean }) {
  return (
    <div
      className="rounded-xl bg-muted/60 px-3 py-2.5"
      style={blurred ? { filter: "blur(5px)", userSelect: "none", pointerEvents: "none" } : {}}
    >
      <p className="text-xs font-black text-foreground">{index + 1}. {item.area}</p>
      <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">{item.why}</p>
      <p className="text-[10px] font-bold text-primary mt-1">💡 {item.tip}</p>
    </div>
  );
}

// ── Generic tool rows dispatcher ─────────────────────────────────────────

function ToolRows({ toolKey, content, visibleCount }: {
  toolKey: ToolKey;
  content: StudyToolContent;
  visibleCount: number;
}) {
  const renderRow = (item: any, index: number) => {
    const blurred = index >= visibleCount;
    const props = { index, blurred, key: index };
    switch (toolKey) {
      case "topQuestions":    return <QuestionRow  {...props} item={item as TopQuestion} />;
      case "keyTopics":       return <TopicRow     {...props} item={item as KeyTopic} />;
      case "cheatSheet":      return <CheatRow     {...props} item={item as CheatSheetItem} />;
      case "stepBySolutions": return <SolutionRow  {...props} item={item as SolutionItem} />;
      case "practiceTests":   return <PracticeRow  {...props} item={item as PracticeTest} />;
      case "weakSpots":       return <WeakSpotRow  {...props} item={item as WeakSpot} />;
    }
  };

  const items: any[] = content[toolKey] ?? [];
  return <>{items.map((item, i) => renderRow(item, i))}</>;
}

// ── Skeleton loader ───────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <div className="space-y-2 px-4 py-3">
      {[90, 75, 85, 60].map((w, i) => (
        <div key={i} className="rounded-xl bg-muted/60 px-3 py-2.5 flex items-center gap-3 animate-pulse">
          <div className="h-3 w-3 rounded bg-foreground/10 shrink-0" />
          <div className="h-2.5 rounded-full bg-foreground/10" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function SubjectDashboard() {
  const { subjectName } = useParams<{ subjectName: string }>();
  const { t } = useLanguage();
  const { premiumEnabled: PREMIUM_ENABLED } = useAppConfig();
  const isTablet = useIsTablet();
  const sheetVariants = {
    hidden:  isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: "100%" },
    visible: isTablet ? { x: "-50%", y: "-50%", scale: 1,    opacity: 1 } : { y: 0 },
    exit:    isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: "100%" },
  };
  const [showPaywall, setShowPaywall] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [activeSheet, setActiveSheet] = useState<ToolKey | null>(null);
  const [content, setContent] = useState<StudyToolContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title = subjectName || "Subject";
  const classLevel = loadState()?.classLevel ?? "";
  const activeTool = TOOLS.find(t => t.key === activeSheet);

  useEffect(() => {
    if (!subjectName) return;
    setLoading(true);
    setError(null);
    fetchStudyTools(subjectName, classLevel)
      .then(setContent)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [subjectName, classLevel]);

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="content-col safe-area-top">

        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pt-4 mb-5">
          <h1 className="text-3xl font-black text-foreground">{title}</h1>
          <p className="text-sm font-semibold text-muted-foreground mt-0.5">{t("masterSubjectFaster")}</p>
        </motion.div>

        {/* Unlock banner */}
        <motion.button
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowPaywall(true)}
          className="w-full mb-5 rounded-2xl bg-secondary border-2 border-foreground px-4 py-3.5 flex items-center gap-3 card-shadow active:translate-y-0.5 active:shadow-none transition-all"
        >
          <Crown className="h-5 w-5 text-foreground shrink-0" />
          <div className="flex-1 text-left">
            <p className="font-black text-foreground text-sm">{t("passSmarter")}</p>
            <p className="text-[11px] font-semibold text-foreground/60 mt-0.5">{t("premiumStudyTools")}</p>
          </div>
          <span className="text-xs font-black text-foreground bg-foreground/10 px-2.5 py-1 rounded-full border border-foreground/20">
            {t("unlockNowBtn")}
          </span>
        </motion.button>

        {/* Error state */}
        {error && (
          <div className="rounded-2xl bg-card border-2 border-foreground p-4 flex items-start gap-3 mb-4">
            <AlertCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-foreground">Couldn't load study tools</p>
              <p className="text-xs font-semibold text-muted-foreground mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Tool cards */}
        <div className="flex flex-col gap-3">
          {TOOLS.map(({ key, descKey, emoji }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.05 }}
              onClick={() => !loading && setActiveSheet(key)}
              className="rounded-2xl bg-card border-2 border-foreground overflow-hidden card-shadow cursor-pointer active:translate-y-0.5 active:shadow-none transition-all"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg leading-none">{emoji}</span>
                  <span className="font-black text-foreground text-sm">{t(key as any)}</span>
                </div>
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              </div>

              {/* Content peek — first item visible, rest blurred */}
              {loading ? (
                <SkeletonRows />
              ) : content ? (
                <div className="relative px-4 pt-3 pb-10 space-y-2 overflow-hidden" style={{ maxHeight: 140 }}>
                  <ToolRows toolKey={key} content={content} visibleCount={1} />
                  <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-card to-transparent" />
                </div>
              ) : null}

              {/* Description */}
              <div className="px-4 pb-3">
                <p className="text-[10px] font-bold text-muted-foreground">{t(descKey as any)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tool detail bottom sheet */}
      <AnimatePresence>
        {activeSheet && activeTool && content && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[65] bg-black/50"
              onClick={() => setActiveSheet(null)}
            />
            <motion.div
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="sheet z-[66] flex flex-col"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1.5 rounded-full bg-foreground/25" />
              </div>

              {/* Sheet header */}
              <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{activeTool.emoji}</span>
                  <div>
                    <h2 className="font-black text-foreground text-base">{t(activeTool.key as any)}</h2>
                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">{t(activeTool.descKey as any)}</p>
                  </div>
                </div>
                <button onClick={() => setActiveSheet(null)} className="text-muted-foreground active:scale-90 transition-transform">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable rows — first 2 visible, rest blurred */}
              <div className="flex-1 overflow-y-auto px-5 pt-4 pb-4 space-y-2.5">
                <ToolRows toolKey={activeSheet} content={content} visibleCount={2} />
              </div>

              {/* Paywall gradient + CTA */}
              <div className="shrink-0 px-5 pb-8 pt-3 border-t border-border bg-background">
                <p className="text-[11px] font-semibold text-muted-foreground text-center mb-3">
                  Unlock all {(content[activeSheet] ?? []).length} items — get the full picture
                </p>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setActiveSheet(null); setShowPaywall(true); }}
                  className="w-full rounded-2xl bg-secondary border-2 border-foreground py-4 font-black text-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <Crown className="h-4 w-4" />
                  {t("unlockNowBtn")}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Loading overlay for sheet */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border-2 border-foreground rounded-2xl px-5 py-3 flex items-center gap-3 card-shadow"
          >
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <p className="text-sm font-black text-foreground">Generating study tools…</p>
          </motion.div>
        )}
      </AnimatePresence>

      <TaskBar showBack />

      <>
          <SubscriptionDetailDialog
            open={showPaywall}
            onClose={() => setShowPaywall(false)}
            onUpgrade={() => { setShowPaywall(false); setShowCodeDialog(true); }}
            subjectName={subjectName}
          />
          <PremiumCodeDialog
            open={showCodeDialog}
            onClose={() => setShowCodeDialog(false)}
            onSuccess={() => setShowCodeDialog(false)}
          />
        </>
    </div>
  );
}
