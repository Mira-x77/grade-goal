import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ChevronDown, AlertTriangle, GraduationCap, Target } from "lucide-react";
import type { NigerianState, NigerianSemester, NigerianCourse } from "@/types/nigerian";
import {
  scoreToGrade,
  computeGP,
  computeSemesterGPA,
  computeCGPA,
  computeRequiredGPA,
  classifyDegree,
  validateScore,
  validateCreditUnits,
} from "@/lib/grading-nigerian";

interface NigerianDashboardProps {
  nigerianState: NigerianState;
  onStateChange: (state: NigerianState) => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function recomputeState(state: NigerianState): NigerianState {
  const semesters = state.semesters.map((sem) => {
    const courses = sem.courses.map((c) => {
      const { letter, points } = scoreToGrade(c.score);
      return { ...c, letter, gradePoints: points, gp: computeGP(c.score, c.creditUnits) };
    });
    return { ...sem, courses, gpa: computeSemesterGPA(courses) };
  });
  const cgpa = computeCGPA(semesters);
  const classOfDegree = classifyDegree(cgpa);
  return { ...state, semesters, cgpa, classOfDegree };
}

function classOfDegreeBadgeColor(cls: string): string {
  if (cls === "First Class") return "bg-success/15 text-success border-success/30";
  if (cls === "Second Class Upper") return "bg-primary/15 text-primary border-primary/30";
  if (cls === "Second Class Lower") return "bg-warning/15 text-warning border-warning/30";
  if (cls === "Third Class") return "bg-orange-500/15 text-orange-500 border-orange-500/30";
  if (cls === "Pass") return "bg-muted text-muted-foreground border-border";
  return "bg-danger/15 text-danger border-danger/30";
}

// ── Add Semester Modal ────────────────────────────────────────────────────────

interface AddSemesterModalProps {
  onAdd: (sessionLabel: string, name: string) => void;
  onClose: () => void;
}

function AddSemesterModal({ onAdd, onClose }: AddSemesterModalProps) {
  const [sessionLabel, setSessionLabel] = useState("");
  const [semName, setSemName] = useState("");

  const canSubmit = sessionLabel.trim().length > 0 && semName.trim().length > 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/50"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="fixed inset-x-4 bottom-4 z-[101] bg-card rounded-3xl card-shadow overflow-hidden"
      >
        <div className="px-5 pt-5 pb-2">
          <h2 className="text-base font-black text-foreground">Add Semester</h2>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">Enter the session and semester details</p>
        </div>
        <div className="px-5 pb-3 flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">Session (e.g. 2023/2024)</label>
            <input
              type="text"
              placeholder="2023/2024"
              value={sessionLabel}
              onChange={(e) => setSessionLabel(e.target.value)}
              className="w-full rounded-xl border-2 border-border bg-muted px-4 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">Semester name</label>
            <input
              type="text"
              placeholder="First Semester"
              value={semName}
              onChange={(e) => setSemName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && onAdd(sessionLabel.trim(), semName.trim())}
              className="w-full rounded-xl border-2 border-border bg-muted px-4 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border-2 border-border py-3 text-sm font-extrabold text-foreground active:scale-95 transition-transform"
          >
            Cancel
          </button>
          <button
            onClick={() => canSubmit && onAdd(sessionLabel.trim(), semName.trim())}
            disabled={!canSubmit}
            className="flex-1 rounded-2xl bg-primary py-3 text-sm font-extrabold text-primary-foreground active:scale-95 transition-transform disabled:opacity-30 disabled:pointer-events-none"
          >
            Add
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Course Entry Form ─────────────────────────────────────────────────────────

interface CourseFormProps {
  semesterId: string;
  onAdd: (semesterId: string, name: string, creditUnits: number, score: number) => void;
}

function CourseForm({ semesterId, onAdd }: CourseFormProps) {
  const [name, setName] = useState("");
  const [creditUnits, setCreditUnits] = useState("");
  const [score, setScore] = useState("");
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [cuError, setCuError] = useState<string | null>(null);

  const handleScoreChange = (val: string) => {
    setScore(val);
    const num = Number(val);
    if (val === "") { setScoreError(null); return; }
    setScoreError(validateScore(Math.floor(num)));
  };

  const handleCuChange = (val: string) => {
    setCreditUnits(val);
    const num = Number(val);
    if (val === "") { setCuError(null); return; }
    setCuError(validateCreditUnits(Math.floor(num)));
  };

  const canSubmit =
    name.trim().length > 0 &&
    creditUnits !== "" &&
    score !== "" &&
    scoreError === null &&
    cuError === null;

  const handleAdd = () => {
    if (!canSubmit) return;
    const cu = Math.floor(Number(creditUnits));
    const sc = Math.floor(Number(score));
    const cuErr = validateCreditUnits(cu);
    const scErr = validateScore(sc);
    if (cuErr) { setCuError(cuErr); return; }
    if (scErr) { setScoreError(scErr); return; }
    onAdd(semesterId, name.trim(), cu, sc);
    setName("");
    setCreditUnits("");
    setScore("");
    setScoreError(null);
    setCuError(null);
  };

  return (
    <div className="rounded-2xl bg-muted/40 border-2 border-dashed border-border p-3 flex flex-col gap-2">
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Add Course</p>
      <input
        type="text"
        placeholder="Course name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-xl border-2 border-border bg-card px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="number"
            placeholder="Units (1–6)"
            value={creditUnits}
            min={1}
            max={6}
            onChange={(e) => handleCuChange(e.target.value)}
            className={`w-full rounded-xl border-2 bg-card px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${
              cuError ? "border-danger focus:border-danger" : "border-border focus:border-primary"
            }`}
          />
          {cuError && <p className="text-[10px] font-bold text-danger mt-0.5 px-1">{cuError}</p>}
        </div>
        <div className="flex-1">
          <input
            type="number"
            placeholder="Score (0–100)"
            value={score}
            min={0}
            max={100}
            onChange={(e) => handleScoreChange(e.target.value)}
            className={`w-full rounded-xl border-2 bg-card px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${
              scoreError ? "border-danger focus:border-danger" : "border-border focus:border-primary"
            }`}
          />
          {scoreError && <p className="text-[10px] font-bold text-danger mt-0.5 px-1">{scoreError}</p>}
        </div>
      </div>
      <button
        onClick={handleAdd}
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-extrabold text-primary-foreground active:scale-95 transition-transform disabled:opacity-30 disabled:pointer-events-none"
      >
        <Plus className="h-4 w-4" />
        Add Course
      </button>
    </div>
  );
}

// ── Semester Card ─────────────────────────────────────────────────────────────

interface SemesterCardProps {
  semester: NigerianSemester;
  index: number;
  onAddCourse: (semesterId: string, name: string, creditUnits: number, score: number) => void;
  onRemoveCourse: (semesterId: string, courseId: string) => void;
}

function SemesterCard({ semester, index, onAddCourse, onRemoveCourse }: SemesterCardProps) {
  const [open, setOpen] = useState(true);

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl bg-card border-2 border-border overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 active:bg-muted/40 transition-colors"
      >
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {semester.sessionLabel}
          </span>
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
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 pt-3 pb-4 flex flex-col gap-3">
              {/* Course list */}
              {semester.courses.length > 0 && (
                <div className="flex flex-col gap-1">
                  {/* Column headers */}
                  <div className="flex items-center px-1 mb-0.5">
                    <span className="flex-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Course</span>
                    <span className="w-8 text-center text-[9px] font-black text-muted-foreground uppercase tracking-widest">CU</span>
                    <span className="w-10 text-center text-[9px] font-black text-muted-foreground uppercase tracking-widest">Score</span>
                    <span className="w-8 text-center text-[9px] font-black text-muted-foreground uppercase tracking-widest">Grade</span>
                    <span className="w-8 text-center text-[9px] font-black text-muted-foreground uppercase tracking-widest">GP</span>
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
                          course.letter === "A" ? "text-success"
                          : course.letter === "B" ? "text-primary"
                          : course.letter === "C" ? "text-warning"
                          : course.letter === "F" ? "text-danger"
                          : "text-muted-foreground"
                        }`}>{course.letter}</span>
                        <span className="w-8 text-center text-xs font-bold text-foreground">{course.gp}</span>
                        <button
                          onClick={() => onRemoveCourse(semester.id, course.id)}
                          className="w-8 flex items-center justify-center text-destructive/50 hover:text-destructive transition-colors active:scale-90"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Course entry form */}
              <CourseForm semesterId={semester.id} onAdd={onAddCourse} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function NigerianDashboard({ nigerianState, onStateChange }: NigerianDashboardProps) {
  const [showAddSemester, setShowAddSemester] = useState(false);

  const { semesters, cgpa, classOfDegree, targetCGPA, remainingCreditUnits } = nigerianState;

  // Compute required GPA
  const allCourses = semesters.flatMap((s) => s.courses);
  const completedCU = allCourses.reduce((sum, c) => sum + c.creditUnits, 0);
  const cumulativeGP = allCourses.reduce((sum, c) => sum + c.gp, 0);

  const requiredGPA =
    targetCGPA !== null && remainingCreditUnits > 0
      ? computeRequiredGPA(targetCGPA, completedCU, cumulativeGP, remainingCreditUnits)
      : null;

  const targetUnachievable = requiredGPA !== null && requiredGPA > 5.0;
  const isFinished = remainingCreditUnits === 0;

  // ── event handlers ──

  const handleAddCourse = (semesterId: string, name: string, creditUnits: number, score: number) => {
    const { letter, points } = scoreToGrade(score);
    const newCourse: NigerianCourse = {
      id: crypto.randomUUID(),
      name,
      creditUnits,
      score,
      letter,
      gradePoints: points,
      gp: computeGP(score, creditUnits),
    };
    const updated: NigerianState = {
      ...nigerianState,
      semesters: nigerianState.semesters.map((sem) =>
        sem.id === semesterId ? { ...sem, courses: [...sem.courses, newCourse] } : sem
      ),
    };
    onStateChange(recomputeState(updated));
  };

  const handleRemoveCourse = (semesterId: string, courseId: string) => {
    const updated: NigerianState = {
      ...nigerianState,
      semesters: nigerianState.semesters.map((sem) =>
        sem.id === semesterId
          ? { ...sem, courses: sem.courses.filter((c) => c.id !== courseId) }
          : sem
      ),
    };
    onStateChange(recomputeState(updated));
  };

  const handleAddSemester = (sessionLabel: string, name: string) => {
    const newSem: NigerianSemester = {
      id: crypto.randomUUID(),
      name,
      sessionLabel,
      courses: [],
      gpa: 0,
    };
    onStateChange(recomputeState({ ...nigerianState, semesters: [...nigerianState.semesters, newSem] }));
    setShowAddSemester(false);
  };

  const handleTargetCGPAChange = (val: string) => {
    const num = parseFloat(val);
    const target = isNaN(num) ? null : Math.min(5, Math.max(0, num));
    onStateChange({ ...nigerianState, targetCGPA: target });
  };

  const handleRemainingCUChange = (val: string) => {
    const num = parseInt(val, 10);
    onStateChange({ ...nigerianState, remainingCreditUnits: isNaN(num) ? 0 : Math.max(0, num) });
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-2 pb-28">

      {/* ── CGPA Hero Card ── */}
      <motion.div
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="rounded-2xl bg-card border-2 border-border overflow-hidden"
      >
        <div className="flex items-stretch px-4 py-4 gap-4">
          <div className="flex flex-col items-center justify-center flex-1 gap-0.5">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">CGPA</span>
            <span className="text-5xl font-black leading-none text-foreground">{cgpa.toFixed(2)}</span>
          </div>
          <div className="w-px bg-border/40 self-stretch" />
          <div className="flex flex-col items-center justify-center flex-1 gap-1.5">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Class of Degree</span>
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${classOfDegreeBadgeColor(classOfDegree)}`}>
                {classOfDegree}
              </span>
            </div>
          </div>
        </div>

        {/* CGPA progress bar */}
        <div className="px-4 pb-4">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(cgpa / 5) * 100}%` }}
              transition={{ delay: 0.2, type: "spring", stiffness: 60 }}
            />
          </div>
        </div>
      </motion.div>

      {/* ── Final result (when no remaining CU) ── */}
      {isFinished && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-2xl bg-success/10 border-2 border-success/30 p-4 flex items-center gap-3"
        >
          <GraduationCap className="h-5 w-5 text-success shrink-0" />
          <div>
            <p className="text-sm font-black text-success">Final Result</p>
            <p className="text-xs font-semibold text-success/80">
              CGPA {cgpa.toFixed(2)} — {classOfDegree}
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Target CGPA & Required GPA ── */}
      {!isFinished && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card border-2 border-border p-4 flex flex-col gap-3"
        >
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-black text-foreground">Target CGPA</span>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Target CGPA (0.00–5.00)</label>
              <input
                type="number"
                placeholder="e.g. 4.50"
                value={targetCGPA ?? ""}
                min={0}
                max={5}
                step={0.01}
                onChange={(e) => handleTargetCGPAChange(e.target.value)}
                className="w-full rounded-xl border-2 border-border bg-muted px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Remaining Credit Units</label>
              <input
                type="number"
                placeholder="e.g. 60"
                value={remainingCreditUnits || ""}
                min={0}
                onChange={(e) => handleRemainingCUChange(e.target.value)}
                className="w-full rounded-xl border-2 border-border bg-muted px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Required GPA display */}
          {targetCGPA !== null && requiredGPA !== null && (
            <div className={`rounded-xl px-4 py-3 border-2 ${
              targetUnachievable
                ? "bg-danger/10 border-danger/30"
                : "bg-primary/10 border-primary/30"
            }`}>
              {targetUnachievable ? (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
                  <div>
                    <p className="text-sm font-black text-danger">Target unachievable</p>
                    <p className="text-xs font-semibold text-danger/80">
                      Required GPA would be {requiredGPA.toFixed(2)}, which exceeds the maximum of 5.00
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Required GPA</p>
                    <p className="text-xs font-semibold text-muted-foreground">in remaining {remainingCreditUnits} credit units</p>
                  </div>
                  <span className="text-3xl font-black text-primary">{requiredGPA.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Semester tree ── */}
      {semesters.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <p className="text-3xl mb-2">🎓</p>
          <p className="text-base font-black text-foreground mb-1">No semesters yet</p>
          <p className="text-sm font-semibold text-muted-foreground">Tap "Add Semester" to get started</p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3">
          {semesters.map((sem, i) => (
            <SemesterCard
              key={sem.id}
              semester={sem}
              index={i}
              onAddCourse={handleAddCourse}
              onRemoveCourse={handleRemoveCourse}
            />
          ))}
        </div>
      )}

      {/* ── Add Semester button ── */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        onClick={() => setShowAddSemester(true)}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 py-3.5 text-sm font-extrabold text-primary active:scale-[0.98] transition-all"
      >
        <Plus className="h-4 w-4" />
        Add Semester
      </motion.button>

      {/* ── Add Semester Modal ── */}
      <AnimatePresence>
        {showAddSemester && (
          <AddSemesterModal
            onAdd={handleAddSemester}
            onClose={() => setShowAddSemester(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
