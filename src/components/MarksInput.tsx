import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, File, Clipboard, ChevronDown, Check } from "lucide-react";
import { Subject } from "@/types/exam";
import { calcSubjectAverage, fmtAvg, getRounding } from "@/lib/exam-logic";
import { addHistoryEntry } from "@/lib/storage";
import { useLanguage } from "@/contexts/LanguageContext";
import { scoreToGrade } from "@/lib/grading-nigerian";

interface MarksInputProps {
  subjects: Subject[];
  onSubjectsChange: (subjects: Subject[]) => void;
  onContinue: () => void;
  onBack: () => void;
  classLevel?: string;
  serie?: string;
  isNigerian?: boolean;
}

const markLabels = {
  interro: { label: "Interro", weight: "×1", icon: <FileText className="h-4 w-4" /> },
  dev:     { label: "Devoir",  weight: "×1", icon: <File className="h-4 w-4" /> },
  compo:   { label: "Compo",   weight: "×2", icon: <Clipboard className="h-4 w-4" /> },
} as const;

const MarksInput = ({ subjects, onSubjectsChange, onContinue, onBack: _onBack, classLevel, serie, isNigerian }: MarksInputProps) => {
  const [expanded, setExpanded] = useState<string | null>(
    subjects.length > 0 ? subjects[0].id : null
  );
  const { t } = useLanguage();

  const updateMark = (subjectId: string, markType: keyof Subject["marks"], value: string) => {
    const numValue = value === "" ? null : Math.min(20, Math.max(0, parseFloat(value)));
    const finalValue = isNaN(numValue as number) ? null : numValue;
    const oldSubject = subjects.find((s) => s.id === subjectId);
    const oldValue = oldSubject?.marks[markType];
    const updatedSubjects = subjects.map((s) =>
      s.id === subjectId ? { ...s, marks: { ...s.marks, [markType]: finalValue } } : s
    );
    onSubjectsChange(updatedSubjects);
    if (finalValue !== null && oldValue === null && oldSubject) {
      addHistoryEntry({ date: new Date().toISOString(), subjectName: oldSubject.name, markType, value: finalValue });
    }
    // Auto-collapse and move to next subject when all 3 marks are filled
    const updatedSub = updatedSubjects.find(s => s.id === subjectId);
    if (updatedSub) {
      const allFilled = updatedSub.marks.interro !== null && updatedSub.marks.dev !== null && updatedSub.marks.compo !== null;
      if (allFilled) {
        const currentIdx = updatedSubjects.findIndex(s => s.id === subjectId);
        const nextIncomplete = updatedSubjects.slice(currentIdx + 1).find(
          s => s.marks.interro === null || s.marks.dev === null || s.marks.compo === null
        );
        if (nextIncomplete) {
          setExpanded(nextIncomplete.id);
        } else {
          setExpanded(null);
        }
      }
    }
  };

  const updateNigerianScore = (subjectId: string, value: string) => {
    const raw = parseInt(value, 10);
    const finalValue = value === "" ? null : (isNaN(raw) ? null : Math.min(100, Math.max(0, raw)));
    const oldSubject = subjects.find((s) => s.id === subjectId);
    const updatedSubjects = subjects.map((s) =>
      s.id === subjectId ? { ...s, marks: { ...s.marks, interro: finalValue } } : s
    );
    onSubjectsChange(updatedSubjects);
    if (finalValue !== null && oldSubject?.marks.interro === null && oldSubject) {
      addHistoryEntry({ date: new Date().toISOString(), subjectName: oldSubject.name, markType: "interro", value: finalValue });
    }
    // Do NOT auto-advance on every keystroke — only on blur (see onBlur handler)
  };

  const handleNigerianScoreBlur = (subjectId: string) => {
    const sub = subjects.find(s => s.id === subjectId);
    if (!sub || sub.marks.interro === null) return;
    // Auto-advance to next subject on blur
    const currentIdx = subjects.findIndex(s => s.id === subjectId);
    const nextIncomplete = subjects.slice(currentIdx + 1).find(s => s.marks.interro === null);
    if (nextIncomplete) setExpanded(nextIncomplete.id);
    else setExpanded(null);
  };

  const filledCount = isNigerian
    ? subjects.reduce((acc, s) => acc + (s.marks.interro !== null ? 1 : 0), 0)
    : subjects.reduce((acc, s) =>
        acc + (s.marks.interro !== null ? 1 : 0) + (s.marks.dev !== null ? 1 : 0) + (s.marks.compo !== null ? 1 : 0), 0);
  const totalMarks = isNigerian ? subjects.length : subjects.length * 3;
  const allFilled = subjects.length > 0 && filledCount === totalMarks;

  return (
    <div className="flex flex-col h-screen bg-background w-full overflow-hidden">

      {/* Static header content below fixed nav */}
      <div className="pt-20 pb-3 flex-shrink-0 content-col">
        <h2 className="text-2xl font-black text-foreground">{isNigerian ? "Enter Your Scores" : t("enterYourMarks")}</h2>
        <p className="text-sm text-muted-foreground font-semibold mb-3">{t("enterCurrentMarks")}</p>


      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto pb-32 content-col">
        {/* Subject cards */}
        <div className="flex flex-col gap-3">
          {[...subjects].sort((a, b) => a.name.localeCompare(b.name)).map((sub, i) => {
            const avg = isNigerian ? null : calcSubjectAverage(sub.marks, sub.markStatuses);
            const isOpen = expanded === sub.id;
            const subFilled = isNigerian
              ? (sub.marks.interro !== null ? 1 : 0)
              : (sub.marks.interro !== null ? 1 : 0) + (sub.marks.dev !== null ? 1 : 0) + (sub.marks.compo !== null ? 1 : 0);
            const subDone = isNigerian ? subFilled === 1 : subFilled === 3;
            const nigerianGrade = isNigerian && sub.marks.interro !== null
              ? scoreToGrade(sub.marks.interro).letter
              : null;

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
                    {isNigerian && nigerianGrade && (
                      <span className={`text-sm font-black ${
                        nigerianGrade === "A" ? "text-success" : nigerianGrade === "B" ? "text-primary"
                        : nigerianGrade === "C" ? "text-warning" : nigerianGrade === "F" ? "text-danger" : "text-muted-foreground"
                      }`}>{nigerianGrade}</span>
                    )}
                    {!isNigerian && avg !== null && (
                      <span className="text-sm font-bold text-primary">{fmtAvg(avg, getRounding())}</span>
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
                      {isNigerian ? (
                        <div className="px-4 pb-4 flex items-center gap-3">
                          <div className="flex-1">
                            <label className="text-xs font-bold text-muted-foreground mb-1 block">Score (0–100)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              placeholder="—"
                              value={sub.marks.interro ?? ""}
                              onChange={(e) => updateNigerianScore(sub.id, e.target.value)}
                              onBlur={() => handleNigerianScoreBlur(sub.id)}
                              className="w-full rounded-xl border-2 border-border bg-background px-3 py-2.5 text-center font-bold text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none transition-colors"
                            />
                          </div>
                          {nigerianGrade && (
                            <div className="flex flex-col items-center gap-0.5 shrink-0">
                              <span className="text-xs font-bold text-muted-foreground">Grade</span>
                              <span className={`text-2xl font-black ${
                                nigerianGrade === "A" ? "text-success" : nigerianGrade === "B" ? "text-primary"
                                : nigerianGrade === "C" ? "text-warning" : nigerianGrade === "F" ? "text-danger" : "text-muted-foreground"
                              }`}>{nigerianGrade}</span>
                            </div>
                          )}
                        </div>
                      ) : (
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
                      )}
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
        <div className="content-col max-w-lg mx-auto">
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
