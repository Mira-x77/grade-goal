import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface TourStep {
  titleKey: string;
  contentKey: string;
  target: string;
  duration: number;
  actionKey?: string;
}

function getGradingSystem(): string {
  try {
    const raw = localStorage.getItem("scoretarget_state");
    return JSON.parse(raw ?? "")?.settings?.gradingSystem ?? "apc";
  } catch { return "apc"; }
}

const apcSteps: TourStep[] = [
  {
    target: "body",
    titleKey: "tourWelcomeTitle",
    contentKey: "tourWelcomeContent",
    duration: 4500,
  },
  {
    target: ".tour-header-actions",
    titleKey: "tourHeaderActionsTitle",
    contentKey: "tourHeaderActionsContent",
    duration: 4000,
    actionKey: "tourHeaderActionsAction",
  },
  {
    target: ".tour-dashboard",
    titleKey: "tourDashboardTitle",
    contentKey: "tourDashboardContent",
    duration: 4500,
    actionKey: "tourDashboardAction",
  },
  {
    target: ".tour-checklist",
    titleKey: "tourChecklistTitle",
    contentKey: "tourChecklistContent",
    duration: 4500,
    actionKey: "tourChecklistAction",
  },
  {
    target: ".tour-subjects-carousel",
    titleKey: "tourSubjectsCarouselTitle",
    contentKey: "tourSubjectsCarouselContent",
    duration: 4000,
    actionKey: "tourSubjectsCarouselAction",
  },
  {
    target: ".tour-recent-activity",
    titleKey: "tourRecentActivityTitle",
    contentKey: "tourRecentActivityContent",
    duration: 4000,
  },
  {
    target: ".tour-add-mark",
    titleKey: "tourAddMarkTitle",
    contentKey: "tourAddMarkContent",
    duration: 4000,
    actionKey: "tourAddMarkAction",
  },
  {
    target: ".tour-strategizer",
    titleKey: "tourStrategizerTitle",
    contentKey: "tourStrategizerContent",
    duration: 4500,
    actionKey: "tourStrategizerAction",
  },
  {
    target: ".tour-library",
    titleKey: "tourLibraryTitle",
    contentKey: "tourLibraryContent",
    duration: 4000,
    actionKey: "tourLibraryAction",
  },
  {
    target: ".tour-feedback",
    titleKey: "tourFeedbackTitle",
    contentKey: "tourFeedbackContent",
    duration: 4500,
    actionKey: "tourFeedbackAction",
  },
];

const nigerianSteps: TourStep[] = [
  { target: "body", titleKey: "tourWelcomeTitle", contentKey: "tourWelcomeContent", duration: 4500 },
  { target: ".tour-dashboard", titleKey: "tourNigerianGpaTitle", contentKey: "tourNigerianGpaContent", duration: 4500, actionKey: "tourDashboardAction" },
  { target: ".tour-checklist", titleKey: "tourChecklistTitle", contentKey: "tourChecklistContent", duration: 4500, actionKey: "tourChecklistAction" },
  { target: ".tour-subjects-carousel", titleKey: "tourNigerianCoursesTitle", contentKey: "tourNigerianCoursesContent", duration: 4000 },
  { target: ".tour-recent-activity", titleKey: "tourRecentActivityTitle", contentKey: "tourRecentActivityContent", duration: 4000 },
  { target: ".tour-add-mark", titleKey: "tourNigerianAddScoreTitle", contentKey: "tourNigerianAddScoreContent", duration: 4000, actionKey: "tourAddMarkAction" },
  { target: ".tour-feedback", titleKey: "tourFeedbackTitle", contentKey: "tourFeedbackContent", duration: 4500, actionKey: "tourFeedbackAction" },
];

const PADDING = 10;

