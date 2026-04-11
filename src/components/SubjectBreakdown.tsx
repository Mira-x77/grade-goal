import { motion } from "framer-motion";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { Subject, FeedbackStatus } from "@/types/exam";
import { calcSubjectAverage, calcAllRequiredMarks, calcSubjectBounds, getMarkLabel } from "@/lib/exam-logic";
import { useLanguage } from "@/contexts/LanguageContext";

interface SubjectBreakdownProps {
  subjects: Subject[];
  targetAverage: number;
}

const SubjectBreakdown = ({ subjects, targetAverage }: SubjectBreakdownProps) => {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl bg-card p-5 border-2 border-border"
    >
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-5 w-5 text-secondary" />
        <h3 className="font-black text-foreground">{t("perSubjectBreakdownTitle")}</h3>
      </div>

      <div className="flex flex-col gap-3">
        {subjects.map((sub, i) => {
          const avg = calcSubjectAverage(sub.marks);
          const bounds = calcSubjectBounds(sub.marks);
          const required = calcAllRequiredMarks(subjects, sub.id, targetAverage);
          const allFilled = sub.marks.interro !== null && sub.marks.dev !== null && sub.marks.compo !== null;

          return (
            <motion.div
              key={sub.id}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.35 + i * 0.05 }}
              className="rounded-xl bg-muted/50 p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-foreground text-sm">{sub.name}</span>
                <span className="text-xs font-bold text-muted-foreground">
                  Coeff {sub.coefficient} · Avg: {avg !== null ? avg.toFixed(1) : "—"}
                </span>
              </div>

              {/* Show bounds if multiple unknowns */}
              {bounds && !allFilled && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-muted-foreground">{t("range")}:</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-danger via-warning to-success rounded-full" />
                  </div>
                  <span className="text-[10px] font-black text-foreground">{bounds.min}–{bounds.max}</span>
                </div>
              )}


            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

function NeededBadge({ needed, status }: { needed: number | null; status: FeedbackStatus }) {
  if (needed === null) {
    return <span className="text-xs font-bold text-muted-foreground">—</span>;
  }

  const label = getMarkLabel(needed);
  const colorClass =
    needed <= 0
      ? "bg-success/15 text-success"
      : status === "possible"
      ? "bg-success/15 text-success"
      : status === "risky"
      ? "bg-warning/15 text-warning"
      : "bg-danger/15 text-danger";

  return (
    <span className={`rounded-lg px-2 py-0.5 text-xs font-black ${colorClass}`}>
      {label}
    </span>
  );
}

export default SubjectBreakdown;

