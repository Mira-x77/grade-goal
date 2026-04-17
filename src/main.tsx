import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker for PWA offline support — production only
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[SW] Registered, scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err);
      });
  });
} else if ('serviceWorker' in navigator && import.meta.env.DEV) {
  // Unregister any lingering SW in dev so Vite HMR works correctly
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  });
}

createRoot(document.getElementById("root")!).render(<App />);
