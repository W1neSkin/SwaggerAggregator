/**
 * Dashboard screen — services list.
 * Shows all registered services as cards. Tap to view details.
 * Pull-to-refresh support. Theme-aware.
 */

import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "@swagger-aggregator/shared";
import type { Service } from "@swagger-aggregator/shared";
import { useTheme } from "../../lib/ThemeContext";

export default function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Fetch services
  const { data: services, isLoading, refetch } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.listServices(),
  });

  // Create service
  const createMutation = useMutation({
    mutationFn: () => servicesApi.createService({ name: newName, description: newDesc }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setShowAdd(false);
      setNewName("");
      setNewDesc("");
    },
    onError: (err: any) => Alert.alert("Error", err?.response?.data?.detail || "Failed to create"),
  });

  const renderService = ({ item }: { item: Service }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}
      onPress={() => router.push(`/service/${item.id}`)}
    >
      <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
      {item.description ? (
        <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{item.description}</Text>
      ) : null}
      <View style={[styles.badge, { backgroundColor: colors.blue50 }]}>
        <Text style={[styles.badgeText, { color: colors.blue800 }]}>
          {item.environments_count} environments
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Add button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAdd(!showAdd)}
      >
        <Text style={[styles.addButtonText, { color: colors.primary }]}>+ Add Service</Text>
      </TouchableOpacity>

      {/* Add form */}
      {showAdd && (
        <View style={[styles.addForm, { backgroundColor: colors.card }]}>
          <TextInput
            style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
            placeholder="Service name"
            value={newName}
            onChangeText={setNewName}
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
            placeholder="Description (optional)"
            value={newDesc}
            onChangeText={setNewDesc}
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={() => createMutation.mutate()}
          >
            <Text style={styles.submitBtnText}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Services list */}
      <FlatList
        data={services || []}
        keyExtractor={(item) => item.id}
        renderItem={renderService}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No services yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Tap "+ Add Service" to register your first microservice
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addButton: { margin: 16, marginBottom: 0, alignItems: "flex-end" },
  addButtonText: { fontSize: 15, fontWeight: "600" },
  addForm: { margin: 16, borderRadius: 12, padding: 16, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 10 },
  submitBtn: { borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  submitBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  list: { padding: 16 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 17, fontWeight: "600" },
  cardDesc: { fontSize: 13, marginTop: 4 },
  badge: { marginTop: 10, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  badgeText: { fontSize: 12 },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyText: { fontSize: 18 },
  emptySubtext: { fontSize: 13, marginTop: 6 },
});
