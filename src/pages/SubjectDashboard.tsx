import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Lightbulb, CheckCircle2, BarChart2, ClipboardList, Target, ChevronDown, ChevronUp } from "lucide-react";
import TaskBar from "@/components/TaskBar";
import { SubscriptionDetailDialog } from "@/components/subscription/SubscriptionDetailDialog";
import { PremiumCodeDialog } from "@/components/subscription/PremiumCodeDialog";
import { LockedPreview } from "@/components/ui/LockedPreview";
import { useLanguage } from "@/contexts/LanguageContext";

const TOOLS = [
  { key: "topQuestions",   descKey: "topQuestionsDesc",   icon: Target },
  { key: "keyTopics",      descKey: "keyTopicsDesc",      icon: Lightbulb },
  { key: "cheatSheet",     descKey: "cheatSheetDesc",     icon: BookOpen },
  { key: "stepBySolutions",descKey: "stepByStepSolutions",icon: CheckCircle2 },
  { key: "practiceTests",  descKey: "practiceTestsDesc",  icon: ClipboardList },
  { key: "weakSpots",      descKey: "weakSpotsDesc",      icon: BarChart2 },
] as const;

// Height of the bottom tab bar — keep expanded card just above it
const TAB_BAR_HEIGHT = 80;

export default function SubjectDashboard() {
  const { subjectName } = useParams<{ subjectName: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const title = subjectName || "Subject";

  const toggleTool = (key: string) => {
    setExpandedTool(prev => (prev === key ? null : key));
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="w-full max-w-md mx-auto px-4 safe-area-top">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4 mb-6"
        >
          <h1 className="text-3xl font-black text-foreground">{title}</h1>
          <p className="text-sm font-semibold text-muted-foreground mt-0.5">
            {t("masterSubjectFaster")}
          </p>
        </motion.div>

        {/* Horizontal scroll row of study tool cards */}
        <div className="overflow-x-auto hide-scrollbar -mx-4 px-4">
          <div className="flex gap-3 pb-2" style={{ width: "max-content" }}>
            {TOOLS.map(({ key, descKey, icon: Icon }, i) => {
              const isExpanded = expandedTool === key;
              return (
                <motion.div
                  key={key}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{ width: isExpanded ? "calc(100vw - 32px)" : 220 }}
                  className="shrink-0"
                >
                  {/* Collapsed header tap area */}
                  <div
                    className="rounded-t-2xl bg-card border-2 border-b-0 border-foreground px-4 py-3 flex items-center justify-between cursor-pointer active:opacity-80 transition-opacity"
                    onClick={() => toggleTool(key)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-black text-foreground text-sm truncate">{t(key as any)}</span>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    }
                  </div>

                  <AnimatePresence initial={false}>
                    {isExpanded ? (
                      <motion.div
                        key="expanded"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: `calc(100vh - ${TAB_BAR_HEIGHT + 120}px)`, opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="overflow-hidden"
                      >
                        <LockedPreview
                          title={t(key as any)}
                          subtitle={t(descKey as any)}
                          onUnlockClick={() => setShowPaywall(true)}
                          unlockText={t("unlockNowBtn")}
                          expanded
                          className="rounded-t-none border-t-0"
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="collapsed"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-b-2xl bg-card border-2 border-t-0 border-foreground px-4 py-3 card-shadow">
                          <p className="text-xs font-semibold text-muted-foreground line-clamp-2">
                            {t(descKey as any)}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <TaskBar showBack />

      <SubscriptionDetailDialog
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => {
          setShowPaywall(false);
          setShowCodeDialog(true);
        }}
        subjectName={subjectName}
      />

      <PremiumCodeDialog
        open={showCodeDialog}
        onClose={() => setShowCodeDialog(false)}
        onSuccess={() => setShowCodeDialog(false)}
      />
    </div>
  );
}
