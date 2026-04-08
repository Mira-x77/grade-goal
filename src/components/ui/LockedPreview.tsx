import { Crown, Lock } from "lucide-react";
import { motion } from "framer-motion";

interface LockedPreviewProps {
  title: string;
  subtitle?: string;
  onUnlockClick: () => void;
  unlockText?: string;
  className?: string;
}

export function LockedPreview({
  title,
  subtitle,
  onUnlockClick,
  unlockText,
  className = "",
}: LockedPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl bg-card border-2 border-foreground overflow-hidden card-shadow ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-premium" />
          <h3 className="font-black text-foreground text-sm">{title}</h3>
        </div>
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Blurred content placeholder */}
      <div className="relative px-4 py-4 space-y-2 select-none">
        {[85, 70, 90, 60].map((w, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl bg-muted/60 px-3 py-2.5"
            style={{ filter: i === 0 ? "none" : "blur(4px)", opacity: i === 0 ? 1 : 0.5 }}
          >
            <span className="text-xs font-black text-primary shrink-0">{i + 1}.</span>
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 rounded-full bg-foreground/20" style={{ width: `${w}%` }} />
              {i === 0 && <div className="h-2 rounded-full bg-foreground/10" style={{ width: "55%" }} />}
            </div>
          </div>
        ))}

        {/* Gradient + CTA overlay */}
        <div className="absolute inset-0 top-12 flex flex-col items-center justify-end bg-gradient-to-t from-card via-card/80 to-transparent pb-4 px-4">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onUnlockClick}
            className="w-full rounded-2xl bg-secondary border-2 border-foreground py-3 font-black text-foreground text-sm card-shadow active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <Crown className="h-4 w-4" />
            {unlockText ?? "Unlock Now"}
          </motion.button>
          {subtitle && (
            <p className="text-[10px] font-semibold text-muted-foreground mt-2 text-center">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
