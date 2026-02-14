/**
 * Tab navigator layout.
 * Three tabs: Dashboard, JWT Generator, Settings.
 * Uses @expo/vector-icons for proper tab icons (replaces emoji).
 */

import { Tabs } from "expo-router";
import { useTheme } from "../../lib/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "600" },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Services",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "server" : "server-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="jwt"
        options={{
          title: "JWT Generator",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "key" : "key-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
