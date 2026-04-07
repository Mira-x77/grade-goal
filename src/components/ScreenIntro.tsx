import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Mascot from "@/components/Mascot";

interface ScreenIntroProps {
  screenKey: string;       // unique key per screen, e.g. "home", "simulator"
  title: string;
  description: string;
  mascotPose?: "idle" | "pointing" | "celebrating" | "thinking" | "reading";
  ctaLabel?: string;
  onCta?: () => void;
}

const STORAGE_PREFIX = "scoretarget_intro_seen_";

export default function ScreenIntro({
  screenKey,
  title,
  description,
  mascotPose = "pointing",
  ctaLabel = "Got it",
  onCta,
}: ScreenIntroProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_PREFIX + screenKey);
    if (!seen) {
      // Small delay so the page renders first
      const t = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(t);
    }
  }, [screenKey]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_PREFIX + screenKey, "true");
    setVisible(false);
    onCta?.();
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] bg-black/50"
            onClick={dismiss}
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-[9991] max-w-md mx-auto bg-background rounded-t-3xl border-t-2 border-x-2 border-foreground px-6 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))]"
          >
            {/* Handle */}
            <div className="w-10 h-1.5 rounded-full bg-foreground/20 mx-auto mb-5" />

            {/* Dismiss X */}
            <button
              onClick={dismiss}
              className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground active:scale-95 transition-transform"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Content */}
            <div className="flex items-start gap-4 mb-5">
              <div className="shrink-0">
                <Mascot pose={mascotPose} size={72} animate />
              </div>
              <div className="flex-1 pt-1">
                <h2 className="text-lg font-black text-foreground leading-tight mb-1">{title}</h2>
                <p className="text-sm font-semibold text-muted-foreground leading-relaxed">{description}</p>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={dismiss}
              className="w-full rounded-2xl bg-secondary border-2 border-foreground py-3.5 font-extrabold text-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all"
            >
              {ctaLabel}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
