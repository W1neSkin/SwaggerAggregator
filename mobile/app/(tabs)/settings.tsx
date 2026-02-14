/**
 * Settings screen — simplified.
 * Theme toggle, app info, and logout.
 * Secret management moved to service detail screen.
 */

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@swagger-aggregator/shared";
import { useTheme, type ThemeMode } from "../../lib/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, mode, setMode, isDark } = useTheme();

  // Logout
  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.clear();
      router.replace("/(auth)/login");
    },
  });

  /** Theme options */
  const themeOptions: { value: ThemeMode; label: string; icon: string }[] = [
    { value: "light", label: "Light", icon: "sunny-outline" },
    { value: "dark", label: "Dark", icon: "moon-outline" },
    { value: "system", label: "System", icon: "phone-portrait-outline" },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Theme section */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardLabel, { color: colors.text }]}>Theme</Text>
        <View style={[styles.themeRow, { backgroundColor: colors.toggleBg }]}>
          {themeOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.themeBtn,
                mode === opt.value && [styles.themeBtnActive, { backgroundColor: colors.toggleActive }],
              ]}
              onPress={() => setMode(opt.value)}
            >
              <Ionicons
                name={opt.icon as any}
                size={18}
                color={mode === opt.value ? colors.primary : colors.textMuted}
              />
              <Text style={[
                styles.themeBtnText,
                { color: colors.textMuted },
                mode === opt.value && { color: colors.text, fontWeight: "600" },
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Info section */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>About</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>App</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>Swagger Aggregator</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.separator }]} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Version</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>0.1.0</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.separator }]} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Secrets</Text>
          <Text style={[styles.infoValue, { color: colors.textMuted }]}>Manage per service → environment</Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: colors.error }]}
        onPress={() =>
          Alert.alert("Logout", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Logout", style: "destructive", onPress: () => logoutMutation.mutate() },
          ])
        }
      >
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={[styles.logoutText, { color: colors.error }]}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 8 },
  card: { borderRadius: 12, padding: 16, marginBottom: 16 },
  cardLabel: { fontSize: 15, fontWeight: "600", marginBottom: 12 },
  themeRow: { flexDirection: "row", borderRadius: 10, padding: 4, gap: 4 },
  themeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 8 },
  themeBtnActive: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  themeBtnText: { fontSize: 13 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: "500" },
  divider: { height: 1, marginVertical: 8 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 14, marginTop: 8 },
  logoutText: { fontSize: 16, fontWeight: "600" },
});
