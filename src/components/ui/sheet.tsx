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

  const mobileVariants = {
    hidden:  { y: "100%", opacity: 1 },
    visible: { y: 0,      opacity: 1 },
    exit:    { y: "100%", opacity: 1 },
  };

  const tabletVariants = {
    hidden:  { scale: 0.94, opacity: 0 },
    visible: { scale: 1,    opacity: 1 },
    exit:    { scale: 0.94, opacity: 0 },
  };

  const variants = isTablet ? tabletVariants : mobileVariants;

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

          {/* Panel */}
          <motion.div
            key="panel"
            variants={variants}
            initial="hidden"
            animate="visible"
            exit="exit"
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
