import { useRef } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface HeroCardProps {
  cardRef?: React.RefObject<HTMLDivElement>;
  value: number | null;
  max: number;
  target: number | null;
  label: string;
  suffix: string;
  barWidth: number;
  decimals?: number;
  degreeClass?: string;
  coverageLabel?: string;
  hideBar?: boolean;
  onClick: () => void;
}

export default function HeroCard({
  cardRef,
  value,
  max,
  target,
  label,
  suffix,
  barWidth,
  decimals = 1,
  degreeClass,
  coverageLabel,
  hideBar = false,
  onClick,
}: HeroCardProps) {
  const { t } = useLanguage();
  const hasValue = value !== null;

  const degreeClassColor = degreeClass === "First Class" ? "bg-success/15 text-success border-success/30"
    : degreeClass === "Second Class Upper" ? "bg-primary/15 text-primary border-primary/30"
    : degreeClass === "Second Class Lower" ? "bg-warning/15 text-warning border-warning/30"
    : degreeClass === "Third Class" ? "bg-orange-500/15 text-orange-500 border-orange-500/30"
    : degreeClass === "Pass" ? "bg-muted text-muted-foreground border-border"
    : degreeClass === "Fail" ? "bg-danger/15 text-danger border-danger/30"
    : "";

  return (
    <div className="w-full" onClick={hasValue ? onClick : undefined} style={hasValue ? { cursor: "pointer" } : undefined}>
      <motion.div
        ref={cardRef}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={`tour-dashboard rounded-2xl p-5 bg-card border-2 transition-shadow ${
          hasValue ? "card-shadow active:translate-y-0.5 active:shadow-none border-foreground" : "border-border"
        }`}
      >
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">
          {label}
        </p>

        <div className="flex items-end justify-between gap-2">
          <div className="flex items-end gap-1">
            {hasValue ? (
              <>
                <span className="text-5xl font-black text-foreground">
                  {value!.toFixed(decimals)}
                </span>
                <span className="text-xl font-bold text-muted-foreground mb-1">
                  {suffix}
                </span>
              </>
            ) : (
              <span className="text-5xl font-black text-muted-foreground/40">—</span>
            )}
          </div>

          {target !== null && target > 0 && (
            <span className="text-[10px] font-bold text-muted-foreground mb-1.5">
              {t("target")}: {target.toFixed(decimals)}
              {max === 20 ? `–${max}` : ""}
            </span>
          )}
        </div>

        {hasValue && degreeClass && degreeClassColor && (
          <div className="mt-2">
            <span className={`inline-block text-xs font-black px-2.5 py-0.5 rounded-full border ${degreeClassColor}`}>
              {degreeClass}
            </span>
          </div>
        )}

        {!hideBar && (
          <>
            <div className="mt-3 h-2.5 rounded-full bg-muted border border-foreground/20 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-secondary transition-all"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(barWidth, 100)}%` }}
                transition={{ delay: 0.2, type: "spring", stiffness: 60 }}
              />
            </div>
            {coverageLabel && (
              <p className="text-[10px] font-bold text-muted-foreground mt-1.5">{coverageLabel}</p>
            )}
          </>
        )}

        {!hasValue && (
          <p className="text-sm font-semibold text-muted-foreground mt-2">
            {t("noMarksYet")}
          </p>
        )}
      </motion.div>
    </div>
  );
}
