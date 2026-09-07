import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type AppTheme = "light" | "dark" | "system" | "midnight" | "ink";

export type AccentColor = "yellow" | "blue" | "green" | "pink" | "orange" | "purple";

const THEME_KEY = "gostudy_theme";
const ACCENT_KEY = "gostudy_accent";

// HSL values for --secondary and --accent CSS vars
// Hues are chosen to avoid clashing with semantic signal colors:
//   warning = ~48° (yellow), success = ~120° (green), danger = ~0°/360° (red)
// Safe zones: ~180–240° (cyan/blue), ~255–300° (purple/violet), ~300–340° (magenta)
// "Yellow" kept but shifted warmer/deeper so it reads as amber, not warning-yellow
const ACCENT_MAP: Record<AccentColor, { hsl: string; label: string; hex: string }> = {
  yellow:  { hsl: "35 90% 52%",  label: "Amber",   hex: "#E8920D" }, // warm amber, not warning-yellow
  blue:    { hsl: "212 75% 50%", label: "Blue",     hex: "#1E7BC4" }, // clear sky blue
  green:   { hsl: "172 55% 38%", label: "Teal",     hex: "#2A9980" }, // teal, not success-green
  pink:    { hsl: "310 60% 55%", label: "Magenta",  hex: "#C040A8" }, // magenta, away from danger-red
  orange:  { hsl: "195 70% 46%", label: "Cyan",     hex: "#22A0C0" }, // cyan replaces orange (too close to danger)
  purple:  { hsl: "262 52% 56%", label: "Purple",   hex: "#7050C4" }, // violet, unchanged territory
};

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  accent: AccentColor;
  setAccent: (a: AccentColor) => void;
  accentMap: typeof ACCENT_MAP;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system", setTheme: () => {},
  accent: "orange", setAccent: () => {},
  accentMap: ACCENT_MAP,
});

export const useAppTheme = () => useContext(ThemeContext);

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  root.classList.remove("dark", "theme-midnight", "theme-ink");

  if (theme === "midnight") {
    root.classList.add("dark", "theme-midnight");
  } else if (theme === "ink") {
    root.classList.add("dark", "theme-ink");
  } else if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "system") {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      root.classList.add("dark");
    }
  }
}

function applyAccent(accent: AccentColor) {
  const root = document.documentElement;
  const { hsl } = ACCENT_MAP[accent];
  const isDarkMode = root.classList.contains("dark");
  const isDark = ["blue", "green", "pink", "orange", "purple"].includes(accent);

  // Always override secondary/accent/ring
  root.style.setProperty("--secondary", hsl);
  root.style.setProperty("--accent", hsl);
  root.style.setProperty("--ring", hsl);
  root.style.setProperty("--secondary-foreground", isDark ? "0 0% 100%" : "0 0% 10%");
  root.style.setProperty("--accent-foreground", isDark ? "0 0% 100%" : "0 0% 10%");

  // In dark mode, primary is also the accent color — override it too
  if (isDarkMode) {
    root.style.setProperty("--primary", hsl);
    root.style.setProperty("--primary-foreground", isDark ? "0 0% 10%" : "0 0% 10%");
  } else {
    // Light mode: primary stays black
    root.style.removeProperty("--primary");
    root.style.removeProperty("--primary-foreground");
  }
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() =>
    (localStorage.getItem(THEME_KEY) as AppTheme) ?? "system"
  );
  const [accent, setAccentState] = useState<AccentColor>(() => {
    // Prefer AppState.settings.accentColor (synced from cloud) over local key
    try {
      const raw = localStorage.getItem("scoretarget_state");
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed?.settings?.accentColor) {
        return parsed.settings.accentColor as AccentColor;
      }
    } catch {}
    return (localStorage.getItem(ACCENT_KEY) as AccentColor) ?? "orange";
  });

  useEffect(() => {
    applyTheme(theme);
    // Re-apply accent after theme class changes, since dark mode affects primary
    applyAccent(accent);
  }, [theme]);

  useEffect(() => { applyAccent(accent); }, [accent]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { applyTheme("system"); applyAccent(accent); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, accent]);

  const setTheme = (t: AppTheme) => { localStorage.setItem(THEME_KEY, t); setThemeState(t); };
  const setAccent = (a: AccentColor) => {
    localStorage.setItem(ACCENT_KEY, a);
    setAccentState(a);
    // Also persist into AppState so it syncs to cloud
    try {
      const raw = localStorage.getItem("scoretarget_state");
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.settings = { ...parsed.settings, accentColor: a };
        localStorage.setItem("scoretarget_state", JSON.stringify(parsed));
      }
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accent, setAccent, accentMap: ACCENT_MAP }}>
      {children}
    </ThemeContext.Provider>
  );
}
