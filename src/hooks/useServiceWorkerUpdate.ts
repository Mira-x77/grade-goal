import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Detects when a new service worker is waiting and prompts the user to update.
 * Clicking the toast action skips waiting and reloads to activate the new SW.
 */
export function useServiceWorkerUpdate() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleUpdate = (reg: ServiceWorkerRegistration) => {
      const waiting = reg.waiting;
      if (!waiting) return;

      toast("Update available", {
        description: "A new version of Go Study! is ready.",
        duration: Infinity,
        action: {
          label: "Reload",
          onClick: () => {
            waiting.postMessage({ type: "SKIP_WAITING" });
            window.location.reload();
          },
        },
      });
    };

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      // Already waiting (e.g. page was open when deploy happened)
      if (reg.waiting) {
        handleUpdate(reg);
        return;
      }

      // New SW found while page is open
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            handleUpdate(reg);
          }
        });
      });
    });
  }, []);
}
