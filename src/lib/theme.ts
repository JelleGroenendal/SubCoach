const THEME_KEY = "subcoach-theme";

export type Theme = "light" | "dark";

/**
 * Get the stored theme from localStorage
 */
export function getStoredTheme(): Theme {
  if (typeof localStorage === "undefined") return "dark";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return "dark"; // default
}

/**
 * Store the theme in localStorage
 */
export function setStoredTheme(theme: Theme): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(THEME_KEY, theme);
}

/**
 * Apply the theme to the document
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

/**
 * Initialize the theme on app load
 * Should be called as early as possible (before React renders)
 */
export function initializeTheme(): Theme {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
}

/**
 * Toggle between light and dark mode
 */
export function toggleTheme(): Theme {
  const current = getStoredTheme();
  const next: Theme = current === "dark" ? "light" : "dark";
  setStoredTheme(next);
  applyTheme(next);
  return next;
}
