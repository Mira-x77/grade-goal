import { useEffect, useState } from "react";

/**
 * Returns true when the viewport is >= 768px (tablet / desktop).
 * Used by modals to switch from slide-up animation to scale/fade.
 */
export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsTablet(e.matches);
    mq.addEventListener("change", handler);
    setIsTablet(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isTablet;
}
