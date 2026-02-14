/**
 * useTheme hook — manages dark/light/system theme.
 * Persists preference to localStorage.
 * Applies .dark class to <html> element.
 */

import { useState, useEffect, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "swagger-agg-theme";

/** Read saved preference or default to "system" */
function getSavedTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch { /* SSR or no localStorage */ }
  return "system";
}

/** Check if system prefers dark */
function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Apply or remove .dark class on <html> */
function applyTheme(mode: ThemeMode) {
  const isDark = mode === "dark" || (mode === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", isDark);
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(getSavedTheme);

  // Apply theme on mount and when mode changes
  useEffect(() => {
    applyTheme(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* ignore */ }
  }, [mode]);

  // Listen for system preference changes when in "system" mode
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  /** Cycle through modes: light → dark → system */
  const toggle = useCallback(() => {
    setModeState((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "system";
      return "light";
    });
  }, []);

  const setMode = useCallback((m: ThemeMode) => setModeState(m), []);

  const isDark = mode === "dark" || (mode === "system" && systemPrefersDark());

  return { mode, isDark, toggle, setMode };
}
