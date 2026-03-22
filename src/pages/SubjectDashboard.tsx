import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, BookOpen, Target, Lightbulb, FileText, CheckCircle2 } from "lucide-react";
import TaskBar from "@/components/TaskBar";
import { SubscriptionDetailDialog } from "@/components/subscription/SubscriptionDetailDialog";
import { PremiumCodeDialog } from "@/components/subscription/PremiumCodeDialog";
import { LockedPreview } from "@/components/ui/LockedPreview";

export default function SubjectDashboard() {
  const { subjectName } = useParams<{ subjectName: string }>();
  const navigate = useNavigate();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);

  // Hardcode subject name if undefined
  const title = subjectName || "Subject Dashboard";

  const handlePremiumClick = () => {
    setShowPaywall(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Header */}
        <button
          onClick={() => navigate("/library")}
          className="flex items-center gap-2 text-muted-foreground mb-4 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Library</span>
        </button>
        
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-black text-foreground">{title}</h1>
          <p className="text-sm font-semibold text-muted-foreground">
            Master this subject faster and smarter
          </p>
        </motion.div>

        <div className="flex flex-col gap-6">
          
          {/* FREE: Past Papers */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
          >
            <div className="p-4 bg-muted/30 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-lg">Past Papers</h2>
              </div>
              <span className="text-xs font-bold bg-success/20 text-success px-2 py-1 rounded-md">FREE</span>
            </div>
            <div className="p-4 flex flex-col items-center justify-center p-8 text-center bg-card">
              <FileText className="h-10 w-10 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm font-semibold text-muted-foreground mb-4">
                Access all previous exams and PDFs directly from the library.
              </p>
              <button 
                onClick={() => navigate("/library?subject=" + subjectName)}
                className="bg-primary/10 text-primary font-bold px-4 py-2 rounded-xl"
              >
                Browse {title} Papers
              </button>
            </div>
          </motion.div>

          {/* PREMIUM: Top Questions (using LockedPreview) */}
          <div className="mt-4">
            <LockedPreview 
              title="Top Questions for this subject"
              items={[
                "Calculate the derivative and deduce the variation table.",
                "Find the limits at the boundaries of the domain.",
                "Demonstrate using mathematical induction.",
                "Determine the complex roots of the polynomial.",
              ]}
              onUnlockClick={() => setShowPaywall(true)}
              unlockText="Unlock all 30 high-probability questions"
            />
          </div>

          {/* PREMIUM: What to Study */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={handlePremiumClick}
            className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 shadow-sm cursor-pointer card-shadow transition-transform active:scale-[0.98]"
          >
            <div className="p-4 border-b border-blue-200 dark:border-blue-800 flex justify-between items-center bg-white/50 dark:bg-black/20">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                <h2 className="font-bold text-lg text-blue-900 dark:text-blue-500">What to Study</h2>
              </div>
              <Lock className="h-4 w-4 text-blue-600 dark:text-blue-500" />
            </div>
            <div className="p-6">
              <p className="text-sm font-bold text-blue-800 dark:text-blue-400 mb-2">High probability topics.</p>
              <p className="text-xs text-blue-700/80 dark:text-blue-500/80 font-medium">
                Pass smarter, not harder. A concrete study plan on what will secure a 10/20.
              </p>
            </div>
          </motion.div>

          {/* PREMIUM: Solutions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={handlePremiumClick}
            className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border border-emerald-200 dark:border-emerald-800 shadow-sm cursor-pointer card-shadow transition-transform active:scale-[0.98]"
          >
            <div className="p-4 border-b border-emerald-200 dark:border-emerald-800 flex justify-between items-center bg-white/50 dark:bg-black/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                <h2 className="font-bold text-lg text-emerald-900 dark:text-emerald-500">Solutions</h2>
              </div>
              <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
            </div>
            <div className="p-6">
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-2">Step-by-step breakdowns.</p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-500/80 font-medium">
                Don't just see the answer. Understand the pattern and learn how this question repeats.
              </p>
            </div>
          </motion.div>

        </div>
      </div>

      <TaskBar />

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
