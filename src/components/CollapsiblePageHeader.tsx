import { ReactNode, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

interface CollapsiblePageHeaderProps {
  /** Shown next to the arrows; truncates on narrow screens. */
  title: string;
  onBack: () => void;
  backLabel: string;
  expandLabel: string;
  collapseLabel: string;
  /** The details revealed by the chevron. Omit to hide the toggle. */
  children?: ReactNode;
  defaultExpanded?: boolean;
}

/**
 * Fixed page header whose details panel retracts to a single title row.
 *
 * The bar is `position: fixed`, so the component also renders a spacer of the
 * same height to keep the page content below it. The height is measured with a
 * ResizeObserver because the panel animates between two heights.
 */
export function CollapsiblePageHeader({
  title,
  onBack,
  backLabel,
  expandLabel,
  collapseLabel,
  children,
  defaultExpanded = true,
}: CollapsiblePageHeaderProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const barRef = useRef<HTMLDivElement>(null);
  const [barHeight, setBarHeight] = useState(0);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const measure = () => setBarHeight(el.getBoundingClientRect().height);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, []);

  const collapsible = Boolean(children);

  return (
    <>
      <div
        ref={barRef}
        className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-area-top overflow-hidden"
      >
        <div className="header-inner">
          <div className="flex items-center gap-2 min-w-0 pt-1 pb-2">
            <button
              type="button"
              onClick={onBack}
              aria-label={backLabel}
              className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-card border-2 border-foreground card-shadow active:scale-95 transition-transform"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>

            <h1 className="flex-1 min-w-0 font-black text-base sm:text-lg leading-tight truncate">
              {title}
            </h1>

            {collapsible && (
              <button
                type="button"
                onClick={() => setExpanded((open) => !open)}
                aria-expanded={expanded}
                aria-controls="page-header-details"
                aria-label={expanded ? collapseLabel : expandLabel}
                className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full bg-card border-2 border-foreground card-shadow active:scale-95 transition-transform"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-foreground" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-foreground" />
                )}
              </button>
            )}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {collapsible && expanded && (
            <motion.div
              key="details"
              id="page-header-details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="header-inner pb-3">
                <div className="rounded-xl bg-card border border-border p-3 min-w-0">
                  {children}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keeps the page content below the fixed bar. */}
      <div aria-hidden style={{ height: barHeight }} />
    </>
  );
}

export default CollapsiblePageHeader;
