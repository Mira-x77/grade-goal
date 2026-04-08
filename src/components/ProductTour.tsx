import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Lightbulb } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface TourStep {
  titleKey: string;
  contentKey: string;
  durationKey?: string;
  target: string;
  duration: number;
  actionKey?: string;
}

const steps: TourStep[] = [
  {
    target: "body",
    titleKey: "tourWelcomeTitle",
    contentKey: "tourWelcomeContent",
    duration: 4000,
  },
  {
    target: ".tour-dashboard",
    titleKey: "tourDashboardTitle",
    contentKey: "tourDashboardContent",
    duration: 4500,
    actionKey: "tourDashboardAction",
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
];

const PADDING = 10;

export default function ProductTour() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [run, setRun] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  // how many ms already elapsed on this step when we last (re)started
  const elapsedRef = useRef(0);
  // when the current run segment started
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
    if (step < steps.length - 1) {
      setStep(s => s + 1);
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
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    timerRef.current = setTimeout(advance, remaining);
  }, [step, advance]);

  // Lock body scroll while tour is active
  useEffect(() => {
    if (!run) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [run]);

  // Start/restart timer when step changes or run starts
  useEffect(() => {
    if (!run) return;
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
    // On the "tap it now" step, don't pause — let the tap fall through to the element
    if (steps[step].actionKey === "tourAddMarkAction") return;
    // snapshot how much has elapsed so far
    const segElapsed = performance.now() - segmentStartRef.current;
    elapsedRef.current = elapsedRef.current + segElapsed;
    stopTimer();
    setPaused(true);
  }, [run, step, stopTimer]);

  const handlePressEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!run) return;
    // On the "tap it now" step, a tap on the highlighted target advances the tour
    if (steps[step].actionKey === "tourAddMarkAction") {
      const target = e.target as Element;
      const highlighted = rect && document.querySelector(steps[step].target);
      if (highlighted && highlighted.contains(target)) {
        advance();
        return;
      }
      // Tap anywhere else on this step also advances (user tapped, intent is clear)
      advance();
      return;
    }
    if (!paused) return;
    setPaused(false);
    startTimer(elapsedRef.current);
  }, [run, step, paused, startTimer, rect, advance]);

  if (!run) return null;

  const current = steps[step];
  const title = t(current.titleKey as Parameters<typeof t>[0]);
  const content = t(current.contentKey as Parameters<typeof t>[0]);
  const action = current.actionKey ? t(current.actionKey as Parameters<typeof t>[0]) : undefined;
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
          {/* Full-screen hold-to-pause capture layer */}
          <div
            className="fixed inset-0 z-[9997]"
            onMouseDown={handlePressStart}
            onMouseUp={(e) => handlePressEnd(e)}
            onMouseLeave={(e) => handlePressEnd(e)}
            onTouchStart={handlePressStart}
            onTouchEnd={(e) => handlePressEnd(e)}
            onTouchCancel={(e) => handlePressEnd(e)}
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

          {/* Tooltip */}
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

              {/* Feedback board shortcut — only on welcome step */}
              {step === 0 && (
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => {
                    finish();
                    navigate("/feedback-board");
                  }}
                  className="mt-3 w-full flex items-center gap-2 rounded-xl bg-secondary/20 border border-secondary/40 px-3 py-2.5 active:scale-[0.98] transition-all"
                >
                  <Lightbulb className="h-4 w-4 text-secondary shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-black text-foreground leading-none">
                      {language === "fr" ? "Tableau des idées" : "Feature Requests"}
                    </p>
                    <p className="text-[10px] font-semibold text-muted-foreground mt-0.5 leading-tight">
                      {t("tourFeedbackHint")}
                    </p>
                  </div>
                </button>
              )}

              {/* Progress bar */}
              <div className="mt-4 h-1 rounded-full bg-muted-foreground/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-secondary transition-none"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>

              {/* Hold hint — always visible, text swaps on pause */}
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
