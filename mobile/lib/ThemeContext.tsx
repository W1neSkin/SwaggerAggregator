/**
 * ThemeContext — provides dark/light/system theme for the mobile app.
 * Wraps the entire app in _layout.tsx.
 * Uses AsyncStorage to persist preference and useColorScheme for system detection.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getColors, lightColors } from "./colors";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  /** Current resolved colors (light or dark palette) */
  colors: typeof lightColors;
  /** Whether the app is currently in dark mode */
  isDark: boolean;
  /** Current theme mode setting */
  mode: ThemeMode;
  /** Set theme mode */
  setMode: (mode: ThemeMode) => void;
  /** Cycle through modes: light → dark → system */
  toggle: () => void;
}

const STORAGE_KEY = "swagger-agg-theme";

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
  mode: "system",
  setMode: () => {},
  toggle: () => {},
});

/** Hook to access theme context */
export function useTheme() {
  return useContext(ThemeContext);
}

/** Theme provider — wrap your app root with this */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // "light" | "dark" | null
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [loaded, setLoaded] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setModeState(saved);
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  // Resolve isDark based on mode + system preference
  const isDark =
    mode === "dark" || (mode === "system" && systemScheme === "dark");

  const colors = getColors(isDark);

  // Save preference when mode changes
  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  // Cycle: light → dark → system
  const toggle = useCallback(() => {
    setMode(
      mode === "light" ? "dark" : mode === "dark" ? "system" : "light"
    );
  }, [mode, setMode]);

  // Don't render children until we've loaded the saved theme to avoid flash
  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ colors, isDark, mode, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
