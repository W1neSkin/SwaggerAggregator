/**
 * Color constants for the mobile app.
 * Matches the web frontend's color scheme.
 */

export const colors = {
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  background: "#f9fafb",
  white: "#ffffff",
  black: "#0a0a0a",
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },
  red: { 50: "#fef2f2", 500: "#ef4444", 700: "#b91c1c" },
  green: { 50: "#f0fdf4", 100: "#dcfce7", 500: "#22c55e", 700: "#15803d", 800: "#166534" },
  blue: { 50: "#eff6ff", 100: "#dbeafe", 500: "#3b82f6", 800: "#1e40af" },
  yellow: { 100: "#fef9c3", 800: "#854d0e" },
  purple: { 100: "#f3e8ff", 800: "#6b21a8" },
  amber: { 600: "#d97706" },
};

/** HTTP method colors for endpoint badges */
export const methodColors: Record<string, { bg: string; text: string }> = {
  GET: { bg: colors.green[100], text: colors.green[800] },
  POST: { bg: colors.blue[100], text: colors.blue[800] },
  PUT: { bg: colors.yellow[100], text: colors.yellow[800] },
  DELETE: { bg: colors.red[50], text: colors.red[700] },
  PATCH: { bg: colors.purple[100], text: colors.purple[800] },
};
