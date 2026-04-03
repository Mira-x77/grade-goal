import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, User, Target, BookOpen, Pencil, Check, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { loadState, saveState } from "@/lib/storage";
import { AppState } from "@/types/exam";
import { CLASS_LEVELS, LYCEE_SERIES } from "@/lib/subjects-data";
import TaskBar from "@/components/TaskBar";

const allLevels = [...CLASS_LEVELS.college, ...CLASS_LEVELS.lycee];
const isLycee = (level: string) => (CLASS_LEVELS.lycee as readonly string[]).includes(level);

const Profile = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<AppState | null>(null);
  const [editingBasic, setEditingBasic] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [editingGrading, setEditingGrading] = useState(false);
  const [draft, setDraft] = useState({ studentName: "", classLevel: "", serie: "", semester: "" });
  const [draftTarget, setDraftTarget] = useState(16);

  useEffect(() => {
    const loaded = loadState();
    if (loaded) setState(loaded);
    else navigate("/");
  }, [navigate]);

  if (!state) return null;

  const updateState = (patch: Partial<AppState>) => {
    const newState = { ...state, ...patch };
    setState(newState);
    saveState(newState);
  };

  const updateSetting = (key: string, value: any) => {
    const newState = { ...state, settings: { ...state.settings, [key]: value } };
    setState(newState);
    saveState(newState);
  };

  const startEditBasic = () => {
    setDraft({ studentName: state.studentName || "", classLevel: state.classLevel || "", serie: state.serie || "", semester: state.semester || "" });
    setEditingBasic(true);
  };

  const saveBasic = () => {
    updateState({ studentName: draft.studentName, classLevel: draft.classLevel, serie: isLycee(draft.classLevel) ? draft.serie : undefined, semester: draft.semester });
    setEditingBasic(false);
  };

  const startEditTarget = () => {
    setDraftTarget(state.targetAverage);
    setEditingTarget(true);
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-20">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-6 py-3 flex items-center justify-between safe-area-top">
        <h1 className="text-lg font-black text-primary">Your Profile</h1>
        <Link to="/settings" className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-foreground bg-card text-foreground active:scale-95 transition-all card-shadow">
          <Settings className="h-4 w-4" />
        </Link>
      </div>

      <div className="flex flex-col gap-6 px-6 py-6">

        {/* Basic Info */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-2xl bg-card p-5 border-2 border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-black text-foreground">Basic Info</h3>
            </div>
            {editingBasic ? (
              <button onClick={saveBasic} className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground active:scale-95 transition-transform">
                <Check className="h-3.5 w-3.5" /> Done
              </button>
            ) : (
              <button onClick={startEditBasic} className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-1.5 text-xs font-black text-foreground active:scale-95 transition-transform">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {editingBasic ? (
              <motion.div key="editing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-muted-foreground mb-1 block">Full Name</label>
                  <input
                    type="text"
                    value={draft.studentName}
                    onChange={(e) => setDraft((d) => ({ ...d, studentName: e.target.value }))}
                    className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 font-semibold text-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-muted-foreground mb-1 block">Class Level</label>
                  <select
                    value={draft.classLevel}
                    onChange={(e) => { const l = e.target.value; setDraft((d) => ({ ...d, classLevel: l, serie: isLycee(l) ? d.serie : "" })); }}
                    className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 font-semibold text-foreground focus:border-primary focus:outline-none transition-colors appearance-none"
                  >
                    <option value="" disabled>Select your class</option>
                    {allLevels.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                {draft.classLevel && isLycee(draft.classLevel) && (
                  <div>
                    <label className="text-sm font-bold text-muted-foreground mb-1 block">Série</label>
                    <select
                      value={draft.serie}
                      onChange={(e) => setDraft((d) => ({ ...d, serie: e.target.value }))}
                      className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 font-semibold text-foreground focus:border-primary focus:outline-none transition-colors appearance-none"
                    >
                      <option value="" disabled>Select your série</option>
                      {LYCEE_SERIES.map(s => <option key={s} value={s}>Série {s}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-sm font-bold text-muted-foreground mb-1 block">Semester</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["1st Semester", "2nd Semester", "Annual"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setDraft((d) => ({ ...d, semester: s }))}
                        className={`rounded-xl px-2 py-2.5 text-xs font-black transition-all active:scale-95 border-2 border-foreground ${
                          draft.semester === s ? "bg-secondary text-foreground card-shadow" : "bg-card text-foreground"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="viewing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <InfoRow label="Name" value={state.studentName || "—"} />
                <InfoRow label="Class" value={state.classLevel || "—"} />
                {state.classLevel && isLycee(state.classLevel) && (
                  <InfoRow label="Série" value={state.serie ? `Série ${state.serie}` : "—"} />
                )}
                <InfoRow label="Semester" value={state.semester || "—"} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Target Average */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-2xl bg-card p-5 border-2 border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                <Target className="h-5 w-5 text-secondary" />
              </div>
              <h3 className="font-black text-foreground">Target Average</h3>
            </div>
            {editingTarget ? (
              <button onClick={() => { updateState({ targetAverage: draftTarget }); setEditingTarget(false); }} className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground active:scale-95 transition-transform">
                <Check className="h-3.5 w-3.5" /> Done
              </button>
            ) : (
              <button onClick={startEditTarget} className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-1.5 text-xs font-black text-foreground active:scale-95 transition-transform">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {editingTarget ? (
              <motion.div key="editing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                <div className="text-center mb-4">
                  <span className="text-5xl font-black text-primary">{draftTarget.toFixed(1)}</span>
                  <span className="text-2xl font-bold text-muted-foreground">/20</span>
                </div>
                <input
                  type="range" min="0" max="20" step="0.5"
                  value={draftTarget}
                  onChange={(e) => setDraftTarget(parseFloat(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between w-full text-xs font-bold text-muted-foreground mt-2 px-1">
                  <span>0</span><span>10</span><span>20</span>
                </div>
              </motion.div>
            ) : (
              <motion.div key="viewing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-2">
                <span className="text-5xl font-black text-primary">{state.targetAverage.toFixed(1)}</span>
                <span className="text-2xl font-bold text-muted-foreground">/20</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Grading System */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="rounded-2xl bg-card p-5 border-2 border-border mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                <BookOpen className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-black text-foreground">Grading System</h3>
            </div>
            {editingGrading ? (
              <button onClick={() => setEditingGrading(false)} className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground active:scale-95 transition-transform">
                <Check className="h-3.5 w-3.5" /> Done
              </button>
            ) : (
              <button onClick={() => setEditingGrading(true)} className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-1.5 text-xs font-black text-foreground active:scale-95 transition-transform">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {editingGrading ? (
              <motion.div key="editing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
                <button
                  onClick={() => updateSetting("gradingSystem", "apc")}
                  className={`rounded-xl px-4 py-3 text-left transition-all ${state.settings.gradingSystem === "apc" ? "bg-primary/15 text-primary border-2 border-primary" : "bg-muted text-foreground border-2 border-transparent"}`}
                >
                  <span className="font-bold block">APC (Togolese Standard)</span>
                </button>
                <button
                  onClick={() => updateSetting("gradingSystem", "french")}
                  className={`rounded-xl px-4 py-3 text-left transition-all ${state.settings.gradingSystem === "french" ? "bg-secondary/15 text-secondary border-2 border-secondary" : "bg-muted text-foreground border-2 border-transparent"}`}
                >
                  <span className="font-bold block">French Traditional</span>
                </button>
              </motion.div>
            ) : (
              <motion.div key="viewing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <InfoRow label="System" value={state.settings.gradingSystem === "apc" ? "APC (Togolese Standard)" : "French Traditional"} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <TaskBar showBack />
    </div>
  );
};

export default Profile;

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm font-bold text-muted-foreground">{label}</span>
      <span className="text-sm font-black text-foreground">{value}</span>
    </div>
  );
}

