import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Check, X, Search } from "lucide-react";
import { Subject } from "@/types/exam";
import { getSubjectsForLevel, CLASS_LEVELS } from "@/lib/subjects-data";
import { useLanguage } from "@/contexts/LanguageContext";
import { createNigerianSubject } from "@/lib/nigerian-defaults";

interface SubjectsSetupProps {
  subjects: Subject[];
  onSubjectsChange: (subjects: Subject[]) => void;
  onContinue: () => void;
  onBack: () => void;
  classLevel?: string;
  serie?: string;
  isNigerian?: boolean;
}

/** Returns how many px the visual viewport is shorter than the layout viewport (i.e. keyboard height) */
function useKeyboardHeight() {
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const diff = window.innerHeight - vv.height - vv.offsetTop;
      setKbHeight(Math.max(0, diff));
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return kbHeight;
}

const SubjectsSetup = ({ subjects, onSubjectsChange, onContinue, onBack: _onBack, classLevel, serie, isNigerian }: SubjectsSetupProps) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  // "list" = main modal view, "custom" = custom subject name input view
  const [modalView, setModalView] = useState<"list" | "custom">("list");
  const { t } = useLanguage();
  const kbHeight = useKeyboardHeight();

  // Pre-populate with preset subjects when first arriving at this step
  useEffect(() => {
    if (isNigerian) return; // No presets for Nigerian users
    if (subjects.length === 0 && classLevel) {
      const isLycee = CLASS_LEVELS.lycee.includes(classLevel as any);
      // For lycée, only pre-populate if we have a série — otherwise we'd dump all subjects from all séries
      if (isLycee && !serie) return;
      const presets = getSubjectsForLevel(classLevel, serie);
      const prePopulated: Subject[] = presets.map((name) => ({
        id: crypto.randomUUID(),
        name,
        coefficient: 1,
        marks: { interro: null, dev: null, compo: null },
      }));
      if (prePopulated.length > 0) onSubjectsChange(prePopulated);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allSuggested = (!isNigerian && classLevel) ? getSubjectsForLevel(classLevel, serie) : [];
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
    setModalView("list");
    setShowAddModal(true);
  };

  const toggleSelect = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  // Called from the inline "Add [typed text]" shortcut (existing behaviour)
  const addCustomInline = () => {
    const name = search.trim();
    if (!name || existingNames.has(name.toLowerCase())) return;
    
    const customSubject: Subject = isNigerian
      ? createNigerianSubject(name, 1)
      : {
          id: crypto.randomUUID(),
          name,
          coefficient: 1,
          marks: { interro: null, dev: null, compo: null },
        };
    
    const selectedSubjects = Array.from(selected).map((n) =>
      isNigerian
        ? createNigerianSubject(n, 1)
        : {
            id: crypto.randomUUID(),
            name: n,
            coefficient: 1,
            marks: { interro: null, dev: null, compo: null },
          }
    );
    
    onSubjectsChange([...subjects, customSubject, ...selectedSubjects]);
    setSearch("");
    setCustomName("");
    setSelected(new Set());
    setShowAddModal(false);
  };

  // Called from the custom-name input view — adds to selected list and returns to list view
  const confirmCustomName = () => {
    const name = customName.trim();
    if (!name || existingNames.has(name.toLowerCase())) return;
    setSelected((prev) => new Set([...prev, name]));
    setCustomName("");
    setModalView("list");
  };

  const confirmAdd = () => {
    const newSubjects = Array.from(selected).map((name) =>
      isNigerian
        ? createNigerianSubject(name, 1)
        : {
            id: crypto.randomUUID(),
            name,
            coefficient: 1,
            marks: { interro: null, dev: null, compo: null },
          }
    );
    onSubjectsChange([...subjects, ...newSubjects]);
    setSelected(new Set());
    setSearch("");
    setShowAddModal(false);
  };

  const updateCoeff = (id: string, coeff: number) => {
    const max = isNigerian ? 6 : Infinity;
    if (isNigerian) {
      onSubjectsChange(
        subjects.map((s) => (s.id === id ? { ...s, creditUnits: Math.min(max, Math.max(1, coeff)) } : s))
      );
    } else {
      onSubjectsChange(
        subjects.map((s) => (s.id === id ? { ...s, coefficient: Math.min(max, Math.max(1, coeff)) } : s))
      );
    }
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
            style={{
              // Shift the center point up by half the keyboard height so modal stays visible
              paddingBottom: kbHeight > 0 ? kbHeight : undefined,
            }}
          >
            <div className="pointer-events-auto w-full max-w-sm bg-card rounded-3xl card-shadow overflow-hidden">

              <AnimatePresence mode="wait">

                {/* ── LIST VIEW ── */}
                {modalView === "list" && (
                  <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-3">
                      <div>
                        <h2 className="text-base font-black text-foreground">{isNigerian ? "Add Courses" : t("addSubjects")}</h2>
                        {selected.size > 0 && (
                          <p className="text-xs font-semibold text-primary mt-0.5">{selected.size} {t("selected")}</p>
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
                          placeholder={isNigerian ? "Course name…" : t("searchOrTypeSubject")}
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-border bg-muted text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Persistent "Create custom subject/course" button */}
                    {!showCustomOption && (
                      <div className="px-4 pb-2">
                        <button
                          onClick={() => { setCustomName(""); setModalView("custom"); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/40 text-muted-foreground active:scale-[0.98] transition-all"
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted-foreground/20">
                            <Plus className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-sm font-bold">{isNigerian ? "Add custom course" : "Create custom subject"}</span>
                        </button>
                      </div>
                    )}

                    {/* Inline "Add [typed text]" — appears when search has no match */}
                    {showCustomOption && (
                      <div className="px-4 pb-2">
                        <button
                          onClick={addCustomInline}
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 text-primary active:scale-[0.98] transition-all"
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                            <Plus className="h-3.5 w-3.5 text-primary-foreground" />
                          </div>
                          <span className="text-sm font-black">{t("addSubjectBtn")} "{search.trim()}"</span>
                        </button>
                      </div>
                    )}

                    {showCustomOption && filtered.length > 0 && (
                      <div className="px-4 pb-1">
                        <p className="text-xs font-bold text-muted-foreground">{t("suggestions")}</p>
                      </div>
                    )}

                    {/* Subject list — hidden for Nigerian (no presets) */}
                    {!isNigerian && (
                    <div className="overflow-y-auto max-h-56 px-3 pb-2">
                      {filtered.length === 0 && !showCustomOption ? (
                        <p className="text-center text-sm text-muted-foreground py-8 font-semibold">
                          {available.length === 0 ? t("allSubjectsAdded") : t("noMatchesTypeCustom")}
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
                    )}

                    {/* Footer */}
                    {selected.size > 0 && (
                      <div className="px-5 pb-5 pt-3 border-t border-border">
                        <button
                          onClick={confirmAdd}
                          className="w-full rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground active:translate-y-0.5 transition-all"
                        >
                          {t("addSubjectBtn")} {selected.size} {selected.size > 1 ? t("subjectsSelectedPlural") : t("subjectsSelected")}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── CUSTOM NAME INPUT VIEW ── */}
                {modalView === "custom" && (
                  <motion.div key="custom" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }}>
                    <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                      <button
                        onClick={() => setModalView("list")}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground active:scale-95 transition-transform shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <h2 className="text-base font-black text-foreground">{isNigerian ? "Add custom course" : "Create custom subject"}</h2>
                    </div>

                    <div className="px-5 pb-3">
                      <label className="text-xs font-bold text-muted-foreground mb-1.5 block">{isNigerian ? "Course name" : "Subject name"}</label>
                      <input
                        type="text"
                        placeholder={isNigerian ? "e.g. MTH 101, ENG 201…" : "e.g. Latin, Drama, Economics…"}
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && confirmCustomName()}
                        className="w-full rounded-xl border-2 border-border bg-muted px-4 py-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                        autoFocus
                      />
                    </div>

                    <div className="px-5 pb-5">
                      <button
                        onClick={confirmCustomName}
                        disabled={!customName.trim() || existingNames.has(customName.trim().toLowerCase())}
                        className="w-full rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground active:translate-y-0.5 transition-all disabled:opacity-30 disabled:pointer-events-none"
                      >
                        Done
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="flex flex-col h-screen bg-background w-full overflow-hidden">

      {hasSubjects && (
        <div className="px-6 pb-2 flex-shrink-0 safe-area-top" style={{ paddingTop: "calc(5rem + env(safe-area-inset-top))" }}>
          <div className="flex items-center border-b border-border pb-1">
            <span className="flex-1 text-xs font-black text-muted-foreground uppercase tracking-wider">{isNigerian ? "Course" : t("subject")}</span>
            <span className="text-xs font-black text-muted-foreground uppercase tracking-wider pr-10">{isNigerian ? "Credit Units" : t("coefficient")}</span>
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
                <button onClick={() => updateCoeff(sub.id, (isNigerian ? (sub.creditUnits ?? sub.coefficient) : sub.coefficient) - 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-sm font-bold text-foreground active:scale-95">−</button>
                <span className="w-6 text-center font-black text-foreground text-sm">{isNigerian ? (sub.creditUnits ?? sub.coefficient) : sub.coefficient}</span>
                <button onClick={() => updateCoeff(sub.id, (isNigerian ? (sub.creditUnits ?? sub.coefficient) : sub.coefficient) + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-sm font-bold text-foreground active:scale-95">+</button>
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
            <p className="text-base font-black text-foreground mb-1">{t("noSubjectsAdded")}</p>
            <p className="text-sm font-semibold text-muted-foreground">{t("tapToAddFirst")}</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 pb-10 pt-4 bg-background">
        <div className="content-col max-w-lg mx-auto flex items-center gap-3">
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
              {t("next")}
            </motion.button>
          )}
        </AnimatePresence>
        </div>{/* /content-col */}
      </div>

      {createPortal(modal, document.body)}
    </div>
  );
};

export default SubjectsSetup;
