import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ArrowLeft, X, Check } from "lucide-react";
import type { Subject, CustomAssessment } from "@/types/exam";
import { scoreToGrade, computeGP, computeIntegratedSubjectScore } from "@/lib/grading-nigerian";

interface Props {
  subject: Subject;
  onSave: (updated: Subject) => void;
  onBack: () => void;
  onClose: () => void;
}

const EXAM_ID_PREFIX = "exam_";

function isExam(a: CustomAssessment) {
  return a.id.startsWith(EXAM_ID_PREFIX) || a.label.toLowerCase() === "exam";
}

function distributeCAWeight(caItems: CustomAssessment[], totalCAWeight: number): CustomAssessment[] {
  if (caItems.length === 0) return caItems;
  const perItem = Math.round((totalCAWeight / caItems.length) * 100) / 100;
  return caItems.map((a, i) => ({
    ...a,
    // Last item gets any rounding remainder
    weight: i === caItems.length - 1
      ? Math.round((totalCAWeight - perItem * (caItems.length - 1)) * 100) / 100
      : perItem,
  }));
}

export default function NigerianAssessmentSheet({ subject, onSave, onBack, onClose }: Props) {
  const existing = subject.customAssessments ?? [];

  // Separate exam from CA items
  const existingExam = existing.find(isExam);
  const existingCAs = existing.filter(a => !isExam(a));

  const [examWeight, setExamWeight] = useState(existingExam?.weight ?? 70);
  const [examValue, setExamValue] = useState<number | null>(existingExam?.value ?? null);
  const [examMaxScore, setExamMaxScore] = useState<number>((existingExam as any)?.maxScore ?? 100);
  const [examId] = useState(existingExam?.id ?? `${EXAM_ID_PREFIX}${crypto.randomUUID()}`);

  const caWeight = Math.round((100 - examWeight) * 100) / 100;
  const [caItems, setCAItems] = useState<(CustomAssessment & { maxScore: number })[]>(
    existingCAs.length > 0
      ? existingCAs.map(a => ({ ...a, maxScore: (a as any).maxScore ?? 100 }))
      : []
  );
  const [newCALabel, setNewCALabel] = useState("");
  const [showAddCA, setShowAddCA] = useState(false);

  // Build full assessments for score calculation
  const allAssessments: CustomAssessment[] = [
    { id: examId, label: "Exam", weight: examWeight, value: examValue, maxScore: examMaxScore } as any,
    ...distributeCAWeight(caItems, caWeight),
  ];

  const score = computeIntegratedSubjectScore({ customAssessments: allAssessments });
  const gradeInfo = score !== null ? scoreToGrade(Math.round(score)) : null;
  const cu = subject.creditUnits ?? subject.coefficient ?? 3;
  const gp = gradeInfo ? computeGP(Math.round(score!), cu) : null;

  const handleExamWeightChange = (val: string) => {
    const n = parseFloat(val);
    if (isNaN(n)) return;
    const clamped = Math.min(99, Math.max(1, n));
    setExamWeight(clamped);
  };

  const addCA = () => {
    const label = newCALabel.trim();
    if (!label) return;
    const newItem = {
      id: crypto.randomUUID(),
      label,
      weight: 0,
      value: null,
      maxScore: 100,
    };
    setCAItems(prev => [...prev, newItem]);
    setNewCALabel("");
    setShowAddCA(false);
  };

  const removeCA = (id: string) => {
    setCAItems(prev => prev.filter(a => a.id !== id));
  };

  const updateCAValue = (id: string, val: string) => {
    setCAItems(prev => prev.map(a => {
      if (a.id !== id) return a;
      const max = a.maxScore ?? 100;
      const num = val === "" ? null : Math.min(max, Math.max(0, parseFloat(val)));
      return { ...a, value: isNaN(num as number) ? null : num };
    }));
  };

  const updateCAMaxScore = (id: string, val: string) => {
    const n = parseInt(val);
    if (isNaN(n) || n < 1) return;
    setCAItems(prev => prev.map(a => a.id === id ? { ...a, maxScore: n } : a));
  };

  const handleSave = () => {
    const distributed = distributeCAWeight(caItems, caWeight);
    const final = [
      { id: examId, label: "Exam", weight: examWeight, value: examValue, maxScore: examMaxScore } as any,
      ...distributed.map(a => ({ ...a, maxScore: (a as any).maxScore ?? 100 })),
    ];
    onSave({ ...subject, customAssessments: final });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-black flex-1 truncate">{subject.name}</h2>
        <button onClick={onClose} className="text-muted-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Score summary */}
      {gradeInfo && (
        <div className="rounded-2xl bg-primary/10 border-2 border-primary/30 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Current Score</p>
            <p className="text-2xl font-black text-foreground">{score!.toFixed(1)}<span className="text-sm text-muted-foreground">/100</span></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Grade · GP</p>
            <p className="text-2xl font-black text-primary">{gradeInfo.letter} · {gp}</p>
          </div>
        </div>
      )}

      {/* ── EXAM section ── */}
      <div className="rounded-2xl bg-card border-2 border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div>
            <p className="text-sm font-black text-foreground">Exam</p>
            <div className="flex items-center gap-1 mt-0.5">
              <input
                type="number"
                min={1}
                max={99}
                value={examWeight}
                onChange={(e) => handleExamWeightChange(e.target.value)}
                className="w-12 rounded-lg border border-border bg-muted px-1.5 py-0.5 text-center text-[10px] font-bold text-foreground focus:border-primary focus:outline-none"
              />
              <span className="text-[10px] font-bold text-muted-foreground">% of total</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={examMaxScore}
                placeholder="—"
                value={examValue ?? ""}
                onChange={(e) => {
                  const n = e.target.value === "" ? null : Math.min(examMaxScore, Math.max(0, parseFloat(e.target.value)));
                  setExamValue(isNaN(n as number) ? null : n);
                }}
                className="w-16 rounded-xl border-2 border-border bg-card px-2 py-1.5 text-center font-bold text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none text-sm"
              />
              <span className="text-xs font-bold text-muted-foreground">/</span>
              <input
                type="number"
                min={1}
                max={100}
                value={examMaxScore}
                onChange={(e) => {
                  const n = parseInt(e.target.value);
                  if (!isNaN(n) && n >= 1) setExamMaxScore(n);
                }}
                className="w-14 rounded-xl border-2 border-border bg-muted px-2 py-1.5 text-center font-bold text-muted-foreground focus:border-primary focus:outline-none text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── CA section ── */}
      <div className="rounded-2xl bg-card border-2 border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div>
            <p className="text-sm font-black text-foreground">Continuous Assessment</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] font-bold text-muted-foreground">Total weight:</span>
              <span className="text-[10px] font-black text-primary">{caWeight}%</span>
              {caItems.length > 1 && (
                <span className="text-[10px] font-bold text-muted-foreground">
                  ({(caWeight / caItems.length).toFixed(1)}% each)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 flex flex-col gap-2">
          <AnimatePresence>
            {caItems.length === 0 && (
              <p className="text-xs font-semibold text-muted-foreground text-center py-2">
                No CA items yet — add tests, assignments, etc.
              </p>
            )}
            {distributeCAWeight(caItems, caWeight).map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-foreground truncate">{a.label}</p>
                  <p className="text-[10px] font-bold text-muted-foreground">{a.weight.toFixed(1)}% weight</p>
                </div>
                <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={a.maxScore ?? 100}
                    placeholder="—"
                    value={a.value ?? ""}
                    onChange={(e) => updateCAValue(a.id, e.target.value)}
                    className="w-16 rounded-xl border-2 border-border bg-card px-2 py-1.5 text-center font-bold text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none text-sm"
                  />
                  <span className="text-xs font-bold text-muted-foreground">/</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={a.maxScore ?? 100}
                    onChange={(e) => updateCAMaxScore(a.id, e.target.value)}
                    className="w-14 rounded-xl border-2 border-border bg-muted px-2 py-1.5 text-center font-bold text-muted-foreground focus:border-primary focus:outline-none text-sm"
                  />
                </div>
                <button onClick={() => removeCA(a.id)} className="text-destructive/50 active:text-destructive active:scale-90 transition-all">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add CA */}
          <AnimatePresence>
            {showAddCA ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 p-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Test 1, Assignment"
                    value={newCALabel}
                    onChange={(e) => setNewCALabel(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCA()}
                    className="flex-1 rounded-lg border-2 border-border bg-card px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    autoFocus
                  />
                  <button onClick={() => setShowAddCA(false)} className="rounded-lg border-2 border-border px-3 py-2 text-sm font-black text-foreground">✕</button>
                  <button
                    onClick={addCA}
                    disabled={!newCALabel.trim()}
                    className="rounded-lg bg-primary px-3 py-2 text-sm font-black text-primary-foreground disabled:opacity-30"
                  >Add</button>
                </div>
              </motion.div>
            ) : (
              <button
                onClick={() => setShowAddCA(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-2 text-sm font-black text-muted-foreground active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" /> Add CA Item
              </button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className="w-full rounded-2xl bg-secondary border-2 border-foreground py-4 font-black text-foreground flex items-center justify-center gap-2 card-shadow active:translate-y-0.5 active:shadow-none transition-all"
      >
        <Check className="h-5 w-5" />
        Save
      </button>
    </div>
  );
}
