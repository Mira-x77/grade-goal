import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Mail, LogOut, Pencil, Check, Sun, Moon, Monitor, Zap, ChevronDown, AlertTriangle, Lightbulb, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAppTheme, AccentColor } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { loadState, saveState } from "@/lib/storage";
import { AppSettings, DEFAULT_SETTINGS, AppState, RoundingMode } from "@/types/exam";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import TaskBar from "@/components/TaskBar";
import { cacheService } from "@/services/cacheService";
import { downloadService } from "@/services/downloadService";
import { useIsTablet } from "@/hooks/useIsTablet";

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isTablet = useIsTablet();
  const sheetVariants = {
    hidden:  isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: "100%" },
    visible: isTablet ? { x: "-50%", y: "-50%", scale: 1,    opacity: 1 } : { y: 0 },
    exit:    isTablet ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 } : { y: "100%" },
  };
  const { theme, setTheme, accent, setAccent, accentMap } = useAppTheme();
  const { language, setLang, t } = useLanguage();
  const [accentOpen, setAccentOpen] = useState(false);
  const [state, setState] = useState<AppState | null>(null);
  const [editingWeights, setEditingWeights] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(80);
  useEffect(() => {
    if (!headerRef.current) return;
    const ro = new ResizeObserver(() => {
      setHeaderHeight(headerRef.current?.getBoundingClientRect().height ?? 0);
    });
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

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
        targetMin: 16,
        subjects: [],
        settings: DEFAULT_SETTINGS,
      });
    }
  }, []);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  if (!state) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );

  const settings = state.settings;

  const updateSettings = (patch: Partial<AppSettings>) => {
    setState((s) => s ? { ...s, settings: { ...s.settings, ...patch } } : s);
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

  const wipeAll = async () => {
    try {
      // Delete actual downloaded files from filesystem
      const downloaded = await downloadService.getDownloadedPapers();
      if (downloaded.length > 0) {
        await downloadService.deleteMultiplePapers(downloaded.map(d => d.paperId));
      }
    } catch (e) {
      console.warn("Failed to delete downloaded files:", e);
    }
    try {
      await cacheService.clearAll();
    } catch (e) {
      console.warn("Failed to clear cache:", e);
    }
    localStorage.removeItem("scoretarget_state");
    localStorage.removeItem("scoretarget_history");
    localStorage.removeItem("scoretarget_streak");
    localStorage.removeItem("scoretarget_tour_seen");
    
    // Clear all per-screen intro seen states
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("scoretarget_intro_seen_")) {
        localStorage.removeItem(key);
      }
    });

    localStorage.removeItem("gostudy_accent");
    setAccent("orange");

    setState({
      step: "onboarding",
      targetAverage: 16,
      targetMin: 16,
      subjects: [],
      settings: DEFAULT_SETTINGS,
    });
    setShowWipeConfirm(false);
    toast.success(t("allDataWiped"));
    navigate("/onboarding");
  };

  return (
    <div className="min-h-screen bg-background w-full pb-20">
      {/* Header */}
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border safe-area-top py-3">
        <div className="header-inner flex items-center gap-3">
          {settings.gradingSystem === "nigerian_university" && (
            <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border-2 border-foreground card-shadow active:scale-95 transition-transform shrink-0">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
          )}
          <h1 className="text-lg font-black text-primary">{t("settings")}</h1>
        </div>
      </div>

      <div className="content-col flex flex-col gap-5 py-6" style={{ paddingTop: headerHeight + 24 }}>
        {/* Appearance */}
        <Section title={t("appearance")}>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {([
              { value: "light",    label: "Light",    icon: Sun },
              { value: "dark",     label: "Dark",     icon: Moon },
              { value: "system",   label: "System",   icon: Monitor },
              { value: "midnight", label: "Midnight", icon: Moon },
              { value: "ink",      label: "Ink",      icon: Zap },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-1.5 rounded-xl py-3 font-bold text-xs transition-all active:scale-95 border-2 ${
                  theme === value
                    ? "bg-secondary border-foreground card-shadow text-foreground"
                    : "bg-muted border-transparent text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground font-semibold mt-3">
            {t("midnightThemeDesc")}
          </p>
        </Section>

        {/* Accent Color — collapsible */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-2xl bg-card border-2 border-border overflow-hidden">
          <button
            onClick={() => setAccentOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-4 active:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 rounded-full border-2 border-foreground/20 shrink-0" style={{ backgroundColor: accentMap[accent].hex }} />
              <div className="text-left">
                <p className="font-black text-foreground text-sm">{t("accentColor")}</p>
                <p className="text-xs text-muted-foreground font-semibold">{accentMap[accent].label}</p>
              </div>
            </div>
            <motion.div animate={{ rotate: accentOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {accentOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-1 px-4 pb-4">
                  {(Object.entries(accentMap) as [AccentColor, { hsl: string; label: string; hex: string }][]).map(([key, { label, hex }]) => (
                    <button
                      key={key}
                      onClick={() => { setAccent(key); setAccentOpen(false); }}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all active:scale-[0.98] border-2 ${
                        accent === key
                          ? "border-foreground card-shadow bg-muted"
                          : "border-transparent bg-muted/50"
                      }`}
                    >
                      <span className="h-5 w-5 rounded-full border-2 border-foreground/20 shrink-0" style={{ backgroundColor: hex }} />
                      <span className="font-bold text-sm text-foreground">{label}</span>
                      {key === "orange" && <span className="text-[10px] font-black text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md ml-1">DEFAULT</span>}
                      {accent === key && <Check className="h-4 w-4 text-foreground ml-auto" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Language */}
        <Section title={t("language")}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              { value: "en" as const, label: "English", flag: "🇬🇧" },
              { value: "fr" as const, label: "Français", flag: "🇫🇷" },
            ]).map(({ value, label, flag }) => (
              <button
                key={value}
                onClick={() => setLang(value)}
                className={`flex items-center gap-2 rounded-xl px-4 py-3 font-bold text-sm transition-all active:scale-95 border-2 ${
                  language === value
                    ? "bg-secondary border-foreground card-shadow text-foreground"
                    : "bg-muted border-transparent text-muted-foreground"
                }`}
              >
                <span className="text-lg">{flag}</span>
                {label}
              </button>
            ))}
          </div>
        </Section>

        {/* Assessment Weights — APC/French only */}
        {settings.gradingSystem !== "nigerian_university" && (
        <Section title={t("assessmentWeights")} subtitle={t("editWeightsSubtitle")}>
          <div className="flex flex-col gap-3">
            {(["interro", "dev", "compo"] as const).map((type) => (
              <div key={type} className="flex items-center justify-between">
                <span className="font-bold text-foreground capitalize">
                  {type === "dev" ? t("devoir") : type === "compo" ? t("composition") : t("interro")}
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
                  <Check className="h-3.5 w-3.5" /> {t("done")}
                </button>
              ) : (
                <button
                  onClick={() => setEditingWeights(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs font-bold text-foreground active:scale-95 transition-transform"
                >
                  <Pencil className="h-3.5 w-3.5" /> {t("edit")}
                </button>
              )}
            </div>
          </div>
        </Section>
        )}

        {/* Rounding — APC/French only */}
        {settings.gradingSystem !== "nigerian_university" && (
        <Section title={t("roundingRulesTitle")}>
          <div className="flex flex-col gap-2">
            {([
              { value: "exact" as RoundingMode, label: t("exactNoRoundingLabel") },
              { value: "standard" as RoundingMode, label: t("standardRoundingLabel") },
              { value: "school" as RoundingMode, label: t("schoolRoundingLabel") },
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
        )}

        {/* French Class Data */}
        {settings.gradingSystem === "french" && state.subjects.length > 0 && (
          <Section title={t("classDataTitle")} subtitle={t("enterClassDataSubtitle")}>
            <div className="flex flex-col gap-3">
              {state.subjects.map((sub) => (
                <div key={sub.id} className="rounded-xl bg-muted/50 p-3">
                  <span className="text-sm font-bold text-foreground block mb-2">{sub.name}</span>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { field: "classAverage", label: t("classAvgLabel") },
                      { field: "classMin", label: t("min") },
                      { field: "classMax", label: t("max") },
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
                    <span className="text-[10px] font-bold text-muted-foreground">{t("appreciationLabel")}</span>
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

        {/* Notifications — APC/French only */}
        {settings.gradingSystem !== "nigerian_university" && (
        <Section title={t("notificationsTitle")}>
          <div className="flex flex-col gap-3">
            {([
              { key: "targetUnreachable" as const, label: t("alertUnreachableLabel") },
              { key: "subjectCritical" as const, label: t("alertCriticalLabel") },
              { key: "canSaveAverage" as const, label: t("alertCanSaveLabel") },
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
        )}

        <Section title={t("dataControlTitle")}>
          <div className="flex flex-col gap-2">
            <div className="rounded-xl bg-muted/50 px-4 py-3">
              <p className="text-sm font-bold text-foreground">{t("storageLocalOnly")}</p>
              <p className="text-xs text-muted-foreground font-semibold">{t("allDataStoredDevice")}</p>
            </div>
            <button
              onClick={() => setShowWipeConfirm(true)}
              className="flex items-center gap-2 rounded-xl bg-danger/15 px-4 py-3 font-bold text-danger active:scale-[0.98] transition-transform"
            >
              <Trash2 className="h-4 w-4" />
              {t("wipeAllDataBtn")}
            </button>
          </div>
        </Section>

        <Section title={t("accountTitle")}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-sm font-bold text-foreground truncate">{user?.email}</p>
            </div>
            <Link
              to="/feedback-board"
              className="flex items-center gap-3 rounded-xl bg-secondary/10 border border-secondary/30 px-4 py-3 font-bold text-foreground active:scale-[0.98] transition-transform"
            >
              <Lightbulb className="h-4 w-4 text-secondary shrink-0" />
              <div>
                <p className="text-sm font-black">{language === "fr" ? "Idées & Avis" : "Ideas & Feedback"}</p>
                <p className="text-[10px] font-semibold text-muted-foreground">
                  {language === "fr" ? "Votez ou proposez une fonctionnalité" : "Vote, suggest, or share your thoughts"}
                </p>
              </div>
            </Link>
            <button
              onClick={async () => { await signOut(); navigate("/welcome"); }}
              className="flex items-center justify-center gap-2 rounded-xl bg-danger/10 px-4 py-3 font-bold text-danger active:scale-[0.98] transition-transform"
            >
              <LogOut className="h-4 w-4" /> {t("signOut")}
            </button>
          </div>
        </Section>

        {/* Legal */}
        <Section title={t("legalSection")}>
          <div className="flex flex-col gap-2">
            <Link to="/privacy" className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3 font-bold text-foreground active:scale-[0.98] transition-transform text-sm">
              {t("privacyPolicyTitle")} <span className="text-muted-foreground">›</span>
            </Link>
            <Link to="/terms" className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3 font-bold text-foreground active:scale-[0.98] transition-transform text-sm">
              {t("termsTitle")} <span className="text-muted-foreground">›</span>
            </Link>
          </div>
        </Section>
      </div>

      <TaskBar showBack />

      {/* Wipe confirmation bottom sheet */}
      <AnimatePresence>
        {showWipeConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWipeConfirm(false)}
              className="fixed inset-0 z-50 bg-black/50"
            />
            <motion.div
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="sheet z-50 p-6 pb-10"
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-foreground/20 mx-auto mb-6" />

              {/* Warning icon */}
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/15 border-2 border-danger/30">
                  <AlertTriangle className="h-8 w-8 text-danger" />
                </div>
              </div>

              <h2 className="text-xl font-black text-foreground text-center mb-2">{t("wipeAllDataTitle")}</h2>
              <p className="text-sm font-semibold text-muted-foreground text-center leading-relaxed mb-8">
                {t("wipeAllDataDesc")}
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => wipeAll()}
                  className="w-full rounded-2xl bg-danger px-4 py-4 font-black text-white active:scale-[0.98] transition-transform"
                >
                  {t("wipeEverything")}
                </button>
                <button
                  onClick={() => setShowWipeConfirm(false)}
                  className="w-full rounded-2xl bg-muted px-4 py-4 font-bold text-muted-foreground active:scale-[0.98] transition-transform"
                >
                  {t("cancel")}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl bg-card border-2 border-border overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 active:bg-muted/50 transition-colors text-left"
      >
        <div>
          <h3 className="font-black text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground font-semibold mt-0.5">{subtitle}</p>}
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Settings;
