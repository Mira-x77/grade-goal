import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, BookOpen, Trash2 } from "lucide-react";
import { Subject } from "@/types/exam";

interface SubjectsSetupProps {
  subjects: Subject[];
  onSubjectsChange: (subjects: Subject[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

const SubjectsSetup = ({ subjects, onSubjectsChange, onContinue, onBack }: SubjectsSetupProps) => {
  const [newName, setNewName] = useState("");

  const addSubject = () => {
    if (!newName.trim()) return;
    const newSubject: Subject = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      coefficient: 1,
      marks: { interro: null, dev: null, compo: null },
    };
    onSubjectsChange([...subjects, newSubject]);
    setNewName("");
  };

  const updateCoeff = (id: string, coeff: number) => {
    onSubjectsChange(
      subjects.map((s) => (s.id === id ? { ...s, coefficient: Math.max(1, coeff) } : s))
    );
  };

  const removeSubject = (id: string) => {
    onSubjectsChange(subjects.filter((s) => s.id !== id));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col gap-6 px-6 py-8"
    >
      <div>
        <button onClick={onBack} className="text-sm font-bold text-muted-foreground mb-2">
          ← Back
        </button>
        <h2 className="text-2xl font-black text-foreground">Your subjects</h2>
        <p className="text-sm text-muted-foreground font-semibold">Add subjects & set coefficients</p>
      </div>

      {/* Add subject input */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="e.g. Maths, French..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSubject()}
          className="flex-1 rounded-xl border-2 border-border bg-card px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
        />
        <button
          onClick={addSubject}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground active:scale-95 transition-transform"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Subject list */}
      <div className="flex flex-col gap-3">
        <AnimatePresence>
          {subjects.map((sub, i) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-2xl bg-card p-4 card-shadow"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/20">
                <BookOpen className="h-5 w-5 text-secondary" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground">{sub.name}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-muted-foreground mr-1">Coeff</span>
                <button
                  onClick={() => updateCoeff(sub.id, sub.coefficient - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm font-bold text-foreground active:scale-95"
                >
                  −
                </button>
                <span className="w-8 text-center font-black text-foreground">{sub.coefficient}</span>
                <button
                  onClick={() => updateCoeff(sub.id, sub.coefficient + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm font-bold text-foreground active:scale-95"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => removeSubject(sub.id)}
                className="ml-1 text-destructive/60 hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {subjects.length === 0 && (
          <div className="py-12 text-center text-muted-foreground font-semibold">
            Add your first subject above ☝️
          </div>
        )}
      </div>

      {subjects.length > 0 && (
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={onContinue}
          className="w-full rounded-2xl bg-primary py-4 text-lg font-extrabold text-primary-foreground card-shadow-primary active:translate-y-1 active:shadow-none transition-all"
        >
          CONTINUE →
        </motion.button>
      )}
    </motion.div>
  );
};

export default SubjectsSetup;
