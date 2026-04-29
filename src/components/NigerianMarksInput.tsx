import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import type { Subject } from "@/types/exam";
import { computeIntegratedSubjectScore, scoreToGrade } from "@/lib/grading-nigerian";
import NigerianAssessmentSheet from "@/components/NigerianAssessmentSheet";

interface Props {
  subjects: Subject[];
  onSubjectsChange: (subjects: Subject[]) => void;
  onContinue: () => void;
}

export default function NigerianMarksInput({ subjects, onSubjectsChange, onContinue }: Props) {
  const [expanded, setExpanded] = useState<string | null>(
    subjects.length > 0 ? subjects[0].id : null
  );

  const updateSubject = (updated: Subject) => {
    onSubjectsChange(subjects.map(s => s.id === updated.id ? updated : s));
  };

  const filledCount = subjects.filter(s =>
    (s.customAssessments ?? []).some(a => a.value !== null)
  ).length;

  return (
    <div className="flex flex-col h-screen bg-background w-full overflow-hidden">
      {/* Header */}
      <div className="pt-20 pb-3 flex-shrink-0 content-col">
        <p className="text-sm text-muted-foreground font-semibold mb-3">
          Enter your Exam and CA scores for each course
        </p>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto pb-32 content-col">
        <div className="flex flex-col gap-3">
          {[...subjects].sort((a, b) => a.name.localeCompare(b.name)).map((sub, i) => {
            const score = computeIntegratedSubjectScore(sub);
            const gradeInfo = score !== null ? scoreToGrade(Math.round(score)) : null;
            const isOpen = expanded === sub.id;
            const hasSomeScore = (sub.customAssessments ?? []).some(a => a.value !== null);

            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl bg-card card-shadow overflow-hidden"
              >
                {/* Header row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : sub.id)}
                  className="w-full flex items-center justify-between px-4 py-4 active:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${hasSomeScore ? "bg-primary border-primary" : "border-border"}`}>
                      {hasSomeScore && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                    </div>
                    <span className="font-black text-foreground">{sub.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {gradeInfo && (
                      <span className={`text-sm font-black ${
                        gradeInfo.letter === "A" ? "text-success"
                        : gradeInfo.letter === "B" ? "text-primary"
                        : gradeInfo.letter === "C" ? "text-warning"
                        : "text-danger"
                      }`}>{gradeInfo.letter}</span>
                    )}
                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </div>
                </button>

                {/* Expanded assessment sheet */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="overflow-hidden border-t border-border"
                    >
                      <div className="px-4 py-4">
                        <NigerianAssessmentSheet
                          subject={sub}
                          onSave={(updated) => {
                            updateSubject(updated);
                            // auto-advance to next course
                            const currentIdx = subjects.findIndex(s => s.id === sub.id);
                            const next = subjects.slice(currentIdx + 1).find(
                              s => !(s.customAssessments ?? []).some(a => a.value !== null)
                            );
                            setExpanded(next ? next.id : null);
                          }}
                          onBack={() => setExpanded(null)}
                          onClose={() => setExpanded(null)}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Fixed Continue button */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.3 }}
        className="fixed bottom-0 left-0 right-0 z-30 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-8"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background to-transparent z-[-1]" />
        <div className="content-col max-w-lg mx-auto">
          <button
            onClick={onContinue}
            className="w-full rounded-2xl bg-primary py-4 text-base font-extrabold text-primary-foreground card-shadow-primary active:translate-y-1 active:shadow-none transition-all"
          >
            {filledCount > 0 ? "Continue" : "Skip for now"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
