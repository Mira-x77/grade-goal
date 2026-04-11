/**
 * HomeRefactored.tsx - System-Agnostic Home Screen
 * 
 * CRITICAL: This component uses ONLY the adapter layer.
 * NO direct access to AppState system-specific fields.
 * NO isNigerian checks for data access.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, ChevronRight, ChevronDown, Plus, X, Settings as SettingsIcon, User, Crown, Bell, Lightbulb, GraduationCap, FileDown, PenLine, Trash2, Pencil, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { loadState, saveState, getStreak, getHistory } from "@/lib/storage";
import { downloadService } from "@/services/downloadService";
import { getAdapter } from "@/adapters/AdapterFactory";
import { DashboardData } from "@/types/dashboard";
import TaskBar from "@/components/TaskBar";
import Mascot from "@/components/Mascot";
import ProductTour from "@/components/ProductTour";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsTablet } from "@/hooks/useIsTablet";

const Home = () => {
  const streak = getStreak();
  const history = getHistory();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const isTablet = useIsTablet();

  const [downloadedCount, setDownloadedCount] = useState(0);
  const [appState, setAppState] = useState(() => loadState());
  const [avgCardVisible, setAvgCardVisible] = useState(true);
  const avgCardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL: Use adapter to get system-agnostic dashboard data
  // ═══════════════════════════════════════════════════════════════════════════
  
  const dashboard: DashboardData | null = appState ? (() => {
    try {
      const adapter = getAdapter(appState.settings?.gradingSystem ?? 'apc');
      return adapter.toDashboardData(appState);
    } catch (error) {
      console.error('Adapter error:', error);
      return null;
    }
  })() : null;

  // ═══════════════════════════════════════════════════════════════════════════
  // Derived values from dashboard (system-agnostic)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const hasData = dashboard?.hasData ?? false;
  const isEmpty = dashboard?.isEmpty ?? true;
  const performance = dashboard?.performance;
  const segments = dashboard?.segments ?? [];
  const classification = dashboard?.classification;

  // Hero card values
  const heroValue = performance?.value ?? null;
  const heroMax = performance?.max ?? 20;
  const heroLabel = performance?.label ?? "Current Average";
  const heroSuffix = performance?.suffix ?? "/20";
  const heroTarget = performance?.target ?? null;
  const heroTargetLabel = performance?.targetLabel ?? "";
  
  const heroBarColor = heroValue === null ? "bg-muted-foreground/30"
    : heroTarget && heroValue >= heroTarget ? "bg-success"
    : heroTarget && heroValue >= heroTarget - (heroMax === 5 ? 0.5 : 2) ? "bg-warning"
    : "bg-danger";

  const heroHasData = hasData && heroValue !== null;

  // Recent activity
  const recentHistory = history.slice(-5).reverse();

  useEffect(() => {
    downloadService.getDownloadedPapers().then((papers) => setDownloadedCount(papers.length));
  }, []);

  useEffect(() => {
    if (!avgCardRef.current) return;
    const getHeaderHeight = () => headerRef.current?.getBoundingClientRect().height ?? 0;
    let observer: IntersectionObserver | null = null;

    const setup = () => {
      if (observer) observer.disconnect();
      const headerH = getHeaderHeight();
      observer = new IntersectionObserver(
        ([entry]) => setAvgCardVisible(entry.isIntersecting),
        {
          root: null,
          rootMargin: `-${headerH}px 0px 0px 0px`,
          threshold: 0,
        }
      );
      if (avgCardRef.current) observer.observe(avgCardRef.current);
    };

    const raf = requestAnimationFrame(setup);
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [hasData, heroValue]);

  // Guard: if state hasn't loaded yet, show spinner
  if (!appState || !dashboard) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background w-full pb-20">
      {/* Header */}
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border safe-area-top pb-4">
        <div className="header-inner">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between pt-2 gap-3"
          >
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-foreground truncate">
                {appState?.studentName ? `${t("hey")} ${appState?.studentName}!` : t("scoreTarget")}
              </h1>
              {(appState?.classLevel || appState?.semester) && (
                <p className="text-xs font-bold text-muted-foreground mt-0.5 truncate">
                  {[appState?.classLevel, appState?.serie ? `Série ${appState.serie}` : null, appState?.semester].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {dashboard.system !== "NIGERIAN" && (
                <button className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-premium bg-premium text-premium-foreground active:scale-95 transition-all card-shadow">
                  <Crown className="h-5 w-5" />
                </button>
              )}
              <div className="flex items-center bg-card border-2 border-foreground rounded-2xl overflow-hidden card-shadow">
                <button className="flex h-9 w-9 items-center justify-center text-foreground active:bg-muted transition-colors">
                  <Bell className="h-5 w-5" />
                </button>
                <div className="w-px h-5 bg-foreground/20" />
                {dashboard.system === "NIGERIAN" ? (
                  <Link to="/settings" className="flex h-9 w-9 items-center justify-center text-foreground active:bg-muted transition-colors">
                    <SettingsIcon className="h-5 w-5" />
                  </Link>
                ) : (
                  <Link to="/profile" className="flex h-9 w-9 items-center justify-center text-foreground active:bg-muted transition-colors">
                    <User className="h-5 w-5" />
                  </Link>
                )}
              </div>
            </div>
          </motion.div>

          {/* Sticky mini average bar */}
          <AnimatePresence>
            {heroHasData && !avgCardVisible && (
              <motion.button
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="w-full mt-2 flex items-center justify-between rounded-xl bg-card border border-border px-4 py-2 active:scale-[0.98] transition-transform"
              >
                <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">{heroLabel}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${heroBarColor} transition-all`}
                      style={{ width: `${Math.min(((heroValue ?? 0) / heroMax) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-black text-foreground">
                    {heroValue !== null ? heroValue.toFixed(heroMax === 5 ? 2 : 1) : "—"}{heroMax === 5 ? "" : "/20"}
                  </span>
                </div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="content-col flex flex-col gap-4 pb-8 pt-[calc(7rem+env(safe-area-inset-top))]">

        {/* ══════════ HERO CARD (System-Agnostic) ══════════ */}
        {heroHasData && (
          <motion.div
            ref={avgCardRef}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="tour-dashboard rounded-2xl p-5 bg-card border-2 border-foreground card-shadow"
          >
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">{heroLabel}</p>
            <div className="flex items-end justify-between gap-2">
              <div className="flex items-end gap-1">
                <span className="text-5xl font-black text-foreground">{heroValue!.toFixed(heroMax === 5 ? 2 : 1)}</span>
                <span className="text-xl font-bold text-muted-foreground mb-1">{heroSuffix}</span>
              </div>
              {heroTargetLabel && (
                <span className="text-xs font-black text-muted-foreground mb-1.5">{heroTargetLabel}</span>
              )}
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-muted border border-foreground/20 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${heroBarColor} transition-all`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((heroValue! / heroMax) * 100, 100)}%` }}
                transition={{ delay: 0.2, type: "spring", stiffness: 60 }}
              />
            </div>
            {classification && (
              <div className="mt-3 flex items-center justify-center">
                <span className={`inline-block text-sm font-black px-3 py-1 rounded-full border ${
                  classification.color === "success" ? "bg-success/15 text-success border-success/30"
                  : classification.color === "primary" ? "bg-primary/15 text-primary border-primary/30"
                  : classification.color === "warning" ? "bg-warning/15 text-warning border-warning/30"
                  : classification.color === "danger" ? "bg-danger/15 text-danger border-danger/30"
                  : "bg-muted text-muted-foreground border-border"
                }`}>{classification.label}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 py-6"
          >
            <Mascot pose="pointing" size={100} animate />
            <p className="text-sm font-black text-foreground">{t("startBySettingUp")}</p>
          </motion.div>
        )}

        {/* No data yet (has subjects but no scores) */}
        {!isEmpty && !hasData && (
          <motion.div
            ref={avgCardRef}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="tour-dashboard rounded-2xl p-5 bg-card border-2 border-border"
          >
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">{heroLabel}</p>
            <p className="text-3xl font-black text-muted-foreground/40 mb-1">—{heroSuffix}</p>
            <p className="text-sm font-semibold text-muted-foreground">{t("noMarksYet")}</p>
            <div className="mt-3 h-2.5 rounded-full bg-muted border border-foreground/10" />
          </motion.div>
        )}

        {/* Onboarding checklist */}
        {!isEmpty && (
          <div className="tour-checklist">
            <OnboardingChecklist
              steps={[
                {
                  key: "target",
                  label: dashboard.system === "NIGERIAN" ? "Set target GPA" : t("checklistSetTarget"),
                  description: dashboard.system === "NIGERIAN" ? "Set the GPA you're aiming for" : t("checklistSetTargetDesc"),
                  done: !!(heroTarget && heroTarget > 0),
                  href: "/profile",
                },
                {
                  key: "subjects",
                  label: dashboard.system === "NIGERIAN" ? "Add your courses" : t("checklistAddSubjects"),
                  description: dashboard.system === "NIGERIAN" ? "Add the courses you're taking" : t("checklistAddSubjectsDesc"),
                  done: !isEmpty,
                  href: dashboard.system === "NIGERIAN" ? "/profile" : "/planner",
                },
                {
                  key: "mark",
                  label: dashboard.system === "NIGERIAN" ? "Log a score" : t("checklistLogMark"),
                  description: dashboard.system === "NIGERIAN" ? "Enter your first assessment score" : t("checklistLogMarkDesc"),
                  done: hasData,
                  onClick: () => {}, // TODO: Open mark sheet
                },
                ...(dashboard.system !== "NIGERIAN" ? [
                  {
                    key: "simulator",
                    label: t("checklistSimulator"),
                    description: t("checklistSimulatorDesc"),
                    done: !!(appState?.savedStrategy && appState.savedStrategy.marks.length > 0),
                    href: "/simulator",
                  },
                  {
                    key: "library",
                    label: t("checklistLibrary"),
                    description: t("checklistLibraryDesc"),
                    done: downloadedCount > 0,
                    href: "/library",
                  },
                ] : []),
              ]}
            />
          </div>
        )}

        {/* Subjects/Courses at a glance */}
        {!isEmpty && segments.length > 0 && (
          <div className="tour-subjects-carousel overflow-x-auto -mx-4 px-4 pb-2 hide-scrollbar">
            <div className="flex gap-3 items-start" style={{ width: "max-content" }}>
              {segments.map(segment => (
                <div key={segment.id} className="carousel-card rounded-2xl bg-card border-2 border-border flex-shrink-0 overflow-hidden">
                  <div className="px-4 py-3">
                    <h3 className="font-black text-foreground text-sm">{segment.title}</h3>
                    {segment.subtitle && (
                      <p className="text-xs font-bold text-muted-foreground">{segment.subtitle}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 px-4 pb-4">
                    {segment.items.map(item => (
                      <div key={item.id} className="rounded-xl bg-muted/50 px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-foreground">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground">{item.weightLabel}</span>
                            <span className="text-sm font-black text-foreground">{item.scoreLabel}</span>
                            {item.grade && (
                              <span className={`text-xs font-black ${
                                item.grade === "A" ? "text-success"
                                : item.grade === "B" ? "text-primary"
                                : item.grade === "C" ? "text-warning"
                                : item.grade === "F" ? "text-danger"
                                : "text-muted-foreground"
                              }`}> · {item.grade}</span>
                            )}
                          </div>
                        </div>
                        {item.assessments.length > 0 && (
                          <div className="flex gap-1.5 mt-1.5">
                            {item.assessments.map(assessment => (
                              <div
                                key={assessment.id}
                                className={`flex-1 rounded-lg py-1 text-center text-[10px] font-black ${
                                  assessment.value !== null
                                    ? "bg-primary/15 text-primary"
                                    : "bg-muted text-muted-foreground/40"
                                }`}
                              >
                                {assessment.value !== null
                                  ? `${assessment.value.toFixed(0)}`
                                  : assessment.label.charAt(0)
                                }
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {!isEmpty && recentHistory.length > 0 && (
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="tour-recent-activity rounded-2xl bg-card border-2 border-border p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-foreground text-sm">{t("recentActivity")}</h3>
            </div>
            <div className="flex flex-col gap-2">
              {recentHistory.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <PenLine className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {entry.subjectName} · {entry.markType}
                    </p>
                    <p className="text-[10px] font-semibold text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <span className="text-sm font-black text-foreground">{entry.value.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* New user CTA */}
        {isEmpty && (
          <Link to={dashboard.system === "NIGERIAN" ? "/profile" : "/planner"} className="block">
            <div className="rounded-2xl bg-secondary border-2 border-foreground p-4 card-shadow flex items-center gap-4 active:translate-y-0.5 active:shadow-none transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-foreground bg-card">
                {dashboard.system === "NIGERIAN" ? <GraduationCap className="h-6 w-6 text-foreground" /> : <Target className="h-6 w-6 text-foreground" />}
              </div>
              <div className="flex-1">
                <h3 className="font-black text-foreground">
                  {dashboard.system === "NIGERIAN" ? "Add your courses" : t("startPlanningAction")}
                </h3>
                <p className="text-xs font-semibold text-foreground/60">
                  {dashboard.system === "NIGERIAN" ? "Set your target GPA and log your scores" : t("setTargetAddSubjects")}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-foreground" />
            </div>
          </Link>
        )}

        {/* Ideas & Feedback */}
        {!isEmpty && (
          <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}>
            <Link to="/feedback-board" className="tour-feedback flex items-center gap-3 rounded-2xl bg-card border-2 border-border p-4 active:scale-[0.98] transition-transform">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/20 border border-secondary/30 shrink-0">
                <Lightbulb className="h-5 w-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-foreground">{language === "fr" ? "Idées & Avis" : "Ideas & Feedback"}</p>
                <p className="text-[10px] font-bold text-muted-foreground">{t("tourFeedbackHint")}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          </motion.div>
        )}
      </div>

      <TaskBar action={
        !isEmpty ? (
          <button
            onClick={() => {}}
            className="tour-add-mark h-12 w-12 rounded-full bg-secondary border-2 border-foreground card-shadow flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6 text-foreground" />
          </button>
        ) : undefined
      } />

      <ProductTour />
    </div>
  );
};

export default Home;
