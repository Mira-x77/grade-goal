import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Lock, Lightbulb, CheckCircle2, Crown, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import TaskBar from '@/components/TaskBar';
import { loadState } from '@/lib/storage';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ExamPrep() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const state = loadState();
  const userSubjects = state?.subjects.map(s => s.name) ?? [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="w-full">
        {/* Header Hero */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 px-6 pb-8 border-b border-yellow-200 dark:border-yellow-800 text-center relative overflow-hidden safe-area-top">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-200/50 dark:bg-yellow-600/20 rounded-full blur-3xl"></div>
          
          <Crown className="h-10 w-10 text-yellow-500 mx-auto mb-3 relative z-10" />
          <h1 className="text-2xl font-black text-yellow-950 dark:text-yellow-500 leading-tight mb-2 relative z-10">
            {t("passNotHarder")}
          </h1>
          <p className="text-sm font-semibold text-yellow-800/80 dark:text-yellow-500/80 relative z-10 max-w-[280px] mx-auto">
            {t("focusWhatMatters")}
          </p>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card p-4 rounded-2xl border border-border flex flex-col items-center text-center">
              <Target className="h-6 w-6 text-primary mb-2" />
              <span className="text-xs font-black text-foreground">{t("top30QuestionsLabel")}</span>
            </div>
            <div className="bg-card p-4 rounded-2xl border border-border flex flex-col items-center text-center">
              <Lightbulb className="h-6 w-6 text-primary mb-2" />
              <span className="text-xs font-black text-foreground">{t("whatToStudyLabel")}</span>
            </div>
            <div className="bg-card p-4 rounded-2xl border border-border flex flex-col items-center text-center">
              <CheckCircle2 className="h-6 w-6 text-primary mb-2" />
              <span className="text-xs font-black text-foreground">{t("stepBySolutions")}</span>
            </div>
            <div className="bg-card p-4 rounded-2xl border border-border flex flex-col items-center text-center opacity-50 relative overflow-hidden">
              <Lock className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground z-10" />
              <span className="text-xs font-black text-foreground blur-[2px]">{t("secretSauce")}</span>
            </div>
          </div>

          <h2 className="text-lg font-black text-foreground mt-8 mb-4">{t("selectSubjectUnlock")}</h2>

          {userSubjects.length === 0 ? (
            <div className="py-10 text-center rounded-2xl bg-muted/50">
              <p className="text-sm font-bold text-muted-foreground">{t("noSubjectsFound")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("completeOnboarding")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userSubjects.map((subject, i) => (
                <motion.div
                  key={subject}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/subject/${encodeURIComponent(subject)}`)}
                  className="bg-card hover:bg-muted p-4 rounded-2xl border border-border flex items-center justify-between cursor-pointer transition-colors active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Crown className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-black text-base text-foreground">{subject}</h3>
                      <p className="text-xs font-bold text-muted-foreground mt-0.5">{t("unlockSpecificPrep")}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      <TaskBar showBack />
    </div>
  );
}
