import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ArrowLeft, X, Check } from "lucide-react";
import type { Subject, CustomAssessment } from "@/types/exam";
import { scoreToGrade, computeGP } from "@/lib/grading-nigerian";

interface Props {
  subject: Subject;
  onSave: (updated: Subject) => void;
  onBack: () => void;
  onClose: () => void;
}

export default function NigerianAssessmentSheet({ subject, onSave, onBack, onClose }: Props) {
  const [assessments, setAssessments] = useState<CustomAssessment[]>(
    subject.customAssessments ?? []
  );
  const [newLabel, setNewLabel] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const totalWeight = assessments.reduce((s, a) => s + a.weight, 0);
  const filled = assessments.filter(a => a.value !== null);
  const weightedScore = filled.length > 0
    ? filled.reduce((s, a) => s + a.value! * a.weight, 0) / filled.reduce((s, a) => s + a.weight, 0)
    : null;
  const gradeInfo = weightedScore !== null ? scoreToGrade(Math.round(weightedScore)) : null;
  const cu = subject.creditUnits ?? 3;
  const gp = gradeInfo ? computeGP(Math.round(weightedScore!), cu) : null;

  const updateValue = (id: string, val: string) => {
    const num = val === "" ? null : Math.min(100, Math.max(0, parseFloat(val)));
    setAssessments(prev => prev.map(a => a.id === id ? { ...a, value: isNaN(num as number) ? null : num } : a));
  };

  const removeAssessment = (id: string) => {
    setAssessments(prev => prev.filter(a => a.id !== id));
  };

  const addAssessment = () => {
    const label = newLabel.trim();
    const weight = parseFloat(newWeight);
    if (!label || isNaN(weight) || weight <= 0) return;
    const value = newValue === "" ? null : Math.min(100, Math.max(0, parseFloat(newValue)));
    setAssessments(prev => [...prev, {
      id: crypto.randomUUID(),
      label,
      weight,
      value: isNaN(value as number) ? null : value,
    }]);
    setNewLabel("");
    setNewWeight("");
    setNewValue("");
    setShowAddForm(false);
  };

  const handleSave = () => {
    onSave({ ...subject, customAssessments: assessments });
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

      {/* Grade summary */}
      {gradeInfo && (
        <div className="rounded-2xl bg-primary/10 border-2 border-primary/30 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Current Score</p>
            <p className="text-2xl font-black text-foreground">{weightedScore!.toFixed(1)}<span className="text-sm text-muted-foreground">/100</span></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Grade · GP</p>
            <p className="text-2xl font-black text-primary">{gradeInfo.letter} · {gp}</p>
          </div>
        </div>
      )}

      {/* Weight warning */}
      {totalWeight !== 100 && assessments.length > 0 && (
        <p className="text-xs font-bold text-warning text-center">
          Weights sum to {totalWeight}% (should be 100%)
        </p>
      )}

      {/* Assessment list */}
      <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
        <AnimatePresence>
          {assessments.map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-foreground truncate">{a.label}</p>
                <p className="text-[10px] font-bold text-muted-foreground">{a.weight}% weight</p>
              </div>
              <input
                type="number"
                min={0}
                max={100}
                placeholder="—"
                value={a.value ?? ""}
                onChange={(e) => updateValue(a.id, e.target.value)}
                className="w-20 rounded-xl border-2 border-border bg-card px-2 py-1.5 text-center font-bold text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none text-sm"
              />
              <span className="text-xs font-bold text-muted-foreground">/100</span>
              <button onClick={() => removeAssessment(a.id)} className="text-destructive/50 hover:text-destructive active:scale-90 transition-all">
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add assessment form */}
      <AnimatePresence>
        {showAddForm ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 p-3 flex flex-col gap-2">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">New Assessment</p>
              <input
                type="text"
                placeholder="Name (e.g. Test 1, Exam)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full rounded-xl border-2 border-border bg-card px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                autoFocus
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="Weight %"
                    value={newWeight}
                    min={1}
                    max={100}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="w-full rounded-xl border-2 border-border bg-card px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="Score (optional)"
                    value={newValue}
                    min={0}
                    max={100}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full rounded-xl border-2 border-border bg-card px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 rounded-xl border-2 border-border py-2 text-sm font-black text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={addAssessment}
                  disabled={!newLabel.trim() || !newWeight || parseFloat(newWeight) <= 0}
                  className="flex-1 rounded-xl bg-primary py-2 text-sm font-black text-primary-foreground disabled:opacity-30"
                >
                  Add
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-2.5 text-sm font-black text-muted-foreground active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add Assessment
          </button>
        )}
      </AnimatePresence>

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
