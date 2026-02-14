/**
 * Tab navigator layout.
 * Three tabs: Dashboard, JWT Generator, Settings.
 */

import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "../../lib/colors";

/** Simple text-based tab icon */
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, color: focused ? colors.primary : colors.gray[400] }}>
      {label}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.gray[900],
        headerTitleStyle: { fontWeight: "600" },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray[400],
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.gray[200] },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Services",
          tabBarIcon: ({ focused }) => <TabIcon label="📋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="jwt"
        options={{
          title: "JWT Generator",
          tabBarIcon: ({ focused }) => <TabIcon label="🔑" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => <TabIcon label="⚙️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
