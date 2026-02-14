/**
 * Service detail group layout.
 * Stack with back button support.
 */

import { Stack } from "expo-router";
import { colors } from "../../lib/colors";

export default function ServiceLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: "600", color: colors.gray[900] },
      }}
    />
  );
}
