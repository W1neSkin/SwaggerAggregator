/**
 * Service detail group layout.
 * Stack with back button support. Theme-aware.
 */

import { Stack } from "expo-router";
import { useTheme } from "../../lib/ThemeContext";

export default function ServiceLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: "600", color: colors.text },
      }}
    />
  );
}
