/**
 * Auth group layout.
 * Simple Stack with no header (login screen has its own title).
 */

import { Stack } from "expo-router";

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
