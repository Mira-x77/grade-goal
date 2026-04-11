/**
 * Sheet — responsive bottom-sheet / centered dialog
 *
 * Mobile  (<768px): slides up from bottom
 * Tablet+ (≥768px): fades + scales in as a centered dialog
 *
 * Uses the `.sheet` CSS class for positioning (see index.css).
 * The framer-motion animation variant switches based on viewport.
 */
import { motion, AnimatePresence } from "framer-motion";
import { useIsTablet } from "@/hooks/useIsTablet";

interface SheetProps {
  open: boolean;
  onBackdropClick?: () => void;
  children: React.ReactNode;
  /** Extra Tailwind classes on the sheet panel (e.g. z-index overrides) */
  className?: string;
  zIndex?: number;
}

export function Sheet({ open, onBackdropClick, children, className = "", zIndex = 61 }: SheetProps) {
  const isTablet = useIsTablet();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/55"
            style={{ zIndex: zIndex - 1 }}
            onClick={onBackdropClick}
          />

          {/* Panel
              Mobile  : slide up from bottom  (y: 100% → 0)
              Tablet+ : scale + fade in place  (scale: 0.94 → 1)
                        x/y offset baked in so framer owns the full
                        transform — no conflict with CSS positioning.
          */}
          <motion.div
            key="panel"
            initial={isTablet
              ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 }
              : { y: "100%" }
            }
            animate={isTablet
              ? { x: "-50%", y: "-50%", scale: 1, opacity: 1 }
              : { y: 0 }
            }
            exit={isTablet
              ? { x: "-50%", y: "-50%", scale: 0.94, opacity: 0 }
              : { y: "100%" }
            }
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className={`sheet ${className}`}
            style={{ zIndex }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
