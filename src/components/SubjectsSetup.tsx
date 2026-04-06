import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Check, X, Search } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");

  const allSuggested = classLevel ? getSubjectsForLevel(classLevel, serie) : [];
  const existingNames = new Set(subjects.map((s) => s.name.toLowerCase()));
  const available = allSuggested
    .filter((s) => !existingNames.has(s.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const filtered = search.trim()
    ? available.filter((s) => s.toLowerCase().includes(search.toLowerCase()))
    : available;

  // Show custom option if search doesn't match any suggestion and isn't already added
  const showCustomOption =
    search.trim().length > 0 &&
    !available.some((s) => s.toLowerCase() === search.toLowerCase()) &&
    !existingNames.has(search.toLowerCase());

  const hasSubjects = subjects.length > 0;

  const openModal = () => {
    setSelected(new Set());
    setSearch("");
    setCustomName("");
    setShowAddModal(true);
  };

  const toggleSelect = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const addCustom = () => {
    const name = (customName || search).trim();
    if (!name || existingNames.has(name.toLowerCase())) return;
    const newSubject: Subject = {
      id: crypto.randomUUID(),
      name,
      coefficient: 1,
      marks: { interro: null, dev: null, compo: null },
    };
    onSubjectsChange([...subjects, newSubject]);
    setSearch("");
    setCustomName("");
    setShowAddModal(false);
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
    setSearch("");
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

  const modal = (
    <AnimatePresence>
      {showAddModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50"
            onClick={() => setShowAddModal(false)}
          />
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none px-4"
          >
            <div className="pointer-events-auto w-full max-w-sm bg-card rounded-3xl card-shadow overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                  <h2 className="text-base font-black text-foreground">Add Subjects</h2>
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

              {/* Search bar */}
              <div className="px-4 pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search or type a custom subject..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-border bg-muted text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    autoFocus
                  />
                </div>
              </div>

              {/* Custom subject option */}
              {showCustomOption && (
                <div className="px-4 pb-2">
                  <button
                    onClick={addCustom}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 text-primary active:scale-[0.98] transition-all"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                      <Plus className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    <span className="text-sm font-black">Add "{search.trim()}"</span>
                  </button>
                </div>
              )}

              {/* Divider if both custom and list shown */}
              {showCustomOption && filtered.length > 0 && (
                <div className="px-4 pb-1">
                  <p className="text-xs font-bold text-muted-foreground">Suggestions</p>
                </div>
              )}

              {/* Subject list */}
              <div className="overflow-y-auto max-h-56 px-3 pb-2">
                {filtered.length === 0 && !showCustomOption ? (
                  <p className="text-center text-sm text-muted-foreground py-8 font-semibold">
                    {available.length === 0 ? "All subjects already added" : "No matches — type to add custom"}
                  </p>
                ) : (
                  filtered.map((name) => {
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
                        <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                          isSelected ? "bg-primary border-primary" : "border-border"
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {selected.size > 0 && (
                <div className="px-5 pb-5 pt-3 border-t border-border">
                  <button
                    onClick={confirmAdd}
                    className="w-full rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground active:translate-y-0.5 transition-all"
                  >
                    Add {selected.size} Subject{selected.size > 1 ? "s" : ""}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="flex flex-col h-screen bg-background max-w-md mx-auto overflow-hidden">

      {hasSubjects && (
        <div className="pt-20 px-6 pb-2 flex-shrink-0 safe-area-top">
          <div className="flex items-center border-b border-border pb-1">
            <span className="flex-1 text-xs font-black text-muted-foreground uppercase tracking-wider">Subject</span>
            <span className="text-xs font-black text-muted-foreground uppercase tracking-wider pr-10">Coefficient</span>
          </div>
        </div>
      )}

      <div className={`flex-1 px-6 ${hasSubjects ? "overflow-y-auto" : "overflow-hidden flex flex-col items-center justify-center"}`} style={{ paddingTop: hasSubjects ? 0 : 0 }}>
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
                <button onClick={() => updateCoeff(sub.id, sub.coefficient - 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-sm font-bold text-foreground active:scale-95">−</button>
                <span className="w-6 text-center font-black text-foreground text-sm">{sub.coefficient}</span>
                <button onClick={() => updateCoeff(sub.id, sub.coefficient + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-sm font-bold text-foreground active:scale-95">+</button>
                <button onClick={() => removeSubject(sub.id)} className="ml-2 text-destructive/50 hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!hasSubjects && (
          <div className="text-center">
            <p className="text-2xl mb-2">📚</p>
            <p className="text-base font-black text-foreground mb-1">No subjects yet</p>
            <p className="text-sm font-semibold text-muted-foreground">Tap + to add your first subject</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 max-w-md mx-auto px-6 pb-10 pt-4 bg-background flex items-center gap-3">
        <motion.button
          layout
          onClick={openModal}
          animate={{ width: hasSubjects ? 56 : "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="flex h-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground card-shadow-primary active:scale-95"
          style={{ minWidth: 56 }}
        >
          <Plus className="h-7 w-7" />
        </motion.button>

        <AnimatePresence>
          {hasSubjects && (
            <motion.button
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "100%" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={onContinue}
              className="h-14 rounded-2xl bg-secondary border-2 border-foreground text-base font-extrabold text-foreground card-shadow active:translate-y-1 active:shadow-none overflow-hidden whitespace-nowrap"
            >
              NEXT
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {createPortal(modal, document.body)}
    </div>
  );
};

export default SubjectsSetup;
