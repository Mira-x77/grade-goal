import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type AppTheme = "light" | "dark" | "system" | "midnight" | "ink";

export type AccentColor = "yellow" | "blue" | "green" | "pink" | "orange" | "purple";

const THEME_KEY = "gostudy_theme";
const ACCENT_KEY = "gostudy_accent";

// HSL values for --secondary and --accent CSS vars
const ACCENT_MAP: Record<AccentColor, { hsl: string; label: string; hex: string }> = {
  yellow:  { hsl: "48 95% 60%",  label: "Yellow",  hex: "#F5C842" },
  blue:    { hsl: "217 91% 60%", label: "Blue",     hex: "#3B82F6" },
  green:   { hsl: "142 71% 45%", label: "Green",    hex: "#22C55E" },
  pink:    { hsl: "330 81% 60%", label: "Pink",     hex: "#EC4899" },
  orange:  { hsl: "25 95% 55%",  label: "Orange",   hex: "#F97316" },
  purple:  { hsl: "262 83% 65%", label: "Purple",   hex: "#A855F7" },
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
  accent: "yellow", setAccent: () => {},
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
  const [accent, setAccentState] = useState<AccentColor>(() =>
    (localStorage.getItem(ACCENT_KEY) as AccentColor) ?? "yellow"
  );

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
  const setAccent = (a: AccentColor) => { localStorage.setItem(ACCENT_KEY, a); setAccentState(a); };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accent, setAccent, accentMap: ACCENT_MAP }}>
      {children}
    </ThemeContext.Provider>
  );
}
