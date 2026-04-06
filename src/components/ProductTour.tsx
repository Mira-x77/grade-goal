import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";

interface TourStep {
  target: string;
  title: string;
  content: string;
}

const steps: TourStep[] = [
  {
    target: "body",
    title: "Welcome to Go Study! 👋",
    content: "Your personal exam planner. Let's take a 30-second tour so you know where everything is.",
  },
  {
    target: ".tour-dashboard",
    title: "Your Average",
    content: "This card tracks your current average vs your target. Tap it anytime to see a full breakdown.",
  },
  {
    target: ".tour-add-mark",
    title: "Log a Mark",
    content: "Got a new test score? Tap the + button to log it instantly. Your average updates in real time.",
  },
  {
    target: ".tour-library",
    title: "Past Papers",
    content: "Browse and download past exam papers filtered to your class and subjects.",
  },
];

const PADDING = 10;

export default function ProductTour() {
  const [run, setRun] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const seen = localStorage.getItem("scoretarget_tour_seen");
    if (seen) return;
    // Small delay to let the home screen render fully
    const t = setTimeout(() => {
      const raw = localStorage.getItem("scoretarget_state");
      let hasData = false;
      if (raw) {
        try { hasData = JSON.parse(raw)?.subjects?.length > 0; } catch {}
      }
      if (hasData) setRun(true);
    }, 1200);
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

  useEffect(() => {
    if (!run) return;
    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [run, step, updateRect]);

  const finish = () => {
    setRun(false);
    localStorage.setItem("scoretarget_tour_seen", "true");
  };

  const next = () => step < steps.length - 1 ? setStep(s => s + 1) : finish();
  const back = () => step > 0 && setStep(s => s - 1);

  if (!run) return null;

  const current = steps[step];
  const isCenter = current.target === "body" || !rect;

  // Tooltip placement — always outside the spotlight
  const tooltipStyle: React.CSSProperties = (() => {
    if (isCenter) return {
      position: "fixed", top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
    };
    const spaceBelow = window.innerHeight - rect!.bottom;
    const spaceAbove = rect!.top;
    const useBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;
    return {
      position: "fixed" as const,
      top: useBelow ? rect!.bottom + PADDING + 8 : undefined,
      bottom: !useBelow ? window.innerHeight - rect!.top + PADDING + 8 : undefined,
      left: Math.max(16, Math.min(rect!.left, window.innerWidth - 316)),
    };
  })();

  return (
    <AnimatePresence>
      {run && (
        <>
          {/* Dimmed overlay — click to skip */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998]"
            onClick={finish}
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
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#tour-mask)" />
            </svg>
          </motion.div>

          {/* Spotlight ring — pointer-events none so element is still tappable */}
          {rect && (
            <motion.div
              key={`ring-${step}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                position: "fixed",
                left: rect.left - PADDING, top: rect.top - PADDING,
                width: rect.width + PADDING * 2, height: rect.height + PADDING * 2,
                borderRadius: 14,
                border: "2.5px solid hsl(var(--secondary))",
                boxShadow: "0 0 0 4px hsl(var(--secondary) / 0.2)",
                zIndex: 9999,
                pointerEvents: "none",
              }}
            />
          )}

          {/* Tooltip */}
          <motion.div
            ref={tooltipRef}
            key={`tip-${step}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={e => e.stopPropagation()}
            style={{ ...tooltipStyle, zIndex: 10000, maxWidth: 300, width: "calc(100vw - 32px)" }}
          >
            <div className="bg-card border-2 border-foreground rounded-2xl p-5 card-shadow">
              <p className="font-black text-foreground text-sm mb-1">{current.title}</p>
              <p className="text-sm text-muted-foreground font-semibold leading-relaxed">{current.content}</p>

              <div className="flex items-center justify-between mt-4">
                <button onClick={finish} className="text-xs font-bold text-muted-foreground px-2 py-1">
                  Skip tour
                </button>

                {/* Step dots */}
                <div className="flex gap-1 items-center">
                  {steps.map((_, i) => (
                    <div key={i} className="rounded-full transition-all duration-200"
                      style={{
                        width: i === step ? 18 : 6, height: 6,
                        background: i === step ? "hsl(var(--secondary))" : "hsl(var(--muted-foreground) / 0.3)",
                      }}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  {step > 0 && (
                    <button onClick={back} className="text-xs font-bold text-muted-foreground px-2 py-1">
                      Back
                    </button>
                  )}
                  <button
                    onClick={next}
                    className="flex items-center gap-1 bg-secondary border-2 border-foreground rounded-xl px-3 py-1.5 text-xs font-black text-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all"
                  >
                    {step === steps.length - 1 ? "Done" : "Next"}
                    {step < steps.length - 1 && <ChevronRight className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
