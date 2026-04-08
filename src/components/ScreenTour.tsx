/**
 * ScreenTour — lightweight per-screen tour overlay.
 * - Waits for the ScreenIntro overlay to be dismissed before starting
 *   (pass introKey matching the ScreenIntro's screenKey).
 * - Blocks all user interaction with the screen while running.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

export interface ScreenTourStep {
  titleKey: string;
  contentKey: string;
  target: string; // CSS selector or "body" for centered
  duration: number;
  actionKey?: string;
}

interface ScreenTourProps {
  storageKey: string;
  steps: ScreenTourStep[];
  /**
   * The screenKey used by the paired ScreenIntro.
   * Tour will not start until that intro has been dismissed.
   */
  introKey?: string;
  /** Delay after intro is dismissed before tour starts (ms). Default 600. */
  delay?: number;
}

const INTRO_PREFIX = "scoretarget_intro_seen_";
const PADDING = 10;

export default function ScreenTour({ storageKey, steps, introKey, delay = 600 }: ScreenTourProps) {
  const { t } = useLanguage();
  const [run, setRun] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const segmentStartRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Already completed this tour
    if (localStorage.getItem(storageKey)) return;

    const tryStart = () => {
      // If there's a paired intro, wait until it's been dismissed
      if (introKey && !localStorage.getItem(INTRO_PREFIX + introKey)) return false;
      return true;
    };

    if (tryStart()) {
      const id = setTimeout(() => setRun(true), delay);
      return () => clearTimeout(id);
    }

    // Poll every 300ms until the intro is dismissed
    pollRef.current = setInterval(() => {
      if (tryStart()) {
        if (pollRef.current) clearInterval(pollRef.current);
        setTimeout(() => setRun(true), delay);
      }
    }, 300);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [storageKey, introKey, delay]);

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
  }, [step, steps]);

  const finish = useCallback(() => {
    setRun(false);
    localStorage.setItem(storageKey, "true");
  }, [storageKey]);

  const advance = useCallback(() => {
    elapsedRef.current = 0;
    if (step < steps.length - 1) setStep(s => s + 1);
    else finish();
  }, [step, steps.length, finish]);

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
      const p = Math.min((alreadyElapsed + segElapsed) / duration, 1);
      setProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    timerRef.current = setTimeout(advance, remaining);
  }, [step, steps, advance]);

  // Lock body scroll + touch while tour is active
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

  const handlePressStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!run) return;
    e.preventDefault();
    e.stopPropagation();
    const segElapsed = performance.now() - segmentStartRef.current;
    elapsedRef.current = elapsedRef.current + segElapsed;
    stopTimer();
    setPaused(true);
  }, [run, stopTimer]);

  const handlePressEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!run) return;
    e.preventDefault();
    e.stopPropagation();
    if (!paused) return;
    setPaused(false);
    startTimer(elapsedRef.current);
  }, [run, paused, startTimer]);

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
          {/* Full-screen interaction blocker — captures all touch/mouse, holds to pause */}
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
                <mask id={`screen-tour-mask-${storageKey}`}>
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
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask={`url(#screen-tour-mask-${storageKey})`} />
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

              <div className="mt-4 h-1 rounded-full bg-muted-foreground/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-secondary transition-none"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>

              <p className="text-[10px] font-bold text-muted-foreground text-center mt-2">
                {paused ? t("tourPaused") : t("tourHoldToPause")}
              </p>

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
