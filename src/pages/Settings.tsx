import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Trash2, RotateCcw, Mail, LogOut, Pencil, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { loadState, saveState } from "@/lib/storage";
import { AppSettings, DEFAULT_SETTINGS, AppState, RoundingMode } from "@/types/exam";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import TaskBar from "@/components/TaskBar";

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [state, setState] = useState<AppState | null>(null);
  const [editingWeights, setEditingWeights] = useState(false);

  useEffect(() => {
    const loaded = loadState();
    if (loaded) {
      if (!loaded.settings) {
        loaded.settings = DEFAULT_SETTINGS;
      }
      // Migrate old settings missing new fields
      if (loaded.settings.gradingSystem === undefined) {
        loaded.settings.gradingSystem = "apc";
      }
      if (loaded.settings.apcWeightedSplit === undefined) {
        loaded.settings.apcWeightedSplit = false;
      }
      setState(loaded);
    } else {
      setState({
        step: "onboarding",
        targetAverage: 16,
        subjects: [],
        settings: DEFAULT_SETTINGS,
      });
    }
  }, []);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  if (!state) return null;

  const settings = state.settings;

  const updateSettings = (patch: Partial<AppSettings>) => {
    setState((s) => s ? { ...s, settings: { ...s.settings, ...patch } } : s);
  };

  const updateCoeff = (id: string, coeff: number) => {
    setState((s) =>
      s ? { ...s, subjects: s.subjects.map((sub) => sub.id === id ? { ...sub, coefficient: Math.max(1, coeff) } : sub) } : s
    );
  };

  const updateFrenchData = (id: string, field: string, value: number | null) => {
    setState((s) =>
      s ? {
        ...s,
        subjects: s.subjects.map((sub) =>
          sub.id === id
            ? { ...sub, french: { ...(sub.french || { classAverage: null, classMin: null, classMax: null, appreciation: null }), [field]: value } }
            : sub
        ),
      } : s
    );
  };

  const clearMarks = () => {
    setState((s) =>
      s ? {
        ...s,
        subjects: s.subjects.map((sub) => ({
          ...sub,
          marks: { interro: null, dev: null, compo: null },
        })),
      } : s
    );
    toast.success("All marks cleared. Subjects & coefficients kept.");
  };

  const wipeAll = () => {
    localStorage.removeItem("scoretarget_state");
    localStorage.removeItem("scoretarget_history");
    localStorage.removeItem("scoretarget_streak");
    setState({
      step: "onboarding",
      targetAverage: 16,
      subjects: [],
      settings: DEFAULT_SETTINGS,
    });
    toast.success("All data wiped.");
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-black text-primary">Settings</h1>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-6 py-6">
        {/* Assessment Weights */}
        <Section title="Assessment Weights" subtitle="Edit mark type weights">
          <div className="flex flex-col gap-3">
            {(["interro", "dev", "compo"] as const).map((type) => (
              <div key={type} className="flex items-center justify-between">
                <span className="font-bold text-foreground capitalize">
                  {type === "dev" ? "Devoir" : type === "compo" ? "Composition" : "Interro"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => editingWeights && updateSettings({
                      weights: { ...settings.weights, [type]: Math.max(1, settings.weights[type] - 1) }
                    })}
                    disabled={!editingWeights}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm font-bold text-foreground disabled:opacity-40 active:scale-95"
                  >−</button>
                  <span className="w-8 text-center font-black text-foreground">{settings.weights[type]}</span>
                  <button
                    onClick={() => editingWeights && updateSettings({
                      weights: { ...settings.weights, [type]: settings.weights[type] + 1 }
                    })}
                    disabled={!editingWeights}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm font-bold text-foreground disabled:opacity-40 active:scale-95"
                  >+</button>
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              {editingWeights ? (
                <button
                  onClick={() => setEditingWeights(false)}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground active:scale-95 transition-transform"
                >
                  <Check className="h-3.5 w-3.5" /> Done
                </button>
              ) : (
                <button
                  onClick={() => setEditingWeights(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs font-bold text-foreground active:scale-95 transition-transform"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              )}
            </div>
          </div>
        </Section>

        {/* Rounding */}
        <Section title="Rounding Rules">
          <div className="flex flex-col gap-2">
            {([
              { value: "exact" as RoundingMode, label: "Exact (no rounding)" },
              { value: "standard" as RoundingMode, label: "Standard (2 decimals)" },
              { value: "school" as RoundingMode, label: "School-style (nearest 0.25)" },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateSettings({ rounding: opt.value })}
                className={`rounded-xl px-4 py-3 text-left font-bold transition-all ${
                  settings.rounding === opt.value
                    ? "bg-primary/15 text-primary border-2 border-primary"
                    : "bg-muted text-foreground border-2 border-transparent"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Subject Coefficients */}
        {state.subjects.length > 0 && (
          <Section title="Subject Coefficients">
            <div className="flex flex-col gap-2">
              {state.subjects.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                  <span className="text-sm font-bold text-foreground">{sub.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateCoeff(sub.id, sub.coefficient - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-card text-sm font-bold text-foreground active:scale-95"
                    >−</button>
                    <span className="w-7 text-center font-black text-foreground text-sm">{sub.coefficient}</span>
                    <button
                      onClick={() => updateCoeff(sub.id, sub.coefficient + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-card text-sm font-bold text-foreground active:scale-95"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* French Class Data */}
        {settings.gradingSystem === "french" && state.subjects.length > 0 && (
          <Section title="Class Data (French System)" subtitle="Enter class averages and extremes per subject">
            <div className="flex flex-col gap-3">
              {state.subjects.map((sub) => (
                <div key={sub.id} className="rounded-xl bg-muted/50 p-3">
                  <span className="text-sm font-bold text-foreground block mb-2">{sub.name}</span>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { field: "classAverage", label: "Class Avg" },
                      { field: "classMin", label: "Min" },
                      { field: "classMax", label: "Max" },
                    ] as const).map((f) => (
                      <div key={f.field} className="flex flex-col items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          placeholder="—"
                          value={sub.french?.[f.field] ?? ""}
                          onChange={(e) => {
                            const v = e.target.value === "" ? null : parseFloat(e.target.value);
                            updateFrenchData(sub.id, f.field, v !== null && !isNaN(v) ? Math.min(20, Math.max(0, v)) : null);
                          }}
                          className="w-full rounded-lg border-2 border-border bg-card px-2 py-1.5 text-center text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-colors"
                        />
                        <span className="text-[10px] font-bold text-muted-foreground">{f.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <span className="text-[10px] font-bold text-muted-foreground">Appreciation (1-5)</span>
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          onClick={() => updateFrenchData(sub.id, "appreciation", sub.french?.appreciation === val ? null : val)}
                          className={`flex-1 h-7 rounded-lg text-xs font-bold transition-all ${
                            sub.french?.appreciation === val
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Color Thresholds */}
        <Section title="Color Feedback" subtitle="Distance from target for each color zone">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-success" />
                <span className="text-sm font-bold text-foreground">Green (on target)</span>
              </div>
              <span className="text-xs font-bold text-muted-foreground">within {settings.colorThresholds.greenBelow} pts</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-warning" />
                <span className="text-sm font-bold text-foreground">Yellow (risky)</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={settings.colorThresholds.yellowBelow}
                  onChange={(e) => updateSettings({
                    colorThresholds: { ...settings.colorThresholds, yellowBelow: parseFloat(e.target.value) || 2 }
                  })}
                  className="w-16 rounded-lg border-2 border-border bg-card px-2 py-1 text-sm font-bold text-foreground text-center focus:border-primary focus:outline-none"
                />
                <span className="text-xs font-bold text-muted-foreground">pts below</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-danger" />
              <span className="text-sm font-bold text-foreground">Red (critical)</span>
              <span className="ml-auto text-xs font-bold text-muted-foreground">beyond yellow</span>
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <div className="flex flex-col gap-3">
            {([
              { key: "targetUnreachable" as const, label: "Alert when target becomes unreachable" },
              { key: "subjectCritical" as const, label: "Alert when a subject becomes critical" },
              { key: "canSaveAverage" as const, label: "Alert when a test can still save the average" },
            ]).map((item) => (
              <label key={item.key} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-bold text-foreground">{item.label}</span>
                <button
                  onClick={() => updateSettings({
                    notifications: { ...settings.notifications, [item.key]: !settings.notifications[item.key] }
                  })}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    settings.notifications[item.key] ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-card shadow transition-transform ${
                    settings.notifications[item.key] ? "translate-x-5" : "translate-x-0.5"
                  }`} />
                </button>
              </label>
            ))}
          </div>
        </Section>

        {/* Scenario Reset */}
        <Section title="Scenario Reset">
          <div className="flex flex-col gap-2">
            <button
              onClick={clearMarks}
              className="flex items-center gap-2 rounded-xl bg-warning/15 px-4 py-3 font-bold text-warning active:scale-[0.98] transition-transform"
            >
              <RotateCcw className="h-4 w-4" />
              Clear all marks (keep subjects & coefficients)
            </button>
          </div>
        </Section>

        {/* Data & Control */}
        <Section title="Data & Control">
          <div className="flex flex-col gap-2">
            <div className="rounded-xl bg-muted/50 px-4 py-3">
              <p className="text-sm font-bold text-foreground">Storage: Local only</p>
              <p className="text-xs text-muted-foreground font-semibold">All data stored on this device</p>
            </div>
            <button
              onClick={() => {
                if (confirm("This will permanently delete ALL data. Continue?")) wipeAll();
              }}
              className="flex items-center gap-2 rounded-xl bg-danger/15 px-4 py-3 font-bold text-danger active:scale-[0.98] transition-transform"
            >
              <Trash2 className="h-4 w-4" />
              Wipe all data
            </button>
          </div>
        </Section>

        {/* Account */}
        <Section title="Account">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-sm font-bold text-foreground truncate">{user?.email}</p>
            </div>
            <button
              onClick={async () => { await signOut(); navigate("/auth"); }}
              className="flex items-center justify-center gap-2 rounded-xl bg-danger/10 px-4 py-3 font-bold text-danger active:scale-[0.98] transition-transform"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </Section>
      </div>

      <TaskBar />
    </div>
  );
};

const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <motion.div
    initial={{ y: 10, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="rounded-2xl bg-card p-5 card-shadow"
  >
    <h3 className="font-black text-foreground mb-1">{title}</h3>
    {subtitle && <p className="text-xs text-muted-foreground font-semibold mb-3">{subtitle}</p>}
    {!subtitle && <div className="mb-3" />}
    {children}
  </motion.div>
);

export default Settings;
