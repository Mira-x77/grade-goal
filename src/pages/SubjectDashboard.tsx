import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Lock, Lightbulb, CheckCircle2, FileText } from "lucide-react";
import TaskBar from "@/components/TaskBar";
import { SubscriptionDetailDialog } from "@/components/subscription/SubscriptionDetailDialog";
import { PremiumCodeDialog } from "@/components/subscription/PremiumCodeDialog";
import { LockedPreview } from "@/components/ui/LockedPreview";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SubjectDashboard() {
  const { subjectName } = useParams<{ subjectName: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);

  const title = subjectName || "Subject";

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

        <div className="flex flex-col gap-4">

          {/* FREE: Past Papers */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl bg-card border-2 border-foreground overflow-hidden card-shadow"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <h2 className="font-black text-foreground text-sm">{t("pastPapers")}</h2>
              </div>
              <span className="text-[10px] font-black bg-success/15 text-success px-2 py-0.5 rounded-full border border-success/30">
                {t("free")}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
              <p className="text-sm font-semibold text-muted-foreground mb-4">
                {t("accessPastExams")}
              </p>
              <button
                onClick={() => navigate(`/library?subject=${encodeURIComponent(title)}`)}
                className="rounded-xl bg-primary/10 text-primary font-black text-sm px-5 py-2.5 active:scale-95 transition-transform border border-primary/20"
              >
                {t("browseSubjectPapers").replace("{subject}", title)}
              </button>
            </div>
          </motion.div>

          {/* PREMIUM: Top Questions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <LockedPreview
              title={t("topQuestionsSubject")}
              subtitle={t("topQuestionsDesc")}
              onUnlockClick={() => setShowPaywall(true)}
              unlockText={t("unlockNowBtn")}
            />
          </motion.div>

          {/* PREMIUM: What to Study */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => setShowPaywall(true)}
            className="rounded-2xl bg-card border-2 border-foreground overflow-hidden card-shadow cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                <h3 className="font-black text-foreground text-sm">{t("whatToStudy")}</h3>
              </div>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="px-4 py-4">
              <p className="text-sm font-bold text-foreground mb-1">{t("highProbabilityTopics")}</p>
              <p className="text-xs font-semibold text-muted-foreground">{t("keyTopicsDesc")}</p>
            </div>
          </motion.div>

          {/* PREMIUM: Solutions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setShowPaywall(true)}
            className="rounded-2xl bg-card border-2 border-foreground overflow-hidden card-shadow cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <h3 className="font-black text-foreground text-sm">{t("solutions")}</h3>
              </div>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="px-4 py-4">
              <p className="text-sm font-bold text-foreground mb-1">{t("stepByStepBreakdowns")}</p>
              <p className="text-xs font-semibold text-muted-foreground">{t("dontJustSeeAnswer")}</p>
            </div>
          </motion.div>

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
