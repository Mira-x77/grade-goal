import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Check, X } from "lucide-react";
import { Subject } from "@/types/exam";
import { getSubjectsForLevel } from "@/lib/subjects-data";

interface SubjectsSetupProps {
  subjects: Subject[];
  onSubjectsChange: (subjects: Subject[]) => void;
  onContinue: () => void;
  onBack: () => void;
  classLevel?: string;
  serie?: string;
}

const SubjectsSetup = ({ subjects, onSubjectsChange, onContinue, onBack: _onBack, classLevel, serie }: SubjectsSetupProps) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSuggested = classLevel ? getSubjectsForLevel(classLevel, serie) : [];
  const existingNames = new Set(subjects.map((s) => s.name.toLowerCase()));
  const available = allSuggested.filter((s) => !existingNames.has(s.toLowerCase()));
  const filteredAvailable = available;

  const hasSubjects = subjects.length > 0;

  const openModal = () => {
    setSelected(new Set());
    setShowAddModal(true);
  };

  const toggleSelect = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const confirmAdd = () => {
    const newSubjects = Array.from(selected).map((name) => ({
      id: crypto.randomUUID(),
      name,
      coefficient: 1,
      marks: { interro: null, dev: null, compo: null },
    }));
    onSubjectsChange([...subjects, ...newSubjects]);
    setSelected(new Set());
    setShowAddModal(false);
  };

  const updateCoeff = (id: string, coeff: number) => {
    onSubjectsChange(
      subjects.map((s) => (s.id === id ? { ...s, coefficient: Math.max(1, coeff) } : s))
    );
  };

  const removeSubject = (id: string) => {
    onSubjectsChange(subjects.filter((s) => s.id !== id));
  };

  const pickerContent = (
    <>
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
        <div>
          <h2 className="text-base font-black text-foreground">Your Subjects</h2>
          {selected.size > 0 && (
            <p className="text-xs font-semibold text-primary mt-0.5">{selected.size} selected</p>
          )}
        </div>
        <button
          onClick={() => setShowAddModal(false)}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground active:scale-95 transition-transform"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-y-auto max-h-72 px-3 py-2">
        {filteredAvailable.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8 font-semibold">
            {available.length === 0 ? "All subjects already added" : "No matches found"}
          </p>
        ) : (
          filteredAvailable.map((name) => {
            const isSelected = selected.has(name);
            return (
              <button
                key={name}
                onClick={() => toggleSelect(name)}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl mb-1 transition-all active:scale-[0.98] ${
                  isSelected ? "bg-primary/15 text-primary" : "hover:bg-muted/60 text-foreground"
                }`}
              >
                <span className="text-sm font-bold">{name}</span>
                {isSelected && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="px-5 pb-5 pt-3 border-t border-border">
        <button
          onClick={confirmAdd}
          disabled={selected.size === 0}
          className="w-full rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground active:translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          Add {selected.size > 0 ? `${selected.size} Subject${selected.size > 1 ? "s" : ""}` : "Subjects"}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-screen bg-background max-w-md mx-auto overflow-hidden">

      {/* Add Subject button + column headers — only when subjects exist */}
      {hasSubjects && (
        <div className="pt-20 px-6 pb-2 flex-shrink-0">
          <button
            onClick={openModal}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 py-3 text-sm font-bold text-primary active:scale-[0.98] transition-transform mb-3"
          >
            <Plus className="h-4 w-4" /> Add Subject
          </button>
          <div className="flex items-center border-b border-border pb-1">
            <span className="flex-1 text-xs font-black text-muted-foreground uppercase tracking-wider">Subject</span>
            <span className="text-xs font-black text-muted-foreground uppercase tracking-wider pr-10">Coefficient</span>
          </div>
        </div>
      )}

      {/* Subject rows — only this scrolls */}
      <div className="flex-1 overflow-y-auto px-6" style={{ paddingTop: hasSubjects ? 0 : '6rem' }}>
        <AnimatePresence>
          {subjects.map((sub, i) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -80 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center py-3.5 border-b border-border/50"
            >
              <span className="flex-1 font-bold text-foreground text-sm">{sub.name}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateCoeff(sub.id, sub.coefficient - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-sm font-bold text-foreground active:scale-95"
                >
                  −
                </button>
                <span className="w-6 text-center font-black text-foreground text-sm">{sub.coefficient}</span>
                <button
                  onClick={() => updateCoeff(sub.id, sub.coefficient + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-sm font-bold text-foreground active:scale-95"
                >
                  +
                </button>
                <button
                  onClick={() => removeSubject(sub.id)}
                  className="ml-2 text-destructive/50 hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!hasSubjects && (
          <div className="py-16 text-center text-muted-foreground font-semibold text-sm">
            No subjects yet — tap + to add one
          </div>
        )}
      </div>

      {/* Bottom area — fixed */}
      <div className="fixed bottom-0 left-0 right-0 z-30 max-w-md mx-auto px-6 pb-10 pt-4 bg-background flex flex-col items-center gap-4">
        {hasSubjects && (
          <motion.button
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={onContinue}
            className="w-full rounded-2xl bg-primary py-4 text-base font-extrabold text-primary-foreground card-shadow-primary active:translate-y-1 active:shadow-none transition-all"
          >
            NEXT
          </motion.button>
        )}

        {/* FAB — only when no subjects yet, popover anchors above it */}
        {!hasSubjects && (
          <div className="relative flex flex-col items-center">
            <AnimatePresence>
              {showAddModal && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 bg-black/50"
                    onClick={() => setShowAddModal(false)}
                  />
                  <motion.div
                    initial={{ scale: 0.92, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.92, opacity: 0, y: 10 }}
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                    className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm bg-card rounded-3xl card-shadow overflow-hidden"
                  >
                    {pickerContent}
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            <button
              onClick={openModal}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground card-shadow-primary active:scale-95 transition-transform"
            >
              <Plus className="h-7 w-7" />
            </button>
          </div>
        )}
      </div>

      {/* Modal triggered from search bar (when subjects exist) — centered */}
      {hasSubjects && (
        <AnimatePresence>
          {showAddModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/50"
                onClick={() => setShowAddModal(false)}
              />
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm bg-card rounded-3xl card-shadow overflow-hidden"
              >
                {pickerContent}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default SubjectsSetup;
