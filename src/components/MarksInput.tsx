import { motion } from "framer-motion";
import { Subject } from "@/types/exam";
import { calcSubjectAverage } from "@/lib/exam-logic";
import { addHistoryEntry } from "@/lib/storage";

interface MarksInputProps {
  subjects: Subject[];
  onSubjectsChange: (subjects: Subject[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

const markLabels = {
  interro: { label: "Interro", weight: "×1", emoji: "📝" },
  dev: { label: "Devoir", weight: "×1", emoji: "📄" },
  compo: { label: "Compo", weight: "×2", emoji: "📋" },
} as const;

const MarksInput = ({ subjects, onSubjectsChange, onContinue, onBack }: MarksInputProps) => {
  const updateMark = (subjectId: string, markType: keyof Subject["marks"], value: string) => {
    const numValue = value === "" ? null : Math.min(20, Math.max(0, parseFloat(value)));
    const finalValue = isNaN(numValue as number) ? null : numValue;
    
    // Find old value to check if this is a new entry
    const oldSubject = subjects.find((s) => s.id === subjectId);
    const oldValue = oldSubject?.marks[markType];
    
    onSubjectsChange(
      subjects.map((s) =>
        s.id === subjectId ? { ...s, marks: { ...s.marks, [markType]: finalValue } } : s
      )
    );

    // Track in history if it's a new non-null value
    if (finalValue !== null && oldValue === null && oldSubject) {
      addHistoryEntry({
        date: new Date().toISOString(),
        subjectName: oldSubject.name,
        markType,
        value: finalValue,
      });
    }
  };

  const filledCount = subjects.reduce((acc, s) => {
    return acc + (s.marks.interro !== null ? 1 : 0) + (s.marks.dev !== null ? 1 : 0) + (s.marks.compo !== null ? 1 : 0);
  }, 0);
  const totalMarks = subjects.length * 3;
  const progress = totalMarks > 0 ? (filledCount / totalMarks) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-6 px-6 py-8"
    >
      <div>
        <button onClick={onBack} className="text-sm font-bold text-muted-foreground mb-2">
          ← Back
        </button>
        <h2 className="text-2xl font-black text-foreground">Enter your marks</h2>
        <p className="text-sm text-muted-foreground font-semibold">Leave empty if not taken yet</p>
      </div>

      {/* Progress bar */}
      <div className="rounded-full bg-muted h-3 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 100 }}
        />
      </div>
      <p className="text-xs font-bold text-muted-foreground text-center -mt-4">
        {filledCount}/{totalMarks} marks entered
      </p>

      {/* Subjects with marks */}
      <div className="flex flex-col gap-4">
        {subjects.map((sub, i) => {
          const avg = calcSubjectAverage(sub.marks);
          return (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl bg-card p-4 card-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-foreground">{sub.name}</h3>
                {avg !== null && (
                  <span className="text-sm font-bold text-primary">
                    Avg: {avg.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(markLabels) as Array<keyof typeof markLabels>).map((type) => (
                  <div key={type} className="flex flex-col items-center gap-1">
                    <span className="text-lg">{markLabels[type].emoji}</span>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      placeholder="—"
                      value={sub.marks[type] ?? ""}
                      onChange={(e) => updateMark(sub.id, type, e.target.value)}
                      className="w-full rounded-xl border-2 border-border bg-background px-2 py-2 text-center font-bold text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none transition-colors"
                    />
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {markLabels[type].label} {markLabels[type].weight}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={onContinue}
        className="w-full rounded-2xl bg-primary py-4 text-lg font-extrabold text-primary-foreground card-shadow-primary active:translate-y-1 active:shadow-none transition-all"
      >
        SEE RESULTS 📊
      </motion.button>
    </motion.div>
  );
};

export default MarksInput;
