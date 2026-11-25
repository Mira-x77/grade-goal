import { applyAndroid8Polyfills } from "@/lib/android8-polyfills";
import { applyPdfPolyfills } from "@/lib/pdf-polyfills";
import "@/lib/debug-tools"; // Load debug tools for console diagnostics
applyAndroid8Polyfills();
applyPdfPolyfills();

// Cursor's embedded browser often reports navigator.onLine === false even when
// localhost and APIs work. Keep local preview online so you can check the app.
if (import.meta.env.DEV) {
  try {
    Object.defineProperty(Navigator.prototype, "onLine", {
      get: () => true,
      configurable: true,
    });
    window.dispatchEvent(new Event("online"));
  } catch {
    /* ignore */
  }
}

import { Capacitor } from "@capacitor/core";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";

// Service workers break Capacitor WebView loading — web/PWA only
if ("serviceWorker" in navigator) {
  if (Capacitor.isNativePlatform()) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => void reg.unregister());
    });
  } else if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("[SW] Registered, scope:", reg.scope))
        .catch((err) => console.warn("[SW] Registration failed:", err));
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    });
  }
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML =
    '<p style="font-family:sans-serif;padding:24px;color:#c00">Root element missing</p>';
} else {
  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