export default function ProductTour() {
  const { t } = useLanguage();
  const [run, setRun] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const gradingSystem = getGradingSystem();
  const isNigerian = gradingSystem === "nigerian_university";
  const steps = isNigerian ? nigerianSteps : apcSteps;

  const tSafe = (key: string, fallback: string) => {
    const result = t(key as Parameters<typeof t>[0]);
    return result === key ? fallback : result;
  };

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const segmentStartRef = useRef(0);

  useEffect(() => {
    const seen = localStorage.getItem("scoretarget_tour_seen");
    if (seen) return;
    const t = setTimeout(() => {
      const raw = localStorage.getItem("scoretarget_state");
      let hasData = false;
      if (raw) {
        try { hasData = JSON.parse(raw)?.subjects?.length > 0; } catch {}
      }
      if (hasData) setRun(true);
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const updateRect = useCallback(() => {
    const s = steps[step];
    if (!s || s.target === "body") { setRect(null); return; }
    const el = document.querySelector(s.target);
    if (el) {
      setRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setRect(null);
    }
  }, [step]);

  const finish = useCallback(() => {
    setRun(false);
    localStorage.setItem("scoretarget_tour_seen", "true");
  }, []);

  const advance = useCallback(() => {
    elapsedRef.current = 0;
    // Find next step whose target exists (or is "body")
    let next = step + 1;
    while (next < steps.length) {
      const s = steps[next];
      if (s.target === "body" || document.querySelector(s.target)) break;
      next++;
    }
    if (next < steps.length) {
      setStep(next);
    } else {
      finish();
    }
  }, [step, finish]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const startTimer = useCallback((alreadyElapsed: number) => {
    const duration = steps[step].duration;
    const remaining = duration - alreadyElapsed;
    if (remaining <= 0) { advance(); return; }
    segmentStartRef.current = performance.now();
    const tick = () => {
      const segElapsed = performance.now() - segmentStartRef.current;
      const totalElapsed = alreadyElapsed + segElapsed;
      const p = Math.min(totalElapsed / duration, 1);
      setProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    timerRef.current = setTimeout(advance, remaining);
  }, [step, advance]);

  useEffect(() => {
    if (!run) return;
    const prev = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = prev;
      document.body.style.touchAction = prevTouch;
    };
  }, [run]);

  useEffect(() => {
    if (!run) return;
    // Skip step if its target doesn't exist in the DOM
    const s = steps[step];
    if (s.target !== "body" && !document.querySelector(s.target)) {
      advance();
      return;
    }
    elapsedRef.current = 0;
    setProgress(0);
    setPaused(false);
    startTimer(0);
    return stopTimer;
  }, [run, step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!run) return;
    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [run, step, updateRect]);

  const handlePressStart = useCallback(() => {
    if (!run) return;
    if (steps[step].actionKey === "tourAddMarkAction") return;
    const segElapsed = performance.now() - segmentStartRef.current;
    elapsedRef.current = elapsedRef.current + segElapsed;
    stopTimer();
    setPaused(true);
  }, [run, step, stopTimer]);

  const handlePressEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!run) return;
    if (steps[step].actionKey === "tourAddMarkAction") {
      advance();
      return;
    }
    if (!paused) return;
    setPaused(false);
    startTimer(elapsedRef.current);
  }, [run, step, paused, startTimer, advance]);

  if (!run) return null;

  const nigerianFallbacks: Record<string, string> = {
    tourNigerianGpaTitle: "Your GPA",
    tourNigerianGpaContent: "This is your current GPA out of 5.00. Tap it to see your full breakdown by course and semester.",
    tourNigerianCoursesTitle: "Your Courses",
    tourNigerianCoursesContent: "All your courses at a glance with credit units and current scores.",
    tourNigerianAddScoreTitle: "Log a Score",
    tourNigerianAddScoreContent: "Tap + to add or update assessment scores for any course.",
  };

  const current = steps[step];
  const title = tSafe(current.titleKey, nigerianFallbacks[current.titleKey] ?? current.titleKey);
  const content = tSafe(current.contentKey, nigerianFallbacks[current.contentKey] ?? current.contentKey);
  const action = current.actionKey ? tSafe(current.actionKey, current.actionKey) : undefined;
  const isCenter = current.target === "body" || !rect;

  const SAFE_TOP = 56;
  const SAFE_BOTTOM = 100;
  const SIDE_PAD = 16;

  const tooltipStyle: React.CSSProperties = (() => {
    const h = { left: SIDE_PAD, right: SIDE_PAD };
    if (isCenter) return { position: "fixed" as const, ...h, top: "50%", transform: "translateY(-50%)" };
    const spaceBelow = window.innerHeight - rect!.bottom - SAFE_BOTTOM;
    const spaceAbove = rect!.top - SAFE_TOP;
    if (spaceBelow >= 140 || spaceBelow >= spaceAbove) {
      return { position: "fixed" as const, ...h, top: Math.min(rect!.bottom + PADDING + 8, window.innerHeight - SAFE_BOTTOM - 180) };
    }
    return { position: "fixed" as const, ...h, bottom: Math.min(window.innerHeight - rect!.top + PADDING + 8, window.innerHeight - SAFE_TOP - 180) };
  })();

  return (
    <AnimatePresence>
      {run && (
        <>
          {/* Full-screen hold-to-pause capture layer — blocks all interaction */}
          <div
            className="fixed inset-0 z-[9997]"
            style={{ touchAction: "none" }}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onTouchCancel={handlePressEnd}
            onContextMenu={(e) => e.preventDefault()}
          />

          {/* Dimmed overlay */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] pointer-events-none"
          >
            <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
              <defs>
                <mask id="tour-mask">
                  <rect width="100%" height="100%" fill="white" />
                  {rect && (
                    <rect
                      x={rect.left - PADDING} y={rect.top - PADDING}
                      width={rect.width + PADDING * 2} height={rect.height + PADDING * 2}
                      rx="14" fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#tour-mask)" />
            </svg>
          </motion.div>

          {/* Spotlight ring */}
          {rect && (
            <motion.div
              key={`ring-${step}`}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              style={{
                position: "fixed",
                left: rect.left - PADDING, top: rect.top - PADDING,
                width: rect.width + PADDING * 2, height: rect.height + PADDING * 2,
                borderRadius: 14,
                border: "2.5px solid hsl(var(--secondary))",
                boxShadow: "0 0 0 4px hsl(var(--secondary) / 0.25)",
                zIndex: 9999,
                pointerEvents: "none",
              }}
            />
          )}

          {/* Tooltip — purely informational, no interactive elements */}
          <motion.div
            key={`tip-${step}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ ...tooltipStyle, zIndex: 10000, position: "fixed", pointerEvents: "none" }}
          >
            <div className="bg-card border-2 border-foreground rounded-2xl p-5 card-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="font-black text-foreground text-sm">{title}</p>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {step + 1} / {steps.length}
                </span>
              </div>

              <p className="text-sm text-muted-foreground font-semibold leading-relaxed">
                {content}
              </p>

              {action && (
                <p className="text-xs font-black text-secondary mt-2">→ {action}</p>
              )}

              {/* Progress bar */}
              <div className="mt-4 h-1 rounded-full bg-muted-foreground/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-secondary transition-none"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>

              <p className="text-[10px] font-bold text-muted-foreground text-center mt-2">
                {paused ? t("tourPaused") : t("tourHoldToPause")}
              </p>

              {/* Step dots */}
              <div className="flex gap-1 items-center justify-center mt-3">
                {steps.map((_, i) => (
                  <div key={i} className="rounded-full transition-all duration-200"
                    style={{
                      width: i === step ? 18 : 6, height: 6,
                      background: i <= step ? "hsl(var(--secondary))" : "hsl(var(--muted-foreground) / 0.3)",
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
