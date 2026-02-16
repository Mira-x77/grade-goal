import { motion } from "framer-motion";
import { BookOpen, ChevronRight } from "lucide-react";
import { Subject, FeedbackStatus } from "@/types/exam";
import { calcSubjectAverage, calcMinimumMarkNeeded, getFeedbackStatus } from "@/lib/exam-logic";

interface SubjectBreakdownProps {
  subjects: Subject[];
  targetAverage: number;
}

const markTypeLabels = { interro: "Interro", dev: "Devoir", compo: "Compo" };

const SubjectBreakdown = ({ subjects, targetAverage }: SubjectBreakdownProps) => {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl bg-card p-5 card-shadow"
    >
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-5 w-5 text-secondary" />
        <h3 className="font-black text-foreground">Per-subject breakdown</h3>
      </div>

      <div className="flex flex-col gap-3">
        {subjects.map((sub, i) => {
          const avg = calcSubjectAverage(sub.marks);
          const emptyMarks = (["interro", "dev", "compo"] as const).filter(
            (t) => sub.marks[t] === null
          );

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

              {emptyMarks.length === 0 ? (
                <p className="text-xs text-success font-bold">✅ All marks entered</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {emptyMarks.map((markType) => {
                    const needed = calcMinimumMarkNeeded(subjects, sub.id, markType, targetAverage);
                    const status = getFeedbackStatus(needed);

                    return (
                      <div key={markType} className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {markTypeLabels[markType]}
                        </span>
                        <NeededBadge needed={needed} status={status} />
                      </div>
                    );
                  })}
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

  const colorClass =
    status === "possible"
      ? "bg-success/15 text-success"
      : status === "risky"
      ? "bg-warning/15 text-warning"
      : "bg-danger/15 text-danger";

  return (
    <span className={`rounded-lg px-2 py-0.5 text-xs font-black ${colorClass}`}>
      {needed > 20 ? "Impossible" : `Need ${needed.toFixed(1)}`}
    </span>
  );
}

export default SubjectBreakdown;
