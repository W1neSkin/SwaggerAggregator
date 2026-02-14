/**
 * Color constants for the mobile app.
 * Light and dark palettes. Use `getColors(isDark)` to get the current palette.
 */

/** Shared method badge colors (same for both themes) */
export const methodColors: Record<string, { bg: string; text: string }> = {
  GET: { bg: "#dcfce7", text: "#166534" },
  POST: { bg: "#dbeafe", text: "#1e40af" },
  PUT: { bg: "#fef9c3", text: "#854d0e" },
  DELETE: { bg: "#fef2f2", text: "#b91c1c" },
  PATCH: { bg: "#f3e8ff", text: "#6b21a8" },
};

/** Light theme colors */
export const lightColors = {
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  background: "#f9fafb",
  card: "#ffffff",
  text: "#0f172a",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  border: "#e5e7eb",
  inputBg: "#ffffff",
  inputBorder: "#d1d5db",
  chipBg: "#ffffff",
  chipBorder: "#e5e7eb",
  toggleBg: "#f3f4f6",
  toggleActive: "#ffffff",
  separator: "#f3f4f6",
  error: "#ef4444",
  success: "#22c55e",
  successText: "#15803d",
  warning: "#d97706",
  /* Keep some specific shades accessible for special use */
  blue50: "#eff6ff",
  blue100: "#dbeafe",
  blue800: "#1e40af",
  red50: "#fef2f2",
  red500: "#ef4444",
  red700: "#b91c1c",
  green50: "#f0fdf4",
  green700: "#15803d",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  white: "#ffffff",
  black: "#0a0a0a",
};

/** Dark theme colors */
export const darkColors: typeof lightColors = {
  primary: "#3b82f6",
  primaryDark: "#2563eb",
  background: "#0f172a",
  card: "#1e293b",
  text: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  border: "#334155",
  inputBg: "#1e293b",
  inputBorder: "#475569",
  chipBg: "#1e293b",
  chipBorder: "#475569",
  toggleBg: "#334155",
  toggleActive: "#475569",
  separator: "#334155",
  error: "#ef4444",
  success: "#22c55e",
  successText: "#4ade80",
  warning: "#f59e0b",
  blue50: "#172554",
  blue100: "#1e3a5f",
  blue800: "#93c5fd",
  red50: "#450a0a",
  red500: "#ef4444",
  red700: "#fca5a5",
  green50: "#052e16",
  green700: "#4ade80",
  gray50: "#1e293b",
  gray100: "#334155",
  gray200: "#475569",
  gray400: "#64748b",
  gray500: "#94a3b8",
  white: "#1e293b",
  black: "#f1f5f9",
};

/** Get color palette for current theme */
export function getColors(isDark: boolean) {
  return isDark ? darkColors : lightColors;
}

/** Keep backward-compatible default export for existing code during migration */
export const colors = lightColors;
