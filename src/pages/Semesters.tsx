import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { loadState, saveState } from "@/lib/storage";
import { NigerianState, NigerianSemester } from "@/types/nigerian";
import TaskBar from "@/components/TaskBar";
import {
  scoreToGrade,
  computeGP,
  computeSemesterGPA,
  computeCGPA,
  classifyDegree,
  validateScore,
  validateCreditUnits,
} from "@/lib/grading-nigerian";
import { AnimatePresence } from "framer-motion";

// ── Reuse the same semester card components from Home ──────────────────────

function SemesterCard({
  semester, index, onAddCourse, onRemoveCourse,
}: {
  semester: NigerianSemester;
  index: number;
  onAddCourse: (semId: string, name: string, cu: number, score: number) => void;
  onRemoveCourse: (semId: string, courseId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [name, setName] = useState("");
  const [cu, setCu] = useState("");
  const [score, setScore] = useState("");
  const [scoreErr, setScoreErr] = useState<string | null>(null);
  const [cuErr, setCuErr] = useState<string | null>(null);
  const canAdd = name.trim().length > 0 && cu !== "" && score !== "" && !scoreErr && !cuErr;

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-2xl bg-card border-2 border-border overflow-hidden"
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 active:bg-muted/40 transition-colors"
      >
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{semester.sessionLabel}</span>
          <span className="text-sm font-black text-foreground">{semester.name}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">GPA</span>
            <span className="text-lg font-black text-foreground leading-none">{semester.gpa.toFixed(2)}</span>
          </div>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 pt-3 pb-4 flex flex-col gap-3">
              {semester.courses.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center px-1 mb-0.5">
                    <span className="flex-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Course</span>
                    <span className="w-8 text-center text-[9px] font-black text-muted-foreground uppercase">CU</span>
                    <span className="w-10 text-center text-[9px] font-black text-muted-foreground uppercase">Score</span>
                    <span className="w-8 text-center text-[9px] font-black text-muted-foreground uppercase">Grade</span>
                    <span className="w-8 text-center text-[9px] font-black text-muted-foreground uppercase">GP</span>
                    <span className="w-8" />
                  </div>
                  <AnimatePresence>
                    {semester.courses.map((course) => (
                      <motion.div
                        key={course.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        className="flex items-center rounded-xl bg-muted/50 px-3 py-2 gap-1"
                      >
                        <span className="flex-1 text-sm font-bold text-foreground truncate">{course.name}</span>
                        <span className="w-8 text-center text-xs font-bold text-muted-foreground">{course.creditUnits}</span>
                        <span className="w-10 text-center text-xs font-bold text-foreground">{course.score}</span>
                        <span className={`w-8 text-center text-xs font-black ${
                          course.letter === "A" ? "text-success" : course.letter === "B" ? "text-primary"
                          : course.letter === "C" ? "text-warning" : course.letter === "F" ? "text-danger" : "text-muted-foreground"
                        }`}>{course.letter}</span>
                        <span className="w-8 text-center text-xs font-bold text-foreground">{course.gp}</span>
                        <button
                          onClick={() => onRemoveCourse(semester.id, course.id)}
                          className="w-8 flex items-center justify-center text-destructive/50 active:text-destructive active:scale-90 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
              <div className="rounded-2xl bg-muted/40 border-2 border-dashed border-border p-3 flex flex-col gap-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Add Course</p>
                <input
                  type="text" placeholder="Course name" value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-xl border-2 border-border bg-card px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number" placeholder="Units (1–6)" value={cu} min={1} max={6}
                      onChange={e => { setCu(e.target.value); setCuErr(validateCreditUnits(Math.floor(Number(e.target.value)))); }}
                      className={`w-full rounded-xl border-2 bg-card px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${cuErr ? "border-danger" : "border-border focus:border-primary"}`}
                    />
                    {cuErr && <p className="text-[10px] font-bold text-danger mt-0.5 px-1">{cuErr}</p>}
                  </div>
                  <div className="flex-1">
                    <input
                      type="number" placeholder="Score (0–100)" value={score} min={0} max={100}
                      onChange={e => { setScore(e.target.value); setScoreErr(validateScore(Math.floor(Number(e.target.value)))); }}
                      className={`w-full rounded-xl border-2 bg-card px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${scoreErr ? "border-danger" : "border-border focus:border-primary"}`}
                    />
                    {scoreErr && <p className="text-[10px] font-bold text-danger mt-0.5 px-1">{scoreErr}</p>}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!canAdd) return;
                    onAddCourse(semester.id, name.trim(), Math.floor(Number(cu)), Math.floor(Number(score)));
                    setName(""); setCu(""); setScore(""); setScoreErr(null); setCuErr(null);
                  }}
                  disabled={!canAdd}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-extrabold text-primary-foreground active:scale-95 transition-transform disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Plus className="h-4 w-4" /> Add Course
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AddSemesterButton({ onAdd }: { onAdd: (sessionLabel: string, name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [sessionLabel, setSessionLabel] = useState("");
  const [semName, setSemName] = useState("");
  const canSubmit = sessionLabel.trim().length > 0 && semName.trim().length > 0;

  if (!open) {
    return (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 py-3.5 text-sm font-extrabold text-primary active:scale-[0.98] transition-all"
      >
        <Plus className="h-4 w-4" /> Add Semester
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border-2 border-primary/40 p-4 flex flex-col gap-3"
    >
      <p className="text-sm font-black text-foreground">New Semester</p>
      <input
        type="text" placeholder="Session (e.g. 2023/2024)" value={sessionLabel}
        onChange={e => setSessionLabel(e.target.value)} autoFocus
        className="w-full rounded-xl border-2 border-border bg-muted px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
      />
      <input
        type="text" placeholder="Semester name (e.g. First Semester)" value={semName}
        onChange={e => setSemName(e.target.value)}
        onKeyDown={e => e.key === "Enter" && canSubmit && (onAdd(sessionLabel.trim(), semName.trim()), setOpen(false), setSessionLabel(""), setSemName(""))}
        className="w-full rounded-xl border-2 border-border bg-muted px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
      />
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 rounded-xl border-2 border-border py-2.5 text-sm font-extrabold text-foreground active:scale-95 transition-transform">Cancel</button>
        <button
          onClick={() => { if (!canSubmit) return; onAdd(sessionLabel.trim(), semName.trim()); setOpen(false); setSessionLabel(""); setSemName(""); }}
          disabled={!canSubmit}
          className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-extrabold text-primary-foreground active:scale-95 transition-transform disabled:opacity-30 disabled:pointer-events-none"
        >Add</button>
      </div>
    </motion.div>
  );
}

export default function Semesters() {
  const [appState, setAppState] = useState(() => loadState());
  const [showAddForm, setShowAddForm] = useState(false);
  const [sessionLabel, setSessionLabel] = useState("");
  const [semName, setSemName] = useState("");
  const canSubmit = sessionLabel.trim().length > 0 && semName.trim().length > 0;

  const nigerianState: NigerianState = appState?.nigerianState ?? {
    semesters: [], cgpa: 0, classOfDegree: "Fail", targetCGPA: null, remainingCreditUnits: 0,
  };

  const updateNigerianState = (updated: NigerianState) => {
    if (!appState) return;
    const newState = { ...appState, nigerianState: updated };
    saveState(newState);
    setAppState(newState);
  };

  const handleAddSemester = () => {
    if (!canSubmit) return;
    const newSem = { id: crypto.randomUUID(), sessionLabel: sessionLabel.trim(), name: semName.trim(), courses: [], gpa: 0 };
    updateNigerianState({ ...nigerianState, semesters: [...nigerianState.semesters, newSem] });
    setSessionLabel(""); setSemName(""); setShowAddForm(false);
  };

  const handleAddCourse = (semId: string, name: string, cu: number, score: number) => {
    const { letter, points } = scoreToGrade(score);
    const gp = computeGP(score, cu);
    const newCourse = { id: crypto.randomUUID(), name, creditUnits: cu, score, letter, gradePoints: points, gp };
    const updated = {
      ...nigerianState,
      semesters: nigerianState.semesters.map(s =>
        s.id === semId
          ? { ...s, courses: [...s.courses, newCourse], gpa: computeSemesterGPA([...s.courses, newCourse]) }
          : s
      ),
    };
    updated.cgpa = computeCGPA(updated.semesters);
    updated.classOfDegree = classifyDegree(updated.cgpa);
    updateNigerianState(updated);
  };

  const handleRemoveCourse = (semId: string, courseId: string) => {
    const updated = {
      ...nigerianState,
      semesters: nigerianState.semesters.map(s =>
        s.id === semId
          ? { ...s, courses: s.courses.filter(c => c.id !== courseId), gpa: computeSemesterGPA(s.courses.filter(c => c.id !== courseId)) }
          : s
      ),
    };
    updated.cgpa = computeCGPA(updated.semesters);
    updated.classOfDegree = classifyDegree(updated.cgpa);
    updateNigerianState(updated);
  };

  const allCourses = nigerianState.semesters.flatMap(s => s.courses);
  const cgpa = nigerianState.semesters.length > 1 && allCourses.length > 0
    ? (() => {
        const totalGP = allCourses.reduce((sum, c) => sum + computeGP(c.score, c.creditUnits), 0);
        const totalCU = allCourses.reduce((sum, c) => sum + c.creditUnits, 0);
        return totalCU > 0 ? (totalGP / totalCU).toFixed(2) : null;
      })()
    : null;

  // Add semester form overlay
  const addSemesterOverlay = showAddForm ? (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowAddForm(false)} />
      <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none px-4 pb-[max(6rem,env(safe-area-inset-bottom))]">
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="pointer-events-auto w-full max-w-sm bg-card rounded-3xl border-2 border-foreground card-shadow p-5 flex flex-col gap-3"
        >
          <p className="text-sm font-black text-foreground">New Semester</p>
          <input
            type="text" placeholder="Session (e.g. 2023/2024)" value={sessionLabel}
            onChange={e => setSessionLabel(e.target.value)} autoFocus
            className="w-full rounded-xl border-2 border-border bg-muted px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
          <input
            type="text" placeholder="Semester name (e.g. First Semester)" value={semName}
            onChange={e => setSemName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddSemester()}
            className="w-full rounded-xl border-2 border-border bg-muted px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowAddForm(false)} className="flex-1 rounded-xl border-2 border-border py-2.5 text-sm font-extrabold text-foreground active:scale-95 transition-transform">Cancel</button>
            <button onClick={handleAddSemester} disabled={!canSubmit}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-extrabold text-primary-foreground active:scale-95 transition-transform disabled:opacity-30 disabled:pointer-events-none"
            >Add</button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  ) : null;

  return (
    <div className="min-h-screen bg-background w-full pb-28">
      <div className="content-col flex flex-col gap-4 pt-6 pb-8 safe-area-top">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground">Semesters</h1>
            {cgpa && (
              <p className="text-xs font-bold text-muted-foreground mt-0.5">
                CGPA: <span className="text-primary font-black">{cgpa}</span>
              </p>
            )}
          </div>
          {nigerianState.semesters.length > 0 && (
            <div className="text-right">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                {nigerianState.semesters.length} semester{nigerianState.semesters.length > 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>

        {/* Semester cards */}
        {nigerianState.semesters.map((sem, i) => (
          <SemesterCard
            key={sem.id}
            semester={sem}
            index={i}
            onAddCourse={handleAddCourse}
            onRemoveCourse={handleRemoveCourse}
          />
        ))}

        {nigerianState.semesters.length === 0 && (
          <div className="rounded-2xl bg-card border-2 border-border p-8 text-center">
            <p className="font-black text-foreground text-sm">No semesters yet</p>
            <p className="text-xs font-semibold text-muted-foreground mt-1">Tap + to add your first semester</p>
          </div>
        )}
      </div>

      {addSemesterOverlay}

      <TaskBar
        action={
          <button
            onClick={() => setShowAddForm(true)}
            className="h-12 w-12 rounded-full bg-secondary border-2 border-foreground card-shadow flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6 text-foreground" />
          </button>
        }
      />
    </div>
  );
}
