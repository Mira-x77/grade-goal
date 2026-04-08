import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, File, Clipboard, ChevronDown, Check } from "lucide-react";
import { Subject } from "@/types/exam";
import { calcSubjectAverage } from "@/lib/exam-logic";
import { addHistoryEntry } from "@/lib/storage";
import { useLanguage } from "@/contexts/LanguageContext";
interface MarksInputProps {
  subjects: Subject[];
  onSubjectsChange: (subjects: Subject[]) => void;
  onContinue: () => void;
  onBack: () => void;
  classLevel?: string;
  serie?: string;
}

const markLabels = {
  interro: { label: "Interro", weight: "×1", icon: <FileText className="h-4 w-4" /> },
  dev:     { label: "Devoir",  weight: "×1", icon: <File className="h-4 w-4" /> },
  compo:   { label: "Compo",   weight: "×2", icon: <Clipboard className="h-4 w-4" /> },
} as const;

const MarksInput = ({ subjects, onSubjectsChange, onContinue, onBack: _onBack, classLevel, serie }: MarksInputProps) => {
  const [expanded, setExpanded] = useState<string | null>(
    subjects.length > 0 ? subjects[0].id : null
  );
  const { t } = useLanguage();

  const updateMark = (subjectId: string, markType: keyof Subject["marks"], value: string) => {
    const numValue = value === "" ? null : Math.min(20, Math.max(0, parseFloat(value)));
    const finalValue = isNaN(numValue as number) ? null : numValue;
    const oldSubject = subjects.find((s) => s.id === subjectId);
    const oldValue = oldSubject?.marks[markType];
    onSubjectsChange(
      subjects.map((s) =>
        s.id === subjectId ? { ...s, marks: { ...s.marks, [markType]: finalValue } } : s
      )
    );
    if (finalValue !== null && oldValue === null && oldSubject) {
      addHistoryEntry({ date: new Date().toISOString(), subjectName: oldSubject.name, markType, value: finalValue });
    }
  };

  const filledCount = subjects.reduce((acc, s) =>
    acc + (s.marks.interro !== null ? 1 : 0) + (s.marks.dev !== null ? 1 : 0) + (s.marks.compo !== null ? 1 : 0), 0);
  const totalMarks = subjects.length * 3;
  const progress = totalMarks > 0 ? (filledCount / totalMarks) * 100 : 0;

  const allFilled = subjects.length > 0 && filledCount === totalMarks;

  return (
    <div className="flex flex-col h-screen bg-background w-full overflow-hidden">

      {/* Static header content below fixed nav */}
      <div className="pt-20 px-6 pb-3 flex-shrink-0">
        <h2 className="text-2xl font-black text-foreground">{t("enterYourMarks")}</h2>
        <p className="text-sm text-muted-foreground font-semibold mb-3">{t("enterCurrentMarks")}</p>

        {/* Progress bar */}
        <div className="rounded-full bg-muted h-2.5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 100 }}
          />
        </div>
        <p className="text-xs font-bold text-muted-foreground text-center mt-1">
          {filledCount}/{totalMarks} {t("marksEntered")}
        </p>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-6 pb-32">
        {/* Subject cards */}
        <div className="flex flex-col gap-3">
          {subjects.map((sub, i) => {
            const avg = calcSubjectAverage(sub.marks);
            const isOpen = expanded === sub.id;
            const subFilled = (sub.marks.interro !== null ? 1 : 0) + (sub.marks.dev !== null ? 1 : 0) + (sub.marks.compo !== null ? 1 : 0);
            const subDone = subFilled === 3;

            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl bg-card card-shadow overflow-hidden"
              >
                {/* Header row — tap to expand/collapse */}
                <button
                  onClick={() => setExpanded(isOpen ? null : sub.id)}
                  className="w-full flex items-center justify-between px-4 py-4 active:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${subDone ? "bg-primary border-primary" : "border-border"}`}>
                      {subDone && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                    </div>
                    <span className="font-black text-foreground">{sub.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {avg !== null && (
                      <span className="text-sm font-bold text-primary">{avg.toFixed(1)}</span>
                    )}
                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </div>
                </button>

                {/* Collapsible marks input */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
                        {(Object.keys(markLabels) as Array<keyof typeof markLabels>).map((type) => (
                          <div key={type} className="flex flex-col items-center gap-1">
                            <span className="text-muted-foreground">{markLabels[type].icon}</span>
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
        className="fixed bottom-0 left-0 right-0 z-30 pb-10 pt-8"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background to-transparent z-[-1]" />
        <div className="content-col">
        <button
          onClick={onContinue}
          className="w-full rounded-2xl bg-primary py-4 text-base font-extrabold text-primary-foreground card-shadow-primary active:translate-y-1 active:shadow-none transition-all"
        >
          {filledCount > 0 ? t("continueBtn") : t("skipForNow")}
        </button>
        </div>
      </motion.div>
    </div>
  );
};

export default MarksInput;
