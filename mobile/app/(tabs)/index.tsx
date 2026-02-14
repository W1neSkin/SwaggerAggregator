/**
 * Dashboard screen — services list.
 * Shows all registered services as cards. Tap to view details.
 * Pull-to-refresh support.
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
import { colors } from "../../lib/colors";

export default function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
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
      style={styles.card}
      onPress={() => router.push(`/service/${item.id}`)}
    >
      <Text style={styles.cardTitle}>{item.name}</Text>
      {item.description ? (
        <Text style={styles.cardDesc}>{item.description}</Text>
      ) : null}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {item.environments_count} environments
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Add button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAdd(!showAdd)}
      >
        <Text style={styles.addButtonText}>+ Add Service</Text>
      </TouchableOpacity>

      {/* Add form */}
      {showAdd && (
        <View style={styles.addForm}>
          <TextInput
            style={styles.input}
            placeholder="Service name"
            value={newName}
            onChangeText={setNewName}
            placeholderTextColor={colors.gray[400]}
          />
          <TextInput
            style={styles.input}
            placeholder="Description (optional)"
            value={newDesc}
            onChangeText={setNewDesc}
            placeholderTextColor={colors.gray[400]}
          />
          <TouchableOpacity
            style={styles.submitBtn}
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
            <Text style={styles.emptyText}>No services yet</Text>
            <Text style={styles.emptySubtext}>
              Tap "+ Add Service" to register your first microservice
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  addButton: { margin: 16, marginBottom: 0, alignItems: "flex-end" },
  addButtonText: { color: colors.primary, fontSize: 15, fontWeight: "600" },
  addForm: { margin: 16, backgroundColor: colors.white, borderRadius: 12, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  input: { borderWidth: 1, borderColor: colors.gray[300], borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 10, color: colors.gray[900] },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  submitBtnText: { color: colors.white, fontWeight: "600", fontSize: 15 },
  list: { padding: 16 },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 17, fontWeight: "600", color: colors.gray[900] },
  cardDesc: { fontSize: 13, color: colors.gray[500], marginTop: 4 },
  badge: { marginTop: 10, backgroundColor: colors.blue[50], borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  badgeText: { fontSize: 12, color: colors.blue[800] },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyText: { fontSize: 18, color: colors.gray[500] },
  emptySubtext: { fontSize: 13, color: colors.gray[400], marginTop: 6 },
});
